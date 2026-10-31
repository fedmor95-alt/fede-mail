import { GmailClient } from "./client";
import { parseGmailMessage, type ParsedMessage } from "./messageParser";
import { upsertLabel } from "../db/labels";
import { upsertThread, setThreadLabels } from "../db/threads";
import { upsertMessage } from "../db/messages";
import { upsertAttachment } from "../db/attachments";
import { updateAccountSyncState } from "../db/accounts";
import { getDb } from "../db/connection";
import { shouldNotifyForMessage, queueNewEmailNotification } from "../notifications/notificationManager";
import { applyFiltersToMessages } from "../filters/filterEngine";
import { getSetting } from "../db/settings";
import { getMutedThreadIds } from "../db/threads";
import { getThreadCategory } from "../db/threadCategories";
import { getVipSenders } from "../db/notificationVips";
import { getPendingOpsForResource } from "../db/pendingOperations";

async function loadAutoArchiveCategories(): Promise<Set<string>> {
  const raw = await getSetting("auto_archive_categories");
  if (!raw) return new Set();
  return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

export interface SyncProgress {
  phase: "labels" | "threads" | "messages" | "done";
  current: number;
  total: number;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

/**
 * Store a fetched thread's data (messages, labels, attachments) into the local DB.
 * Optionally pass autoArchiveCategories and client to enable auto-archiving.
 */
async function processAndStoreThread(
  thread: { id: string },
  accountId: string,
  parsedMessages: ParsedMessage[],
  client?: GmailClient,
  autoArchiveCategories?: Set<string>,
): Promise<void> {
  const lastMessage = parsedMessages[parsedMessages.length - 1]!;
  const firstMessage = parsedMessages[0]!;

  const allLabelIds = new Set<string>();
  for (const msg of parsedMessages) {
    for (const lid of msg.labelIds) {
      allLabelIds.add(lid);
    }
  }

  const isRead = parsedMessages.every((m) => m.isRead);
  if (!isRead) {
    // Diagnostic only: spot syncs that flip a locally read thread back.
    try {
      const rows = await (await getDb()).select<{ is_read: number }[]>(
        "SELECT is_read FROM threads WHERE account_id = $1 AND id = $2",
        [accountId, thread.id],
      );
      if (rows?.[0]?.is_read === 1) {
        console.info(`[syncManager] ${thread.id} is unread on Gmail but was read locally; using Gmail's state`);
      }
    } catch {
      // ignore
    }
  }
  const isStarred = parsedMessages.some((m) => m.isStarred);
  const isImportant = allLabelIds.has("IMPORTANT");
  const hasAttachments = parsedMessages.some((m) => m.hasAttachments);

  await upsertThread({
    id: thread.id,
    accountId,
    subject: firstMessage.subject,
    snippet: lastMessage.snippet,
    lastMessageAt: lastMessage.date,
    messageCount: parsedMessages.length,
    isRead,
    isStarred,
    isImportant,
    hasAttachments,
  });

  await setThreadLabels(accountId, thread.id, [...allLabelIds]);

  // Rule-based categorization for inbox threads
  if (allLabelIds.has("INBOX")) {
    const { getThreadCategoryWithManual, setThreadCategory } = await import("@/services/db/threadCategories");
    const existing = await getThreadCategoryWithManual(accountId, thread.id);
    // Skip if manually categorized
    if (!existing || !existing.isManual) {
      const { categorizeByRules } = await import("@/services/categorization/ruleEngine");
      const category = categorizeByRules({
        labelIds: [...allLabelIds],
        fromAddress: lastMessage.fromAddress,
        listUnsubscribe: lastMessage.listUnsubscribe,
      });
      await setThreadCategory(accountId, thread.id, category, false);

      // Auto-archive if category matches (new threads only, so a thread the
      // user moved back to the inbox stays there)
      if (!existing && client && autoArchiveCategories && autoArchiveCategories.has(category) && category !== "Primary") {
        try {
          await client.modifyThread(thread.id, undefined, ["INBOX"]);
          allLabelIds.delete("INBOX");
          await setThreadLabels(accountId, thread.id, [...allLabelIds]);
        } catch (err) {
          console.error(`Failed to auto-archive thread ${thread.id}:`, err);
        }
      }

      // Hold thread if delivery schedule is active for this category
      if (category !== "Primary") {
        try {
          const { getBundleRule, holdThread, getNextDeliveryTime } = await import("@/services/db/bundleRules");
          const rule = await getBundleRule(accountId, category);
          if (rule?.delivery_enabled && rule.delivery_schedule) {
            const schedule = JSON.parse(rule.delivery_schedule);
            const heldUntil = getNextDeliveryTime(schedule);
            await holdThread(accountId, thread.id, category, heldUntil);
          }
        } catch (err) {
          console.error(`Failed to check bundle rule for thread ${thread.id}:`, err);
        }
      }
    }
  }

  await Promise.all(parsedMessages.map(async (parsed) => {
    await upsertMessage({
      id: parsed.id,
      accountId,
      threadId: parsed.threadId,
      fromAddress: parsed.fromAddress,
      fromName: parsed.fromName,
      toAddresses: parsed.toAddresses,
      ccAddresses: parsed.ccAddresses,
      bccAddresses: parsed.bccAddresses,
      replyTo: parsed.replyTo,
      subject: parsed.subject,
      snippet: parsed.snippet,
      date: parsed.date,
      isRead: parsed.isRead,
      isStarred: parsed.isStarred,
      bodyHtml: parsed.bodyHtml,
      bodyText: parsed.bodyText,
      rawSize: parsed.rawSize,
      internalDate: parsed.internalDate,
      listUnsubscribe: parsed.listUnsubscribe,
      listUnsubscribePost: parsed.listUnsubscribePost,
      authResults: parsed.authResults,
    });

    await Promise.all(parsed.attachments.map((att) =>
      upsertAttachment({
        id: `${parsed.id}_${att.gmailAttachmentId}`,
        messageId: parsed.id,
        accountId,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        gmailAttachmentId: att.gmailAttachmentId,
        contentId: att.contentId,
        isInline: att.isInline,
      }),
    ));
  }));
}

/**
 * Sync all labels for an account.
 */
export async function syncLabels(
  client: GmailClient,
  accountId: string,
): Promise<void> {
  const response = await client.listLabels();
  await Promise.all(response.labels.map((label) =>
    upsertLabel({
      id: label.id,
      accountId,
      name: label.name,
      type: label.type,
      colorBg: label.color?.backgroundColor ?? null,
      colorFg: label.color?.textColor ?? null,
    }),
  ));
}

/**
 * Perform an initial full sync: fetch all threads from the last N days.
 */
/**
 * Initial sync keeps the mailbox local copy small and shows mail quickly:
 * - threads are listed newest first and stored page by page, so the list
 *   fills in while the sync is still running;
 * - at most INITIAL_SYNC_MAX_THREADS are stored (older mail is reachable
 *   through server-side search, see services/search/unifiedSearch.ts);
 * - threads already in the DB are skipped, so an interrupted sync resumes
 *   instead of starting over;
 * - the history ID is taken from the profile *before* listing, so the
 *   following delta sync catches anything that changed meanwhile.
 */
const INITIAL_SYNC_MAX_THREADS = 1500;

export async function initialSync(
  client: GmailClient,
  accountId: string,
  daysBack = 365,
  onProgress?: SyncProgressCallback,
): Promise<void> {
  onProgress?.({ phase: "labels", current: 0, total: 1 });
  const profile = await client.getProfile();
  await syncLabels(client, accountId);
  onProgress?.({ phase: "labels", current: 1, total: 1 });

  const afterDate = new Date();
  afterDate.setDate(afterDate.getDate() - daysBack);
  const afterStr = `${afterDate.getFullYear()}/${afterDate.getMonth() + 1}/${afterDate.getDate()}`;

  const db = await getDb();
  const existingRows = await db.select<{ id: string }[]>("SELECT id FROM threads WHERE account_id = $1", [accountId]);
  const existing = new Set(existingRows.map((r) => r.id));
  const autoArchiveCategories = await loadAutoArchiveCategories();

  let listed = 0;
  let attempted = 0;
  let failed = 0;
  let pageToken: string | undefined;
  do {
    const response = await client.listThreads({
      maxResults: 100,
      pageToken,
      q: `after:${afterStr}`,
    });
    pageToken = response.nextPageToken;
    const stubs = (response.threads ?? []).slice(0, INITIAL_SYNC_MAX_THREADS - listed);
    listed += stubs.length;

    await parallelLimit(
      stubs
        .filter((stub) => !existing.has(stub.id))
        .map((stub) => async () => {
          attempted++;
          try {
            const thread = await client.getThread(stub.id, "metadata");
            if (!thread.messages || thread.messages.length === 0) return;
            const parsedMessages = thread.messages.map(parseGmailMessage);
            await processAndStoreThread(thread, accountId, parsedMessages, client, autoArchiveCategories);
          } catch (err) {
            failed++;
            console.error(`Failed to sync thread ${stub.id}:`, err);
          }
        }),
      4,
    );

    onProgress?.({
      phase: "messages",
      current: listed,
      total: listed + (pageToken && listed < INITIAL_SYNC_MAX_THREADS ? 100 : 0),
    });
    window.dispatchEvent(new Event("velo-sync-done"));
  } while (pageToken && listed < INITIAL_SYNC_MAX_THREADS);

  // Don't mark a sync that stored nothing as complete: the next run retries.
  if (attempted > 0 && failed === attempted) {
    throw new Error(`Initial sync failed for all ${attempted} threads`);
  }
  console.log(`[syncManager] Initial sync stored ${attempted - failed}/${listed} threads for ${accountId}`);
  await updateAccountSyncState(accountId, profile.historyId);

  onProgress?.({ phase: "done", current: listed, total: listed });
}

/**
 * Delta sync: fetch only changes since last sync using history API.
 */
/**
 * Process a batch of promises with limited concurrency.
 */
async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  let index = 0;

  async function next(): Promise<void> {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]!();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => next());
  await Promise.all(workers);
  return results;
}

const failedDeltaRounds = new Map<string, number>();

/** Remove a thread and everything hanging off it from the local DB. */
async function removeLocalThread(accountId: string, threadId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM attachments WHERE account_id = $1 AND message_id IN (SELECT id FROM messages WHERE account_id = $1 AND thread_id = $2)", [accountId, threadId]);
  await db.execute("DELETE FROM messages WHERE account_id = $1 AND thread_id = $2", [accountId, threadId]);
  await db.execute("DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2", [accountId, threadId]);
  await db.execute("DELETE FROM threads WHERE account_id = $1 AND id = $2", [accountId, threadId]);
}

/** Drop local messages of a thread that the server no longer has. */
async function removeMissingMessages(accountId: string, threadId: string, keepIds: string[]): Promise<void> {
  if (keepIds.length === 0) return;
  const db = await getDb();
  const placeholders = keepIds.map((_, i) => `$${i + 3}`).join(", ");
  await db.execute(
    `DELETE FROM messages WHERE account_id = $1 AND thread_id = $2 AND id NOT IN (${placeholders})`,
    [accountId, threadId, ...keepIds],
  );
}

/**
 * Delta sync: fetch only changes since last sync using history API.
 */
export async function deltaSync(
  client: GmailClient,
  accountId: string,
  lastHistoryId: string,
): Promise<void> {
  try {
    // Paginate through all history pages
    const affectedThreadIds = new Set<string>();
    const newInboxMessageIds = new Set<string>();
    let latestHistoryId = lastHistoryId;
    let pageToken: string | undefined;

    do {
      const response = await client.getHistory(lastHistoryId, undefined, pageToken);
      latestHistoryId = response.historyId;

      if (response.history) {
        for (const item of response.history) {
          if (item.messagesAdded) {
            for (const added of item.messagesAdded) {
              affectedThreadIds.add(added.message.threadId);
              // Track new unread inbox messages for notifications
              const labels = added.message.labelIds ?? [];
              if (labels.includes("INBOX") && labels.includes("UNREAD")) {
                newInboxMessageIds.add(added.message.id);
              }
            }
          }
          if (item.messagesDeleted) {
            for (const deleted of item.messagesDeleted) {
              affectedThreadIds.add(deleted.message.threadId);
            }
          }
          if (item.labelsAdded) {
            for (const labeled of item.labelsAdded) {
              affectedThreadIds.add(labeled.message.threadId);
            }
          }
          if (item.labelsRemoved) {
            for (const unlabeled of item.labelsRemoved) {
              affectedThreadIds.add(unlabeled.message.threadId);
            }
          }
        }
      }

      pageToken = response.nextPageToken;
    } while (pageToken);

    if (affectedThreadIds.size === 0) {
      await updateAccountSyncState(accountId, latestHistoryId);
      return;
    }

    // Load settings once for the whole sync cycle
    const autoArchiveCategories = await loadAutoArchiveCategories();
    const mutedThreadIds = await getMutedThreadIds(accountId);
    const smartNotifications = (await getSetting("smart_notifications")) !== "false";
    const notifyCategories = new Set(
      ((await getSetting("notify_categories")) ?? "Primary").split(",").map((s) => s.trim()).filter(Boolean),
    );
    const vipSenders = smartNotifications ? await getVipSenders(accountId) : new Set<string>();

    // Re-fetch affected threads in parallel (max 5 concurrent)
    const threadIds = [...affectedThreadIds];
    let failed = 0;
    await parallelLimit(
      threadIds.map((threadId) => async () => {
        try {
          // Skip metadata overwrite for threads with pending local changes
          const pendingOps = await getPendingOpsForResource(accountId, threadId);
          if (pendingOps.length > 0) {
            console.log(`[deltaSync] Skipping thread ${threadId}: has ${pendingOps.length} pending local ops`);
            return;
          }

          let thread;
          try {
            thread = await client.getThread(threadId, "metadata");
          } catch (err) {
            // Deleted on the server (e.g. trash emptied): drop the local copy.
            if (String(err).includes("Gmail API error: 404")) {
              await removeLocalThread(accountId, threadId);
              return;
            }
            throw err;
          }

          if (!thread.messages || thread.messages.length === 0) {
            await removeLocalThread(accountId, threadId);
            return;
          }

          const parsedMessages = thread.messages.map(parseGmailMessage);
          await processAndStoreThread(thread, accountId, parsedMessages, client, autoArchiveCategories);
          await removeMissingMessages(accountId, threadId, parsedMessages.map((m) => m.id));

          // Auto-archive muted threads that reappear in INBOX
          if (mutedThreadIds.has(threadId)) {
            const hasInbox = parsedMessages.some((m) => m.labelIds.includes("INBOX"));
            if (hasInbox) {
              try {
                await client.modifyThread(threadId, undefined, ["INBOX"]);
                await setThreadLabels(accountId, threadId,
                  [...new Set(parsedMessages.flatMap((m) => m.labelIds))].filter((l) => l !== "INBOX"),
                );
              } catch (err) {
                console.error(`Failed to auto-archive muted thread ${threadId}:`, err);
              }
            }
          }

          // Send desktop notifications for new unread inbox messages (smart-filtered)
          // Skip notifications for muted threads
          for (const parsed of parsedMessages) {
            if (newInboxMessageIds.has(parsed.id) && !mutedThreadIds.has(threadId)) {
              const fromAddr = parsed.fromAddress ?? undefined;
              if (shouldNotifyForMessage(smartNotifications, notifyCategories, vipSenders, await getThreadCategory(accountId, threadId), fromAddr)) {
                const sender = parsed.fromName ?? parsed.fromAddress ?? "Unknown";
                queueNewEmailNotification(
                  sender,
                  parsed.subject ?? "",
                  parsed.threadId,
                  accountId,
                  fromAddr,
                );
              }
            }
          }

          // Apply filters to new inbox messages in this thread
          const newMessages = parsedMessages.filter((m) => newInboxMessageIds.has(m.id));
          if (newMessages.length > 0) {
            try {
              await applyFiltersToMessages(accountId, newMessages);
            } catch (err) {
              console.error(`Failed to apply filters to thread ${threadId}:`, err);
            }

            // Apply smart labels (fire-and-forget, non-blocking)
            import("@/services/smartLabels/smartLabelManager")
              .then(({ applySmartLabelsToMessages }) => applySmartLabelsToMessages(accountId, newMessages))
              .catch((err) => console.error("Smart label error:", err));
          }
        } catch (err) {
          failed++;
          console.error(`Failed to re-sync thread ${threadId}:`, err);
        }
      }),
      10,
    );

    // Keep the old history ID when threads failed, so the next delta retries
    // them. Give up after a few rounds so one broken thread can't stall sync.
    if (failed > 0) {
      const rounds = (failedDeltaRounds.get(accountId) ?? 0) + 1;
      if (rounds < 3) {
        failedDeltaRounds.set(accountId, rounds);
        console.warn(`[deltaSync] ${failed} thread(s) failed, retrying from history ${lastHistoryId}`);
        return;
      }
    }
    failedDeltaRounds.delete(accountId);
    await updateAccountSyncState(accountId, latestHistoryId);

    // Fire-and-forget AI categorization for new threads
    import("@/services/ai/categorizationManager")
      .then(({ categorizeNewThreads }) => categorizeNewThreads(accountId))
      .catch((err) => console.error("Categorization error:", err));
  } catch (err) {
    // historyId might be too old — need full re-sync
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("404") || message.includes("historyId")) {
      console.warn("History ID expired, triggering full re-sync");
      throw new Error("HISTORY_EXPIRED");
    }
    throw err;
  }
}

/**
 * Fetch one thread (headers only) and store it locally. Used by server-side
 * search to bring in old threads that fall outside the synced window.
 */
export async function storeGmailThread(
  client: GmailClient,
  accountId: string,
  threadId: string,
): Promise<void> {
  const thread = await client.getThread(threadId, "metadata");
  if (!thread.messages || thread.messages.length === 0) return;
  const parsedMessages = thread.messages.map(parseGmailMessage);
  await processAndStoreThread(thread, accountId, parsedMessages, client, await loadAutoArchiveCategories());
}
