import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getAccount } from "../db/accounts";
import { buildImapConfig } from "../imap/imapConfigBuilder";
import type { ImapConfig } from "../imap/tauriCommands";
import { getGmailClient } from "../gmail/tokenManager";
import { syncAccount } from "../gmail/syncManager";

/**
 * Push notifications for new mail.
 *
 * Every account gets an IMAP IDLE watcher on INBOX (Rust side, see
 * src-tauri/src/imap/idle.rs). Gmail API accounts use IDLE on imap.gmail.com
 * with their OAuth token purely as a doorbell; the actual data still comes
 * from the Gmail History API delta sync. When IDLE is not available (server
 * without IDLE, token without the https://mail.google.com/ scope) the account
 * falls back to fast polling. The regular 60s background sync keeps running
 * as a safety net either way.
 */

interface IdleEvent {
  accountId: string;
  folder: string;
  kind: "connected" | "changed" | "reconnecting" | "auth_error" | "unsupported" | "stopped";
  message: string | null;
}

export type PushState = "push" | "polling" | "connecting";

const FALLBACK_POLL_MS = 20_000;
const CHANGE_DEBOUNCE_MS = 1_500;
const MAX_AUTH_RETRIES = 2;
/** While polling, try to get back to push this often (e.g. after re-authorizing). */
const PUSH_RETRY_MS = 10 * 60_000;

let unlisten: UnlistenFn | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let pushRetryTimer: ReturnType<typeof setInterval> | null = null;
const fallbackAccounts = new Set<string>();
const authRetries = new Map<string, number>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
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
  if (!pollTimer) {
    pollTimer = setInterval(() => {
      for (const id of fallbackAccounts) {
        syncAccount(id).catch(() => {});
      }
    }, FALLBACK_POLL_MS);
  }
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
  debounceTimers.set(
    accountId,
    setTimeout(() => {
      debounceTimers.delete(accountId);
      syncAccount(accountId).catch((err) => console.warn(`[push] sync failed for ${accountId}:`, err));
    }, CHANGE_DEBOUNCE_MS),
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
        console.warn(`[push] IDLE auth keeps failing for ${accountId}, polling every ${FALLBACK_POLL_MS / 1000}s`);
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
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
  if (pushRetryTimer) clearInterval(pushRetryTimer);
  pushRetryTimer = null;
  for (const t of debounceTimers.values()) clearTimeout(t);
  debounceTimers.clear();
  fallbackAccounts.clear();
  authRetries.clear();
  states.clear();
  activeAccountIds = [];
  await invoke("imap_idle_stop_all").catch(() => {});
}
