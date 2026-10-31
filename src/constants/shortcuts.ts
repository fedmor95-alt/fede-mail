import { isMac } from "@/utils/platform";

export interface ShortcutItem {
  id: string;
  keys: string; // default key binding
  /** Optional second default binding (e.g. a Ctrl combo next to a Gmail-style letter). */
  alt?: string;
  desc: string;
}

export interface ShortcutCategory {
  category: string;
  items: ShortcutItem[];
}

/** Suffix of the key-map entry that holds an item's alternate binding. */
export const ALT_SUFFIX = ".alt";

export const SHORTCUTS: ShortcutCategory[] = [
  { category: "Navigazione", items: [
    { id: "nav.next", keys: "ArrowDown", alt: "j", desc: "Conversazione successiva" },
    { id: "nav.prev", keys: "ArrowUp", alt: "k", desc: "Conversazione precedente" },
    { id: "nav.open", keys: "Enter", alt: "o", desc: "Apri conversazione" },
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
    { id: "action.compose", keys: "Ctrl+N", alt: "c", desc: "Scrivi nuova email" },
    { id: "action.reply", keys: "Ctrl+R", alt: "r", desc: "Rispondi" },
    { id: "action.replyAll", keys: "Ctrl+Shift+R", alt: "a", desc: "Rispondi a tutti" },
    { id: "action.forward", keys: "Ctrl+L", alt: "f", desc: "Inoltra" },
    { id: "action.archive", keys: "e", desc: "Archivia" },
    { id: "action.delete", keys: "Delete", alt: "Backspace", desc: "Elimina" },
    { id: "action.undo", keys: "Ctrl+Z", desc: "Annulla l'ultima eliminazione o archiviazione" },
    { id: "action.toggleRead", keys: "m", alt: "Shift+U", desc: "Segna come letto / da leggere" },
    { id: "action.spam", keys: "Ctrl+J", alt: "!", desc: "Segnala / Non è posta indesiderata" },
    { id: "action.star", keys: "s", desc: "Aggiungi / Rimuovi da Speciali" },
    { id: "action.pin", keys: "p", desc: "Fissa / Sblocca" },
    { id: "action.unsubscribe", keys: "u", desc: "Annulla iscrizione" },
    { id: "action.mute", keys: "Shift+M", desc: "Silenzia / Riattiva" },
    { id: "action.createTaskFromEmail", keys: "t", desc: "Crea attività dall'email (IA)" },
    { id: "action.moveToFolder", keys: "v", desc: "Sposta in cartella/etichetta" },
    { id: "action.selectAll", keys: "Ctrl+A", desc: "Seleziona tutto" },
    { id: "action.selectFromHere", keys: "Ctrl+Shift+A", desc: "Seleziona tutto da qui" },
  ]},
  { category: "App", items: [
    { id: "app.search", keys: "Ctrl+F", alt: "/", desc: "Cerca" },
    { id: "app.commandPalette", keys: "Ctrl+K", desc: "Riquadro comandi" },
    { id: "app.settings", keys: "Ctrl+,", desc: "Apri le impostazioni" },
    { id: "app.toggleSidebar", keys: "Ctrl+Shift+E", desc: "Mostra/nascondi barra laterale" },
    { id: "app.fontBigger", keys: "Ctrl+Shift++", desc: "Testo più grande" },
    { id: "app.fontSmaller", keys: "Ctrl+Shift+-", desc: "Testo più piccolo" },
    { id: "app.fontReset", keys: "Ctrl+Shift+0", desc: "Testo a dimensione normale" },
    { id: "app.send", keys: "Ctrl+Enter", desc: "Invia email" },
    { id: "app.askInbox", keys: "i", desc: "Chiedi all'IA sulla tua posta" },
    { id: "app.help", keys: "?", alt: "F1", desc: "Mostra scorciatoie da tastiera" },
    { id: "app.syncFolder", keys: "F5", desc: "Sincronizza cartella corrente" },
  ]},
];

/**
 * Build a flat map of shortcut ID -> default key binding. Alternate
 * bindings live under `<id>.alt`.
 */
export function getDefaultKeyMap(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const cat of SHORTCUTS) {
    for (const item of cat.items) {
      map[item.id] = item.keys;
      if (item.alt) map[item.id + ALT_SUFFIX] = item.alt;
    }
  }
  return map;
}

/** Strip the `.alt` suffix so both bindings run the same action. */
export function baseActionId(id: string): string {
  return id.endsWith(ALT_SUFFIX) ? id.slice(0, -ALT_SUFFIX.length) : id;
}

/** Split a binding like "Ctrl+Shift++" into its modifiers and final key. */
export function splitBinding(binding: string): { key: string; mods: string[] } {
  if (binding.endsWith("++")) {
    return { key: "+", mods: binding.slice(0, -2).split("+").filter(Boolean) };
  }
  const parts = binding.split("+");
  const key = parts.pop() || "+";
  return { key, mods: parts };
}

const MAC_KEYS: Record<string, string> = {
  Enter: "↩",
  Backspace: "⌫",
  Delete: "⌦",
  Escape: "Esc",
  ArrowUp: "↑",
  ArrowDown: "↓",
};

/**
 * Binding as shown to the user. "Ctrl" is the primary modifier: on macOS it
 * is ⌘ and combos use the Apple notation (⌥⇧⌘R); elsewhere the binding is
 * shown as stored.
 */
export function formatShortcut(binding: string, mac = isMac()): string {
  if (!mac || binding.includes(" then ")) return binding;
  const { key, mods } = splitBinding(binding);
  const prefix =
    (mods.includes("Alt") ? "⌥" : "") +
    (mods.includes("Shift") ? "⇧" : "") +
    (mods.some((m) => m === "Ctrl" || m === "Cmd" || m === "CmdOrCtrl") ? "⌘" : "");
  const label = MAC_KEYS[key] ?? (prefix && key.length === 1 ? key.toUpperCase() : key);
  return prefix + label;
}
