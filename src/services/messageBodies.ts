import { getDb } from "./db/connection";
import { getAccount } from "./db/accounts";
import { upsertAttachment } from "./db/attachments";
import type { DbMessage } from "./db/messages";
import { getGmailClient } from "./gmail/tokenManager";
import { parseGmailMessage } from "./gmail/messageParser";

/**
 * Sync stores only headers and snippets; bodies are downloaded the first
 * time a message is opened and cached in SQLite. This keeps the local
 * database small (a few KB per message instead of the whole mailbox).
 */
const inflight = new Map<string, Promise<DbMessage>>();

async function fetchGmailBody(msg: DbMessage): Promise<DbMessage> {
  const client = await getGmailClient(msg.account_id);
  const parsed = parseGmailMessage(await client.getMessage(msg.id, "full"));
  const db = await getDb();
  await db.execute(
    "UPDATE messages SET body_html = $1, body_text = $2, body_cached = 1 WHERE id = $3 AND account_id = $4",
    [parsed.bodyHtml, parsed.bodyText, msg.id, msg.account_id],
  );
  await Promise.all(
    parsed.attachments.map((att) =>
      upsertAttachment({
        id: `${parsed.id}_${att.gmailAttachmentId}`,
        messageId: parsed.id,
        accountId: msg.account_id,
        filename: att.filename,
        mimeType: att.mimeType,
        size: att.size,
        gmailAttachmentId: att.gmailAttachmentId,
        contentId: att.contentId,
        isInline: att.isInline,
      }),
    ),
  );
  if (parsed.attachments.some((a) => !a.isInline)) {
    await db.execute("UPDATE threads SET has_attachments = 1 WHERE id = $1 AND account_id = $2", [
      msg.thread_id,
      msg.account_id,
    ]);
  }
  return { ...msg, body_html: parsed.bodyHtml, body_text: parsed.bodyText, body_cached: 1 };
}

function needsBody(msg: DbMessage): boolean {
  return !msg.body_cached && msg.body_html == null && msg.body_text == null;
}

/** Return the messages with bodies filled in, downloading the missing ones. */
export async function ensureBodies(messages: DbMessage[]): Promise<DbMessage[]> {
  if (!messages.some(needsBody)) return messages;
  const providers = new Map<string, string>();
  return Promise.all(
    messages.map(async (msg) => {
      if (!needsBody(msg)) return msg;
      let provider = providers.get(msg.account_id);
      if (!provider) {
        provider = (await getAccount(msg.account_id))?.provider ?? "";
        providers.set(msg.account_id, provider);
      }
      if (provider !== "gmail_api") return msg; // IMAP sync already stores bodies
      const key = `${msg.account_id}:${msg.id}`;
      let p = inflight.get(key);
      if (!p) {
        p = fetchGmailBody(msg).finally(() => inflight.delete(key));
        inflight.set(key, p);
      }
      try {
        return await p;
      } catch (err) {
        console.warn(`[bodies] Failed to load body for ${msg.id}:`, err);
        return msg;
      }
    }),
  );
}

/** getMessagesForThread + ensureBodies, for views that render or quote bodies. */
export async function getMessagesWithBodies(accountId: string, threadId: string): Promise<DbMessage[]> {
  const { getMessagesForThread } = await import("./db/messages");
  return ensureBodies(await getMessagesForThread(accountId, threadId));
}
