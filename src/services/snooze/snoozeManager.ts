import { getDb } from "../db/connection";
import { withTransaction } from "../db/connection";
import { getCurrentUnixTimestamp } from "@/utils/timestamp";
import { createBackgroundChecker } from "../backgroundCheckers";
import { useThreadStore, clearPendingRemovals } from "@/stores/threadStore";
import { recordUndo } from "../emailActions";

// Snooze is local: the server keeps the thread in the inbox. The is_snoozed
// flag hides it from the inbox lists (services/db/threads.ts), since every
// sync writes the INBOX label back and drops SNOOZED.

type Db = Awaited<ReturnType<typeof getDb>>;

/** Clear the snooze and put the thread back in the inbox. */
async function wake(db: Db, accountId: string, threadId: string): Promise<void> {
  await db.execute(
    "UPDATE threads SET is_snoozed = 0, snooze_until = NULL WHERE account_id = $1 AND id = $2",
    [accountId, threadId],
  );
  await db.execute(
    "DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2 AND label_id = 'SNOOZED'",
    [accountId, threadId],
  );
  await db.execute(
    "INSERT OR IGNORE INTO thread_labels (account_id, thread_id, label_id) VALUES ($1, $2, 'INBOX')",
    [accountId, threadId],
  );
}

/**
 * Check for snoozed threads that should be un-snoozed (time has passed).
 * Moves them back to INBOX.
 */
async function checkSnoozedThreads(): Promise<void> {
  const db = await getDb();
  const now = getCurrentUnixTimestamp();

  const snoozed = await db.select<
    { id: string; account_id: string }[]
  >(
    "SELECT id, account_id FROM threads WHERE is_snoozed = 1 AND snooze_until <= $1",
    [now],
  );

  if (snoozed.length > 0) {
    await withTransaction(async (txDb) => {
      for (const thread of snoozed) {
        await wake(txDb, thread.account_id, thread.id);
      }
    });

    // Notify the UI to refresh
    window.dispatchEvent(new Event("velo-sync-done"));
  }
}

/**
 * Snooze a thread: remove from INBOX, set snooze time. Ctrl+Z takes it back.
 *
 * The unified inbox mixes accounts, so the thread's own account wins over the
 * caller's (usually the active one): with the wrong account the UPDATE hit no
 * row and the thread came straight back.
 */
export async function snoozeThread(
  accountId: string,
  threadId: string,
  snoozeUntil: number,
): Promise<void> {
  const owner = useThreadStore.getState().threadMap?.get(threadId)?.accountId ?? accountId;
  await withTransaction(async (db) => {
    await db.execute(
      "UPDATE threads SET is_snoozed = 1, snooze_until = $1 WHERE account_id = $2 AND id = $3",
      [snoozeUntil, owner, threadId],
    );

    // Remove INBOX label, add SNOOZED
    await db.execute(
      "DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2 AND label_id = 'INBOX'",
      [owner, threadId],
    );
    await db.execute(
      "INSERT OR IGNORE INTO thread_labels (account_id, thread_id, label_id) VALUES ($1, $2, 'SNOOZED')",
      [owner, threadId],
    );
  });
  recordUndo(() => unsnoozeThread(owner, threadId));
}

/** Wake a snoozed thread now (undo, or "back to the inbox" from Snoozed). */
export async function unsnoozeThread(accountId: string, threadId: string): Promise<void> {
  await withTransaction((db) => wake(db, accountId, threadId));
  clearPendingRemovals([threadId]);
  window.dispatchEvent(new Event("velo-sync-done"));
}

const snoozeChecker = createBackgroundChecker("Snooze", checkSnoozedThreads);
export const startSnoozeChecker = snoozeChecker.start;
export const stopSnoozeChecker = snoozeChecker.stop;
