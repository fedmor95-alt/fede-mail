import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getAccount } from "../db/accounts";
import { buildImapConfig } from "../imap/imapConfigBuilder";
import type { ImapConfig } from "../imap/tauriCommands";
import { getGmailClient } from "../gmail/tokenManager";
import { setAccountOnPush, syncAccount } from "../gmail/syncManager";

/**
 * Push notifications for new mail.
 *
 * Every account gets an IMAP IDLE watcher on INBOX (Rust side, see
 * src-tauri/src/imap/idle.rs). Gmail API accounts use IDLE on imap.gmail.com
 * with their OAuth token purely as a doorbell; the actual data still comes
 * from the Gmail History API delta sync.
 *
 * An account is either on push or on the interval set in Settings, never both:
 * while its watcher is connected the background sync skips its mail, and when
 * IDLE is not available (server without IDLE, token without the
 * https://mail.google.com/ scope) or is reconnecting the interval takes over.
 */

interface IdleEvent {
  accountId: string;
  folder: string;
  kind: "connected" | "changed" | "reconnecting" | "auth_error" | "unsupported" | "stopped";
  message: string | null;
}

export type PushState = "push" | "polling" | "connecting";

const CHANGE_DEBOUNCE_MS = 1_500;
/** Gmail rings for every flag change too, including our own: don't sync on each one. */
const MIN_SYNC_GAP_MS = 15_000;
const MAX_AUTH_RETRIES = 2;
/** While polling, try to get back to push this often (e.g. after re-authorizing). */
const PUSH_RETRY_MS = 10 * 60_000;

let unlisten: UnlistenFn | null = null;
let pushRetryTimer: ReturnType<typeof setInterval> | null = null;
const fallbackAccounts = new Set<string>();
const authRetries = new Map<string, number>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const lastPushSyncAt = new Map<string, number>();
const states = new Map<string, PushState>();
let activeAccountIds: string[] = [];
/**
 * start/stop are serialised through this chain, and every async step checks
 * `generation` so a watcher from a superseded start can't resurrect itself
 * after a stop (e.g. account removed while its IDLE was still connecting).
 */
let chain: Promise<void> = Promise.resolve();
let generation = 0;

function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(() => undefined, () => undefined);
  return run;
}

function setState(accountId: string, state: PushState): void {
  states.set(accountId, state);
  setAccountOnPush(accountId, state === "push");
  window.dispatchEvent(new CustomEvent("velo-push-state", { detail: { accountId, state } }));
}

export function getPushState(accountId: string): PushState | undefined {
  return states.get(accountId);
}

async function buildIdleConfig(accountId: string, forceRefresh = false): Promise<ImapConfig | null> {
  const account = await getAccount(accountId);
  if (!account || account.provider === "caldav") return null;

  if (account.provider === "gmail_api") {
    const client = await getGmailClient(accountId);
    const token = await client.getAccessToken(forceRefresh);
    return {
      host: "imap.gmail.com",
      port: 993,
      security: "tls",
      username: account.email,
      password: token,
      auth_method: "oauth2",
      accept_invalid_certs: false,
    };
  }

  if (account.auth_method === "oauth2") {
    const { ensureFreshToken } = await import("../oauth/oauthTokenManager");
    return buildImapConfig(account, await ensureFreshToken(account));
  }
  return buildImapConfig(account);
}

async function startWatcher(accountId: string, forceRefresh = false): Promise<void> {
  const gen = generation;
  try {
    const config = await buildIdleConfig(accountId, forceRefresh);
    if (!config) return;
    if (gen !== generation || !activeAccountIds.includes(accountId)) return;
    setState(accountId, "connecting");
    await invoke("imap_idle_start", { accountId, config, folder: "INBOX" });
  } catch (err) {
    if (gen !== generation || !activeAccountIds.includes(accountId)) return;
    console.warn(`[push] Cannot start IDLE for ${accountId}:`, err);
    enableFallback(accountId);
  }
}

function enableFallback(accountId: string): void {
  fallbackAccounts.add(accountId);
  setState(accountId, "polling");
  if (!pushRetryTimer) {
    pushRetryTimer = setInterval(() => {
      for (const id of fallbackAccounts) {
        authRetries.delete(id);
        startWatcher(id, true).catch(() => {});
      }
    }, PUSH_RETRY_MS);
  }
}

function scheduleSync(accountId: string): void {
  const existing = debounceTimers.get(accountId);
  if (existing) clearTimeout(existing);
  const sinceLast = Date.now() - (lastPushSyncAt.get(accountId) ?? 0);
  debounceTimers.set(
    accountId,
    setTimeout(() => {
      debounceTimers.delete(accountId);
      lastPushSyncAt.set(accountId, Date.now());
      syncAccount(accountId).catch((err) => console.warn(`[push] sync failed for ${accountId}:`, err));
    }, Math.max(CHANGE_DEBOUNCE_MS, MIN_SYNC_GAP_MS - sinceLast)),
  );
}

async function handleEvent(ev: IdleEvent): Promise<void> {
  const { accountId, kind } = ev;
  if (!activeAccountIds.includes(accountId)) return;

  switch (kind) {
    case "connected":
      authRetries.delete(accountId);
      fallbackAccounts.delete(accountId);
      setState(accountId, "push");
      break;
    case "changed":
      scheduleSync(accountId);
      break;
    case "reconnecting":
      setState(accountId, "connecting");
      break;
    case "auth_error": {
      // Expired OAuth token → refresh and retry; persistent failure (e.g. a
      // Gmail token granted before the IMAP scope was added) → polling.
      const tries = (authRetries.get(accountId) ?? 0) + 1;
      authRetries.set(accountId, tries);
      if (tries <= MAX_AUTH_RETRIES) {
        await startWatcher(accountId, true);
      } else {
        console.warn(`[push] IDLE auth keeps failing for ${accountId}, using the sync interval`);
        enableFallback(accountId);
      }
      break;
    }
    case "unsupported":
      enableFallback(accountId);
      break;
    case "stopped":
      break;
  }
}

/** Start push for the given accounts, replacing any previous watchers. */
export function startPush(accountIds: string[]): Promise<void> {
  return serialized(async () => {
    await stopPushNow();
    const gen = ++generation;
    activeAccountIds = [...accountIds];
    const un = await listen<IdleEvent>("imap-idle", (e) => {
      if (gen !== generation) return;
      handleEvent(e.payload).catch((err) => console.warn("[push] event error:", err));
    });
    if (gen !== generation) {
      un();
      return;
    }
    unlisten = un;
    window.addEventListener("online", restartPush);
    // Watchers connect in parallel; a slow account must not delay the others.
    await Promise.all(accountIds.map((id) => startWatcher(id)));
  });
}

/** Reconnect one account's watcher, e.g. after it was re-authorized. */
export function restartWatcher(accountId: string): void {
  if (!activeAccountIds.includes(accountId)) return;
  authRetries.delete(accountId);
  startWatcher(accountId).catch(() => {});
}

/** Reconnect all watchers (network came back). */
function restartPush(): void {
  authRetries.clear();
  for (const id of activeAccountIds) {
    startWatcher(id).catch(() => {});
  }
}

export function stopPush(): Promise<void> {
  return serialized(stopPushNow);
}

async function stopPushNow(): Promise<void> {
  generation++;
  window.removeEventListener("online", restartPush);
  unlisten?.();
  unlisten = null;
  if (pushRetryTimer) clearInterval(pushRetryTimer);
  pushRetryTimer = null;
  for (const t of debounceTimers.values()) clearTimeout(t);
  debounceTimers.clear();
  fallbackAccounts.clear();
  authRetries.clear();
  for (const id of states.keys()) setAccountOnPush(id, false);
  states.clear();
  lastPushSyncAt.clear();
  activeAccountIds = [];
  await invoke("imap_idle_stop_all").catch(() => {});
}
