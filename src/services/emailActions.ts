import { useUIStore } from "@/stores/uiStore";
import { useThreadStore, clearPendingRemovals } from "@/stores/threadStore";
import { useAccountStore } from "@/stores/accountStore";
import { getEmailProvider } from "@/services/email/providerFactory";
import { enqueuePendingOperation } from "@/services/db/pendingOperations";
import { classifyError } from "@/utils/networkErrors";
import { getDb } from "@/services/db/connection";
import { navigateToThread, getSelectedThreadId } from "@/router/navigate";

// ---------------------------------------------------------------------------
// Action types
// ---------------------------------------------------------------------------

export type EmailAction =
  | { type: "archive"; threadId: string; messageIds: string[] }
  | { type: "trash"; threadId: string; messageIds: string[] }
  | { type: "permanentDelete"; threadId: string; messageIds: string[] }
  | {
      type: "markRead";
      threadId: string;
      messageIds: string[];
      read: boolean;
    }
  | {
      type: "star";
      threadId: string;
      messageIds: string[];
      starred: boolean;
    }
  | {
      type: "spam";
      threadId: string;
      messageIds: string[];
      isSpam: boolean;
    }
  | {
      type: "moveToFolder";
      threadId: string;
      messageIds: string[];
      folderPath: string;
    }
  | { type: "addLabel"; threadId: string; labelId: string }
  | { type: "removeLabel"; threadId: string; labelId: string }
  | {
      type: "sendMessage";
      rawBase64Url: string;
      threadId?: string;
    }
  | {
      type: "createDraft";
      rawBase64Url: string;
      threadId?: string;
    }
  | {
      type: "updateDraft";
      draftId: string;
      rawBase64Url: string;
      threadId?: string;
    }
  | { type: "deleteDraft"; draftId: string };

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export interface ActionResult {
  success: boolean;
  queued?: boolean;
  error?: string;
  data?: unknown;
}

// ---------------------------------------------------------------------------
// Optimistic UI helpers
// ---------------------------------------------------------------------------

function getNextThreadId(currentId: string): string | null {
  // Only auto-advance if the removed thread is the one being viewed
  const selectedId = getSelectedThreadId();
  if (selectedId !== currentId) return null;
  // Walk the list the user actually sees (search results when searching).
  const { threads: allThreads, searchResults } = useThreadStore.getState();
  const readFilter = useUIStore.getState().readFilter;
  const threads = (searchResults ?? allThreads).filter((t) =>
    readFilter === "unread" ? !t.isRead : readFilter === "read" ? t.isRead : true,
  );
  const idx = threads.findIndex((t) => t.id === currentId);
  if (idx === -1) return null;
  // Prefer next thread, fall back to previous
  const next = threads[idx + 1];
  if (next) return next.id;
  const prev = threads[idx - 1];
  if (prev) return prev.id;
  return null;
}

function applyOptimisticUpdate(action: EmailAction): void {
  const store = useThreadStore.getState();
  switch (action.type) {
    case "archive":
    case "trash":
    case "permanentDelete":
    case "spam":
    case "moveToFolder": {
      const nextId = getNextThreadId(action.threadId);
      store.removeThread(action.threadId);
      if (nextId) {
        navigateToThread(nextId);
      }
      break;
    }
    case "markRead":
      store.updateThread(action.threadId, { isRead: action.read });
      break;
    case "star":
      store.updateThread(action.threadId, { isStarred: action.starred });
      break;
    case "addLabel":
    case "removeLabel":
    case "sendMessage":
    case "createDraft":
    case "updateDraft":
    case "deleteDraft":
      // No universal optimistic update for these
      break;
  }
}

function revertOptimisticUpdate(action: EmailAction): void {
  const store = useThreadStore.getState();
  switch (action.type) {
    case "markRead":
      store.updateThread(action.threadId, { isRead: !action.read });
      break;
    case "star":
      store.updateThread(action.threadId, { isStarred: !action.starred });
      break;
    // For removes (archive/trash/spam/move), we can't easily restore the thread
    // to the list from here. The next sync will fix it.
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Local DB updates (so offline reads reflect changes)
// ---------------------------------------------------------------------------

async function applyLocalDbUpdate(
  accountId: string,
  action: EmailAction,
): Promise<void> {
  const db = await getDb();
  switch (action.type) {
    case "markRead":
      await db.execute(
        "UPDATE threads SET is_read = $1 WHERE account_id = $2 AND id = $3",
        [action.read ? 1 : 0, accountId, action.threadId],
      );
      break;
    case "star":
      await db.execute(
        "UPDATE threads SET is_starred = $1 WHERE account_id = $2 AND id = $3",
        [action.starred ? 1 : 0, accountId, action.threadId],
      );
      if (action.starred) {
        await db.execute(
          "INSERT OR IGNORE INTO thread_labels (account_id, thread_id, label_id) VALUES ($1, $2, 'STARRED')",
          [accountId, action.threadId],
        );
      } else {
        await db.execute(
          "DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2 AND label_id = 'STARRED'",
          [accountId, action.threadId],
        );
      }
      break;
    case "archive":
      await db.execute(
        "DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2 AND label_id = 'INBOX'",
        [accountId, action.threadId],
      );
      await clearSnooze(db, accountId, action.threadId);
      break;
    case "trash":
      await db.execute(
        "DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2 AND label_id = 'INBOX'",
        [accountId, action.threadId],
      );
      await db.execute(
        "INSERT OR IGNORE INTO thread_labels (account_id, thread_id, label_id) VALUES ($1, $2, 'TRASH')",
        [accountId, action.threadId],
      );
      await clearSnooze(db, accountId, action.threadId);
      break;
    case "permanentDelete":
      await db.execute(
        "DELETE FROM threads WHERE account_id = $1 AND id = $2",
        [accountId, action.threadId],
      );
      break;
    case "spam":
      if (action.isSpam) {
        await db.execute(
          "DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2 AND label_id = 'INBOX'",
          [accountId, action.threadId],
        );
        await db.execute(
          "INSERT OR IGNORE INTO thread_labels (account_id, thread_id, label_id) VALUES ($1, $2, 'SPAM')",
          [accountId, action.threadId],
        );
      } else {
        await db.execute(
          "DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2 AND label_id = 'SPAM'",
          [accountId, action.threadId],
        );
        await db.execute(
          "INSERT OR IGNORE INTO thread_labels (account_id, thread_id, label_id) VALUES ($1, $2, 'INBOX')",
          [accountId, action.threadId],
        );
      }
      break;
    case "addLabel":
      await db.execute(
        "INSERT OR IGNORE INTO thread_labels (account_id, thread_id, label_id) VALUES ($1, $2, $3)",
        [accountId, action.threadId, action.labelId],
      );
      break;
    case "removeLabel":
      await db.execute(
        "DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2 AND label_id = $3",
        [accountId, action.threadId, action.labelId],
      );
      break;
    default:
      break;
  }
}

/** An archived or deleted thread must not come back when its snooze ends. */
async function clearSnooze(db: Awaited<ReturnType<typeof getDb>>, accountId: string, threadId: string): Promise<void> {
  await db.execute(
    "UPDATE threads SET is_snoozed = 0, snooze_until = NULL WHERE account_id = $1 AND id = $2",
    [accountId, threadId],
  );
  await db.execute(
    "DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2 AND label_id = 'SNOOZED'",
    [accountId, threadId],
  );
}

// ---------------------------------------------------------------------------
// Core execution
// ---------------------------------------------------------------------------

function getResourceId(action: EmailAction): string {
  if ("threadId" in action && action.threadId) return action.threadId;
  if ("draftId" in action) return action.draftId;
  return crypto.randomUUID();
}

function actionToParams(action: EmailAction): Record<string, unknown> {
  // Strip the type field — it's stored separately as operation_type
  const { type: _, ...rest } = action;
  return rest;
}

async function executeViaProvider(
  accountId: string,
  action: EmailAction,
): Promise<unknown> {
  const provider = await getEmailProvider(accountId);
  switch (action.type) {
    case "archive":
      return provider.archive(action.threadId, action.messageIds);
    case "trash":
      return provider.trash(action.threadId, action.messageIds);
    case "permanentDelete":
      return provider.permanentDelete(action.threadId, action.messageIds);
    case "markRead":
      return provider.markRead(
        action.threadId,
        action.messageIds,
        action.read,
      );
    case "star":
      return provider.star(
        action.threadId,
        action.messageIds,
        action.starred,
      );
    case "spam":
      return provider.spam(
        action.threadId,
        action.messageIds,
        action.isSpam,
      );
    case "moveToFolder":
      return provider.moveToFolder(
        action.threadId,
        action.messageIds,
        action.folderPath,
      );
    case "addLabel":
      return provider.addLabel(action.threadId, action.labelId);
    case "removeLabel":
      return provider.removeLabel(action.threadId, action.labelId);
    case "sendMessage":
      return provider.sendMessage(action.rawBase64Url, action.threadId);
    case "createDraft":
      return provider.createDraft(action.rawBase64Url, action.threadId);
    case "updateDraft":
      return provider.updateDraft(
        action.draftId,
        action.rawBase64Url,
        action.threadId,
      );
    case "deleteDraft":
      return provider.deleteDraft(action.draftId);
  }
}

export async function executeEmailAction(
  callerAccountId: string,
  initialAction: EmailAction,
  options: ActionOptions = {},
): Promise<ActionResult> {
  let action = initialAction;
  // Unified view: a multi-selection can span accounts, so thread actions run
  // against the account that owns the thread, not the caller's active one.
  const threadId = "threadId" in action ? action.threadId : undefined;
  const accountId =
    (threadId && useThreadStore.getState().threadMap?.get(threadId)?.accountId) || callerAccountId;

  // IMAP needs the message ids (folder + UID) to act on the server; callers
  // such as keyboard shortcuts only pass the thread id.
  if ("messageIds" in action && action.messageIds.length === 0 && threadId) {
    const db = await getDb();
    const rows = await db.select<{ id: string }[]>(
      "SELECT id FROM messages WHERE account_id = $1 AND thread_id = $2",
      [accountId, threadId],
    );
    action = { ...action, messageIds: rows.map((r) => r.id) };
  }

  // 1. Optimistic UI update
  applyOptimisticUpdate(action);

  // Delete/archive wait a few seconds before touching the DB and server, so
  // Ctrl+Z (or the toast's "Annulla") can still take them back.
  if (action.type === "trash" || action.type === "archive") {
    const deferred = action;
    scheduleUndoable(accountId, deferred, () =>
      commitEmailAction(accountId, deferred).catch((err) => {
        console.error("Deferred action failed:", err);
        return { success: false, error: String(err) };
      }),
    );
    return { success: true };
  }
  if (options.undoable !== false) recordInverse(accountId, action);
  return commitEmailAction(accountId, action);
}

// ---------------------------------------------------------------------------
// Undo (Ctrl+Z)
// ---------------------------------------------------------------------------
//
// Every user action becomes one entry on undoStack, and Ctrl+Z takes back
// the newest entry only. Calls that arrive together (a multi-selection, or a
// quick step over several threads) share an entry; separate key presses
// never do, so archiving three emails one after the other needs three
// Ctrl+Z, newest first.
//
// Delete/archive wait UNDO_WINDOW_MS before reaching the DB and server, so
// undoing them inside that window just drops them. Once committed, Gmail
// threads go back through labels; IMAP moves change the messages' UIDs and
// cannot be reverted, so such an entry stops Ctrl+Z instead of letting it
// silently revert something older. Star, read, spam and labels are undone
// with their opposite action.

const UNDO_WINDOW_MS = 6000;
/** Calls closer than this belong to the same user action. */
const UNDO_GROUP_GAP_MS = 400;
const MAX_UNDO_STEPS = 20;
type DeferredRun = () => Promise<ActionResult>;
type UndoStep = () => Promise<void>;

interface UndoEntry {
  kind: string;
  items: { accountId: string; threadId: string }[];
  /** Delete/archive runs still waiting for the undo window to close. */
  runs: DeferredRun[];
  timer: ReturnType<typeof setTimeout> | null;
  steps: UndoStep[];
  /** false once any part of the entry cannot be taken back. */
  undoable: boolean;
  lastAt: number;
}

let undoStack: UndoEntry[] = [];

export interface ActionOptions {
  /** false for automatic actions (filters, mark-as-read on open): Ctrl+Z skips them. */
  undoable?: boolean;
}

function isGmailAccount(accountId: string): boolean {
  const account = useAccountStore.getState().accounts.find((a) => a.id === accountId);
  return (account?.provider ?? "gmail_api") === "gmail_api";
}

function newEntry(kind: string): UndoEntry {
  const entry: UndoEntry = { kind, items: [], runs: [], timer: null, steps: [], undoable: true, lastAt: Date.now() };
  undoStack.push(entry);
  if (undoStack.length > MAX_UNDO_STEPS) {
    const dropped = undoStack.shift()!;
    void commitEntry(dropped);
  }
  return entry;
}

/** The newest entry if this call is part of the same user action, else a new one. */
function entryFor(kind: string, deferred: boolean): UndoEntry {
  const top = undoStack[undoStack.length - 1];
  const now = Date.now();
  if (top && top.kind === kind && now - top.lastAt < UNDO_GROUP_GAP_MS && (top.timer !== null) === deferred) {
    top.lastAt = now;
    return top;
  }
  return newEntry(kind);
}

/** Opposite of a committed delete/archive: back to the inbox (Gmail only). */
function restoreStep(kind: string, items: { accountId: string; threadId: string }[]): UndoStep | null {
  if (items.length === 0 || !items.every((i) => isGmailAccount(i.accountId))) return null;
  return async () => {
    clearPendingRemovals(items.map((i) => i.threadId));
    await Promise.all(items.map(async ({ accountId, threadId }) => {
      await executeEmailAction(accountId, { type: "addLabel", threadId, labelId: "INBOX" }, { undoable: false });
      if (kind === "trash") {
        await executeEmailAction(accountId, { type: "removeLabel", threadId, labelId: "TRASH" }, { undoable: false });
      }
    }));
  };
}

function commitEntry(entry: UndoEntry): Promise<ActionResult[]> {
  if (entry.timer === null) return Promise.resolve([]);
  clearTimeout(entry.timer);
  entry.timer = null;
  const runs = entry.runs;
  entry.runs = [];
  const step = restoreStep(entry.kind, entry.items);
  if (step) entry.steps.push(step);
  else entry.undoable = false;
  // The toast tracks the newest action only
  if (undoStack[undoStack.length - 1] === entry) window.dispatchEvent(new Event("velo-undo-done"));
  return Promise.all(runs.map((run) => run()));
}

/**
 * The action that takes back `action`: undefined when it isn't a user-visible
 * change (sending, drafts), null when it cannot be reverted.
 */
function inverseOf(accountId: string, action: EmailAction): EmailAction | null | undefined {
  switch (action.type) {
    case "star":
      return { ...action, starred: !action.starred };
    case "markRead":
      return { ...action, read: !action.read };
    case "spam":
      return isGmailAccount(accountId) ? { ...action, isSpam: !action.isSpam } : null;
    case "addLabel":
      return isGmailAccount(accountId) ? { ...action, type: "removeLabel" } : null;
    case "removeLabel":
      return isGmailAccount(accountId) ? { ...action, type: "addLabel" } : null;
    case "moveToFolder":
    case "permanentDelete":
      return null;
    default:
      return undefined;
  }
}

function recordInverse(accountId: string, action: EmailAction): void {
  const inverse = inverseOf(accountId, action);
  if (inverse === undefined) return;
  const entry = entryFor(action.type, false);
  if ("threadId" in action && action.threadId) entry.items.push({ accountId, threadId: action.threadId });
  if (inverse === null) entry.undoable = false;
  else entry.steps.push(() => executeEmailAction(accountId, inverse, { undoable: false }).then(() => {}));
}

/** Remember how to take back an action that is already done (e.g. snooze). */
export function recordUndo(step: UndoStep): void {
  newEntry("custom").steps.push(step);
}

function scheduleUndoable(
  accountId: string,
  action: EmailAction & { type: "trash" | "archive" },
  run: DeferredRun,
): void {
  const entry = entryFor(action.type, true);
  if (entry.timer !== null) clearTimeout(entry.timer);
  entry.timer = setTimeout(() => void commitEntry(entry), UNDO_WINDOW_MS);
  entry.runs.push(run);
  entry.items.push({ accountId, threadId: action.threadId });
  window.dispatchEvent(
    new CustomEvent("velo-undo-available", { detail: { kind: action.type, count: entry.runs.length } }),
  );
}

/** Take back the latest action. Returns false if there is nothing to undo. */
export function undoLastAction(): boolean {
  const entry = undoStack[undoStack.length - 1];
  if (!entry) return false;
  if (entry.timer !== null) {
    clearTimeout(entry.timer);
    entry.timer = null;
    undoStack.pop();
    clearPendingRemovals(entry.items.map((i) => i.threadId));
    window.dispatchEvent(new Event("velo-undo-done"));
    // Nothing reached the DB yet, so reloading the list brings the threads back.
    window.dispatchEvent(new Event("velo-sync-done"));
    return true;
  }
  // Never skip an action that can't be undone to revert an older one
  if (!entry.undoable) return false;
  undoStack.pop();
  Promise.all(entry.steps.map((step) => step()))
    .catch((err) => console.error("Undo failed:", err))
    .finally(() => window.dispatchEvent(new Event("velo-sync-done")));
  return true;
}

/** Reset the undo state for testing. */
export function _resetUndoForTesting(): void {
  for (const entry of undoStack) if (entry.timer !== null) clearTimeout(entry.timer);
  undoStack = [];
}

/** Commit any pending delete/archive right away (e.g. before the window closes). */
export async function flushPendingUndo(): Promise<ActionResult[]> {
  const results = await Promise.all(undoStack.map(commitEntry));
  return results.flat();
}

async function commitEmailAction(accountId: string, action: EmailAction): Promise<ActionResult> {
  // 2. Local DB update
  try {
    await applyLocalDbUpdate(accountId, action);
  } catch (err) {
    console.warn("Local DB update failed:", err);
  }

  // 3. If offline, queue
  if (!useUIStore.getState().isOnline) {
    await enqueuePendingOperation(
      accountId,
      action.type,
      getResourceId(action),
      actionToParams(action),
    );
    return { success: true, queued: true };
  }

  // 4. Try online execution
  try {
    const data = await executeViaProvider(accountId, action);
    if (action.type === "markRead") console.info(`[markRead] ${action.threadId} saved on server (read=${action.read})`);
    return { success: true, data };
  } catch (err) {
    const classified = classifyError(err);

    if (classified.isRetryable) {
      // Queue for retry
      await enqueuePendingOperation(
        accountId,
        action.type,
        getResourceId(action),
        actionToParams(action),
      );
      return { success: true, queued: true };
    }

    // Permanent error — revert optimistic update
    revertOptimisticUpdate(action);
    console.error(`Email action ${action.type} failed permanently:`, err);
    return { success: false, error: classified.message };
  }
}

// ---------------------------------------------------------------------------
// Execute a queued operation (used by queue processor)
// ---------------------------------------------------------------------------

export async function executeQueuedAction(
  accountId: string,
  operationType: string,
  params: Record<string, unknown>,
): Promise<void> {
  const action = { type: operationType, ...params } as EmailAction;
  await executeViaProvider(accountId, action);
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

export function archiveThread(
  accountId: string,
  threadId: string,
  messageIds: string[],
): Promise<ActionResult> {
  return executeEmailAction(accountId, {
    type: "archive",
    threadId,
    messageIds,
  });
}

export function trashThread(
  accountId: string,
  threadId: string,
  messageIds: string[],
): Promise<ActionResult> {
  return executeEmailAction(accountId, {
    type: "trash",
    threadId,
    messageIds,
  });
}

export function permanentDeleteThread(
  accountId: string,
  threadId: string,
  messageIds: string[],
): Promise<ActionResult> {
  return executeEmailAction(accountId, {
    type: "permanentDelete",
    threadId,
    messageIds,
  });
}

export function markThreadRead(
  accountId: string,
  threadId: string,
  messageIds: string[],
  read: boolean,
  options?: ActionOptions,
): Promise<ActionResult> {
  return executeEmailAction(accountId, {
    type: "markRead",
    threadId,
    messageIds,
    read,
  }, options);
}

export function starThread(
  accountId: string,
  threadId: string,
  messageIds: string[],
  starred: boolean,
  options?: ActionOptions,
): Promise<ActionResult> {
  return executeEmailAction(accountId, {
    type: "star",
    threadId,
    messageIds,
    starred,
  }, options);
}

export function spamThread(
  accountId: string,
  threadId: string,
  messageIds: string[],
  isSpam: boolean,
  options?: ActionOptions,
): Promise<ActionResult> {
  return executeEmailAction(accountId, {
    type: "spam",
    threadId,
    messageIds,
    isSpam,
  }, options);
}

export function moveThread(
  accountId: string,
  threadId: string,
  messageIds: string[],
  folderPath: string,
): Promise<ActionResult> {
  return executeEmailAction(accountId, {
    type: "moveToFolder",
    threadId,
    messageIds,
    folderPath,
  });
}

export function addThreadLabel(
  accountId: string,
  threadId: string,
  labelId: string,
  options?: ActionOptions,
): Promise<ActionResult> {
  return executeEmailAction(accountId, {
    type: "addLabel",
    threadId,
    labelId,
  }, options);
}

export function removeThreadLabel(
  accountId: string,
  threadId: string,
  labelId: string,
  options?: ActionOptions,
): Promise<ActionResult> {
  return executeEmailAction(accountId, {
    type: "removeLabel",
    threadId,
    labelId,
  }, options);
}

export async function sendEmail(
  accountId: string,
  rawBase64Url: string,
  threadId?: string,
): Promise<ActionResult> {
  const result = await executeEmailAction(accountId, {
    type: "sendMessage",
    rawBase64Url,
    threadId,
  });

  // Notify the UI to refresh (so sent message appears in Sent folder)
  if (result.success) {
    window.dispatchEvent(new Event("velo-sync-done"));
  }

  return result;
}

export function createDraft(
  accountId: string,
  rawBase64Url: string,
  threadId?: string,
): Promise<ActionResult> {
  return executeEmailAction(accountId, {
    type: "createDraft",
    rawBase64Url,
    threadId,
  });
}

export function updateDraft(
  accountId: string,
  draftId: string,
  rawBase64Url: string,
  threadId?: string,
): Promise<ActionResult> {
  return executeEmailAction(accountId, {
    type: "updateDraft",
    draftId,
    rawBase64Url,
    threadId,
  });
}

export function deleteDraft(
  accountId: string,
  draftId: string,
): Promise<ActionResult> {
  return executeEmailAction(accountId, { type: "deleteDraft", draftId });
}
