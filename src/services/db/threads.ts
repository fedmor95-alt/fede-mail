import { getDb } from "./connection";

export interface DbThread {
  id: string;
  account_id: string;
  subject: string | null;
  snippet: string | null;
  last_message_at: number | null;
  message_count: number;
  is_read: number;
  is_starred: number;
  is_important: number;
  has_attachments: number;
  is_snoozed: number;
  snooze_until: number | null;
  is_pinned: number;
  is_muted: number;
  from_name: string | null;
  from_address: string | null;
  pec_status?: string | null;
}

/**
 * Thread list query. The page (ORDER BY + LIMIT) is picked from `threads`
 * first and the sender of the latest message is looked up only for those
 * rows; joining messages before paging made SQLite walk every thread of every
 * account on each list reload (~50x slower with a few thousand threads).
 */
function threadPageSql(filter: string): string {
  return `SELECT t.*, m.from_name, m.from_address FROM (
      SELECT t.* FROM threads t
      WHERE ($1 IS NULL OR t.account_id = $1) AND ${filter}
      ORDER BY t.is_pinned DESC, t.last_message_at DESC, t.id DESC
      LIMIT $3 OFFSET $4) t
    LEFT JOIN messages m ON m.rowid = (
      SELECT m2.rowid FROM messages m2
      WHERE m2.account_id = t.account_id AND m2.thread_id = t.id
      ORDER BY m2.date DESC LIMIT 1)
    ORDER BY t.is_pinned DESC, t.last_message_at DESC, t.id DESC`;
}

const HAS_LABEL = `EXISTS (SELECT 1 FROM thread_labels tl
  WHERE tl.account_id = t.account_id AND tl.thread_id = t.id AND tl.label_id = $2)`;

/**
 * Snooze is local: the server still has the thread in the inbox and every
 * sync writes the INBOX label back (and drops SNOOZED). The is_snoozed flag
 * is what decides, so a snoozed thread stays out of the inbox until it wakes.
 */
const NOT_SNOOZED = "IFNULL(t.is_snoozed, 0) = 0";

function labelFilter(labelId: string): string {
  if (labelId === "SNOOZED") return "t.is_snoozed = 1 AND $2 = 'SNOOZED'";
  if (labelId === "INBOX") return `${HAS_LABEL} AND ${NOT_SNOOZED}`;
  return HAS_LABEL;
}

/** accountId = null lists threads from every account (unified view). */
export async function getThreadsForAccount(
  accountId: string | null,
  labelId?: string,
  limit = 50,
  offset = 0,
): Promise<DbThread[]> {
  const db = await getDb();
  if (labelId) {
    return db.select<DbThread[]>(threadPageSql(labelFilter(labelId)), [accountId, labelId, limit, offset]);
  }
  return db.select<DbThread[]>(threadPageSql("$2 IS NULL"), [accountId, null, limit, offset]);
}

export async function getThreadsForCategory(
  accountId: string | null,
  category: string,
  limit = 50,
  offset = 0,
): Promise<DbThread[]> {
  const db = await getDb();
  const inInbox = `EXISTS (SELECT 1 FROM thread_labels tl
    WHERE tl.account_id = t.account_id AND tl.thread_id = t.id AND tl.label_id = 'INBOX')`;
  // Primary includes threads with no category yet
  const inCategory = category === "Primary"
    ? `NOT EXISTS (SELECT 1 FROM thread_categories tc
        WHERE tc.account_id = t.account_id AND tc.thread_id = t.id AND tc.category IS NOT NULL AND tc.category <> 'Primary')`
    : `EXISTS (SELECT 1 FROM thread_categories tc
        WHERE tc.account_id = t.account_id AND tc.thread_id = t.id AND tc.category = $2)`;
  return db.select<DbThread[]>(
    threadPageSql(`${inInbox} AND ${NOT_SNOOZED} AND ${inCategory}`),
    [accountId, category, limit, offset],
  );
}

export async function upsertThread(thread: {
  id: string;
  accountId: string;
  subject: string | null;
  snippet: string | null;
  lastMessageAt: number | null;
  messageCount: number;
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  hasAttachments: boolean;
}): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO threads (id, account_id, subject, snippet, last_message_at, message_count, is_read, is_starred, is_important, has_attachments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT(account_id, id) DO UPDATE SET
       subject = $3, snippet = $4, last_message_at = $5, message_count = $6,
       is_read = $7, is_starred = $8, is_important = $9, has_attachments = $10`,
    [
      thread.id,
      thread.accountId,
      thread.subject,
      thread.snippet,
      thread.lastMessageAt,
      thread.messageCount,
      thread.isRead ? 1 : 0,
      thread.isStarred ? 1 : 0,
      thread.isImportant ? 1 : 0,
      thread.hasAttachments ? 1 : 0,
    ],
  );
}

export async function setThreadLabels(
  accountId: string,
  threadId: string,
  labelIds: string[],
): Promise<void> {
  const db = await getDb();
  // Remove existing labels
  await db.execute(
    "DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2",
    [accountId, threadId],
  );
  // Insert new labels
  for (const labelId of labelIds) {
    await db.execute(
      "INSERT OR IGNORE INTO thread_labels (account_id, thread_id, label_id) VALUES ($1, $2, $3)",
      [accountId, threadId, labelId],
    );
  }
}

export async function getThreadLabelIds(
  accountId: string,
  threadId: string,
): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<{ label_id: string }[]>(
    "SELECT label_id FROM thread_labels WHERE account_id = $1 AND thread_id = $2",
    [accountId, threadId],
  );
  return rows.map((r) => r.label_id);
}

export async function getThreadById(
  accountId: string,
  threadId: string,
): Promise<DbThread | undefined> {
  const db = await getDb();
  const rows = await db.select<DbThread[]>(
    `SELECT t.*, m.from_name, m.from_address FROM threads t
     LEFT JOIN messages m ON m.account_id = t.account_id AND m.thread_id = t.id
       AND m.date = (SELECT MAX(m2.date) FROM messages m2 WHERE m2.account_id = t.account_id AND m2.thread_id = t.id)
     WHERE t.account_id = $1 AND t.id = $2
     LIMIT 1`,
    [accountId, threadId],
  );
  return rows[0];
}

export async function getThreadCountForAccount(accountId: string): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) as count FROM threads WHERE account_id = $1",
    [accountId],
  );
  return rows[0]?.count ?? 0;
}

export async function getUnreadInboxCount(): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ count: number }[]>(
    `SELECT COUNT(*) as count FROM threads t
     INNER JOIN thread_labels tl ON tl.account_id = t.account_id AND tl.thread_id = t.id
     WHERE tl.label_id = 'INBOX' AND t.is_read = 0 AND ${NOT_SNOOZED}`,
  );
  return rows[0]?.count ?? 0;
}

export async function deleteThread(
  accountId: string,
  threadId: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM threads WHERE account_id = $1 AND id = $2",
    [accountId, threadId],
  );
}

export async function deleteAllThreadsForAccount(
  accountId: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "DELETE FROM threads WHERE account_id = $1",
    [accountId],
  );
}

export async function pinThread(
  accountId: string,
  threadId: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE threads SET is_pinned = 1 WHERE account_id = $1 AND id = $2",
    [accountId, threadId],
  );
}

export async function unpinThread(
  accountId: string,
  threadId: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE threads SET is_pinned = 0 WHERE account_id = $1 AND id = $2",
    [accountId, threadId],
  );
}

export async function muteThread(
  accountId: string,
  threadId: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE threads SET is_muted = 1 WHERE account_id = $1 AND id = $2",
    [accountId, threadId],
  );
}

export async function unmuteThread(
  accountId: string,
  threadId: string,
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE threads SET is_muted = 0 WHERE account_id = $1 AND id = $2",
    [accountId, threadId],
  );
}

export async function getMutedThreadIds(
  accountId: string,
): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select<{ id: string }[]>(
    "SELECT id FROM threads WHERE account_id = $1 AND is_muted = 1",
    [accountId],
  );
  return new Set(rows.map((r) => r.id));
}

/** Load specific threads (any account) with latest-sender info, newest first. */
export async function getThreadsByKeys(
  keys: { accountId: string; threadId: string }[],
): Promise<DbThread[]> {
  if (keys.length === 0) return [];
  const db = await getDb();
  const params: string[] = [];
  const conds = keys.map((k) => {
    params.push(k.accountId, k.threadId);
    return `(t.account_id = $${params.length - 1} AND t.id = $${params.length})`;
  });
  return db.select<DbThread[]>(
    `SELECT t.*, m.from_name, m.from_address FROM threads t
     LEFT JOIN messages m ON m.account_id = t.account_id AND m.thread_id = t.id
       AND m.date = (SELECT MAX(m2.date) FROM messages m2 WHERE m2.account_id = t.account_id AND m2.thread_id = t.id)
     WHERE ${conds.join(" OR ")}
     GROUP BY t.account_id, t.id
     ORDER BY t.last_message_at DESC`,
    params,
  );
}
