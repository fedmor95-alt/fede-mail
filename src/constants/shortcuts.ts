export interface ShortcutItem {
  id: string;
  keys: string; // default key binding
  desc: string;
}

export interface ShortcutCategory {
  category: string;
  items: ShortcutItem[];
}

export const SHORTCUTS: ShortcutCategory[] = [
  { category: "Navigazione", items: [
    { id: "nav.next", keys: "j", desc: "Conversazione successiva" },
    { id: "nav.prev", keys: "k", desc: "Conversazione precedente" },
    { id: "nav.open", keys: "o", desc: "Apri conversazione" },
    { id: "nav.msgNext", keys: "ArrowDown", desc: "Messaggio successivo nella conversazione" },
    { id: "nav.msgPrev", keys: "ArrowUp", desc: "Messaggio precedente nella conversazione" },
    { id: "nav.goInbox", keys: "g then i", desc: "Vai a Posta in arrivo" },
    { id: "nav.goStarred", keys: "g then s", desc: "Vai a Speciali" },
    { id: "nav.goSent", keys: "g then t", desc: "Vai a Inviata" },
    { id: "nav.goDrafts", keys: "g then d", desc: "Vai a Bozze" },
    { id: "nav.goPrimary", keys: "g then p", desc: "Vai a Principale" },
    { id: "nav.goUpdates", keys: "g then u", desc: "Vai a Aggiornamenti" },
    { id: "nav.goPromotions", keys: "g then o", desc: "Vai a Promozioni" },
    { id: "nav.goSocial", keys: "g then c", desc: "Vai a Social" },
    { id: "nav.goNewsletters", keys: "g then n", desc: "Vai a Newsletter" },
    { id: "nav.goTasks", keys: "g then k", desc: "Vai a Attività" },
    { id: "nav.goAttachments", keys: "g then a", desc: "Vai a Allegati" },
    { id: "nav.escape", keys: "Escape", desc: "Chiudi / Indietro" },
  ]},
  { category: "Azioni", items: [
    { id: "action.compose", keys: "c", desc: "Scrivi nuova email" },
    { id: "action.reply", keys: "r", desc: "Rispondi" },
    { id: "action.replyAll", keys: "a", desc: "Rispondi a tutti" },
    { id: "action.forward", keys: "f", desc: "Inoltra" },
    { id: "action.archive", keys: "e", desc: "Archivia" },
    { id: "action.delete", keys: "#", desc: "Elimina" },
    { id: "action.spam", keys: "!", desc: "Segnala / Non è posta indesiderata" },
    { id: "action.star", keys: "s", desc: "Aggiungi / Rimuovi da Speciali" },
    { id: "action.pin", keys: "p", desc: "Fissa / Sblocca" },
    { id: "action.unsubscribe", keys: "u", desc: "Annulla iscrizione" },
    { id: "action.mute", keys: "m", desc: "Silenzia / Riattiva" },
    { id: "action.createTaskFromEmail", keys: "t", desc: "Crea attività dall'email (IA)" },
    { id: "action.moveToFolder", keys: "v", desc: "Sposta in cartella/etichetta" },
    { id: "action.selectAll", keys: "Ctrl+A", desc: "Seleziona tutto" },
    { id: "action.selectFromHere", keys: "Ctrl+Shift+A", desc: "Seleziona tutto da qui" },
  ]},
  { category: "App", items: [
    { id: "app.commandPalette", keys: "/", desc: "Riquadro comandi" },
    { id: "app.toggleSidebar", keys: "Ctrl+Shift+E", desc: "Mostra/nascondi barra laterale" },
    { id: "app.send", keys: "Ctrl+Enter", desc: "Invia email" },
    { id: "app.askInbox", keys: "i", desc: "Chiedi all'IA sulla tua posta" },
    { id: "app.help", keys: "?", desc: "Mostra scorciatoie da tastiera" },
    { id: "app.syncFolder", keys: "F5", desc: "Sincronizza cartella corrente" },
  ]},
];

/**
 * Build a flat map of shortcut ID -> default key binding.
 */
export function getDefaultKeyMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cat of SHORTCUTS) {
    for (const item of cat.items) {
      map[item.id] = item.keys;
    }
  }
  return map;
}
