import { getDb } from "../db/connection";
import { getSetting, setSetting } from "../db/settings";

/**
 * PEC (posta elettronica certificata) bookkeeping, run after each IMAP sync.
 *
 * The Rust parser tags every PEC message with `pec_kind` (envelope
 * "posta-certificata" or a receipt type from X-Ricevuta) and points receipts
 * at the original message via In-Reply-To, so receipts land in the same
 * thread as the sent message. Here we derive a per-thread status and keep
 * receipt-only threads out of the inbox unless the user wants them.
 */

export type PecStatus = "errore" | "consegnata" | "accettata" | "ricevuta";

const ENVELOPE_KINDS = "('posta-certificata', 'errore')";
const ERROR_KINDS = "('errore', 'errore-consegna', 'non-accettazione', 'preavviso-errore-consegna', 'rilevazione-virus')";

export const SHOW_PEC_RECEIPTS_SETTING = "show_pec_receipts";

export const PEC_STATUS_LABELS: Record<PecStatus, string> = {
  errore: "Errore",
  consegnata: "Consegnata",
  accettata: "Accettata",
  ricevuta: "PEC",
};

export const PEC_KIND_LABELS: Record<string, string> = {
  "posta-certificata": "PEC",
  errore: "Anomalia PEC",
  accettazione: "Ricevuta di accettazione",
  "non-accettazione": "Mancata accettazione",
  "presa-in-carico": "Presa in carico",
  "avvenuta-consegna": "Ricevuta di consegna",
  "errore-consegna": "Mancata consegna",
  "preavviso-errore-consegna": "Preavviso di mancata consegna",
  "rilevazione-virus": "Rilevazione virus",
};

export async function refreshPecState(accountId: string): Promise<void> {
  const db = await getDb();

  const MATCHED_RECEIPT = `account_id = $1 AND pec_ref IS NOT NULL
       AND pec_kind IS NOT NULL AND pec_kind NOT IN ${ENVELOPE_KINDS}
       AND EXISTS (
         SELECT 1 FROM messages o
         WHERE o.account_id = messages.account_id
           AND trim(o.message_id_header, '<>') = messages.pec_ref
           AND (o.pec_kind IS NULL OR o.pec_kind IN ${ENVELOPE_KINDS})
           AND o.thread_id <> messages.thread_id)`;
  const moved = await db.select<{ thread_id: string }[]>(
    `SELECT DISTINCT thread_id FROM messages WHERE ${MATCHED_RECEIPT}`,
    [accountId],
  );

  // The threader only follows In-Reply-To; receipts of a reply, or ones whose
  // original arrived later, can end up in a thread of their own. Move every
  // receipt next to the message it refers to.
  await db.execute(
    `UPDATE messages SET thread_id = (
       SELECT o.thread_id FROM messages o
       WHERE o.account_id = messages.account_id AND trim(o.message_id_header, '<>') = messages.pec_ref
         AND (o.pec_kind IS NULL OR o.pec_kind IN ${ENVELOPE_KINDS})
       LIMIT 1)
     WHERE ${MATCHED_RECEIPT}`,
    [accountId],
  );
  // Threads emptied by the move.
  for (const { thread_id } of moved) {
    const left = await db.select<{ n: number }[]>(
      "SELECT COUNT(*) AS n FROM messages WHERE account_id = $1 AND thread_id = $2",
      [accountId, thread_id],
    );
    if ((left[0]?.n ?? 0) > 0) continue;
    await db.execute("DELETE FROM thread_labels WHERE account_id = $1 AND thread_id = $2", [accountId, thread_id]);
    await db.execute("DELETE FROM threads WHERE account_id = $1 AND id = $2", [accountId, thread_id]);
  }
  await db.execute(
    `UPDATE threads SET pec_status = (
       SELECT CASE
         WHEN SUM(m.pec_kind IN ${ERROR_KINDS}) > 0 THEN 'errore'
         WHEN SUM(m.pec_kind = 'avvenuta-consegna') > 0 THEN 'consegnata'
         WHEN SUM(m.pec_kind IN ('accettazione', 'presa-in-carico')) > 0 THEN 'accettata'
         WHEN SUM(m.pec_kind IN ${ENVELOPE_KINDS}) > 0 THEN 'ricevuta'
       END
       FROM messages m WHERE m.account_id = threads.account_id AND m.thread_id = threads.id)
     WHERE account_id = $1
       AND id IN (SELECT thread_id FROM messages WHERE account_id = $1 AND pec_kind IS NOT NULL)`,
    [accountId],
  );

  if ((await getSetting(SHOW_PEC_RECEIPTS_SETTING)) === "true") {
    await db.execute(
      `INSERT OR IGNORE INTO thread_labels (account_id, thread_id, label_id)
       SELECT DISTINCT account_id, thread_id, 'INBOX' FROM messages
       WHERE account_id = $1 AND imap_folder = 'INBOX'
         AND pec_kind IS NOT NULL AND pec_kind NOT IN ${ENVELOPE_KINDS}`,
      [accountId],
    );
    return;
  }

  // Threads whose only inbox messages are receipts leave the inbox, but only
  // when the receipts sit next to the sent message (so they stay visible
  // there) and none of them reports an error.
  await db.execute(
    `DELETE FROM thread_labels
     WHERE account_id = $1 AND label_id = 'INBOX' AND thread_id IN (
       SELECT thread_id FROM messages WHERE account_id = $1
       GROUP BY thread_id
       HAVING SUM(imap_folder = 'INBOX' AND (pec_kind IS NULL OR pec_kind IN ${ENVELOPE_KINDS})) = 0
          AND SUM(pec_kind IS NOT NULL AND pec_kind NOT IN ${ENVELOPE_KINDS}) > 0
          AND SUM(pec_kind IS NULL OR pec_kind IN ${ENVELOPE_KINDS}) > 0
          AND SUM(pec_kind IN ${ERROR_KINDS}) = 0)`,
    [accountId],
  );
  // Error receipts always show up in the inbox.
  await db.execute(
    `INSERT OR IGNORE INTO thread_labels (account_id, thread_id, label_id)
     SELECT DISTINCT account_id, thread_id, 'INBOX' FROM messages
     WHERE account_id = $1 AND imap_folder = 'INBOX' AND pec_kind IN ${ERROR_KINDS}`,
    [accountId],
  );
}

/** Toggle receipts in the inbox for every IMAP account. */
export async function setShowPecReceipts(show: boolean): Promise<void> {
  await setSetting(SHOW_PEC_RECEIPTS_SETTING, show ? "true" : "false");
  const db = await getDb();
  const accounts = await db.select<{ id: string }[]>("SELECT id FROM accounts WHERE provider = 'imap'");
  for (const a of accounts) await refreshPecState(a.id);
  window.dispatchEvent(new Event("velo-sync-done"));
}
