import { searchMessages } from "../db/search";
import { getThreadsByKeys, getThreadLabelIds, type DbThread } from "../db/threads";
import { getDb } from "../db/connection";
import { getGmailClient } from "../gmail/tokenManager";
import { storeGmailThread } from "../gmail/sync";
import type { Account } from "@/stores/accountStore";
import type { Thread } from "@/stores/threadStore";

/**
 * Search across accounts in two passes:
 * 1. local FTS over synced headers/snippets (instant);
 * 2. server-side search for Gmail accounts (same query syntax as Gmail),
 *    whose hits are stored locally (headers only) and merged in.
 * IMAP accounts (PEC) are fully synced, so the local pass covers them.
 */

const LOCAL_LIMIT = 300;
const SERVER_LIMIT = 50;

type Key = { accountId: string; threadId: string };

async function toThreads(rows: DbThread[]): Promise<Thread[]> {
  return Promise.all(
    rows.map(async (t) => ({
      id: t.id,
      accountId: t.account_id,
      subject: t.subject,
      snippet: t.snippet,
      lastMessageAt: t.last_message_at ?? 0,
      messageCount: t.message_count,
      isRead: t.is_read === 1,
      isStarred: t.is_starred === 1,
      isPinned: t.is_pinned === 1,
      isMuted: t.is_muted === 1,
      hasAttachments: t.has_attachments === 1,
      labelIds: await getThreadLabelIds(t.account_id, t.id),
      fromName: t.from_name,
      fromAddress: t.from_address,
      pecStatus: t.pec_status ?? null,
    })),
  );
}

async function threadExists(key: Key): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select<{ n: number }[]>(
    "SELECT COUNT(*) AS n FROM threads WHERE account_id = $1 AND id = $2",
    [key.accountId, key.threadId],
  );
  return (rows[0]?.n ?? 0) > 0;
}

async function serverSearchGmail(accountId: string, query: string): Promise<Key[]> {
  const client = await getGmailClient(accountId);
  const res = await client.listThreads({ q: query, maxResults: SERVER_LIMIT });
  const keys = (res.threads ?? []).map((t) => ({ accountId, threadId: t.id }));
  // Bring in threads we don't have yet (older than the sync window), 5 at a time
  const missing: Key[] = [];
  for (const k of keys) if (!(await threadExists(k))) missing.push(k);
  for (let i = 0; i < missing.length; i += 5) {
    await Promise.all(
      missing.slice(i, i + 5).map((k) =>
        storeGmailThread(client, accountId, k.threadId).catch((err) =>
          console.warn(`[search] cannot store thread ${k.threadId}:`, err),
        ),
      ),
    );
  }
  return keys;
}

/**
 * Run a search; `onUpdate` is called with the local results first, then again
 * with server hits merged in. Returns a cancel function.
 */
export function runUnifiedSearch(
  query: string,
  accounts: Account[],
  onUpdate: (threads: Thread[], pending: boolean) => void,
): () => void {
  let cancelled = false;
  const keys = new Map<string, Key>();
  const add = (k: Key) => keys.set(`${k.accountId}:${k.threadId}`, k);

  const publish = async (pending: boolean) => {
    const rows = await getThreadsByKeys([...keys.values()]);
    if (!cancelled) onUpdate(await toThreads(rows), pending);
  };

  (async () => {
    const accountIds = new Set(accounts.map((a) => a.id));
    try {
      const hits = await searchMessages(query, accounts.length === 1 ? accounts[0]!.id : undefined, LOCAL_LIMIT);
      for (const h of hits) if (accountIds.has(h.account_id)) add({ accountId: h.account_id, threadId: h.thread_id });
    } catch (err) {
      console.warn("[search] local search failed:", err);
    }
    if (cancelled) return;
    const gmail = accounts.filter((a) => a.provider === "gmail_api");
    await publish(gmail.length > 0);

    const server = await Promise.allSettled(gmail.map((a) => serverSearchGmail(a.id, query)));
    if (cancelled) return;
    for (const r of server) {
      if (r.status === "fulfilled") r.value.forEach(add);
      else console.warn("[search] server search failed:", r.reason);
    }
    await publish(false);
  })().catch((err) => console.warn("[search] failed:", err));

  return () => {
    cancelled = true;
  };
}
