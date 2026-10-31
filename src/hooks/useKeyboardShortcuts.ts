import { useEffect, useRef } from "react";
import { useUIStore, type FontScale } from "@/stores/uiStore";
import { useThreadStore } from "@/stores/threadStore";
import { useComposerStore } from "@/stores/composerStore";
import { useAccountStore } from "@/stores/accountStore";
import { useShortcutStore } from "@/stores/shortcutStore";
import { baseActionId } from "@/constants/shortcuts";
import { useContextMenuStore } from "@/stores/contextMenuStore";
import { navigateToLabel, navigateToThread, navigateBack, getActiveLabel, getSelectedThreadId } from "@/router/navigate";
import { archiveThread, trashThread, permanentDeleteThread, starThread, spamThread, markThreadRead, undoLastAction } from "@/services/emailActions";
import { deleteThread as deleteThreadFromDb, pinThread as pinThreadDb, unpinThread as unpinThreadDb, muteThread as muteThreadDb, unmuteThread as unmuteThreadDb } from "@/services/db/threads";
import { deleteDraftsForThread } from "@/services/gmail/draftDeletion";
import { getGmailClient } from "@/services/gmail/tokenManager";
import { getMessagesWithBodies } from "@/services/messageBodies";
import { parseUnsubscribeUrl } from "@/components/email/MessageItem";
import { openUrl } from "@tauri-apps/plugin-opener";
import { triggerSync } from "@/services/gmail/syncManager";

/** Split a binding like "Ctrl+Shift++" into modifiers and the final key. */
function parseBinding(binding: string): { key: string; ctrl: boolean; shift: boolean; alt: boolean } {
  let key: string;
  let mods: string[];
  if (binding.endsWith("++")) {
    key = "+";
    mods = binding.slice(0, -2).split("+").filter(Boolean);
  } else {
    const parts = binding.split("+");
    key = parts.pop() || "+";
    mods = parts;
  }
  return {
    key,
    ctrl: mods.some((p) => p === "Ctrl" || p === "Cmd"),
    shift: mods.includes("Shift"),
    alt: mods.includes("Alt"),
  };
}

/** Physical-key fallbacks for bindings that depend on the keyboard layout. */
const CODE_ALIASES: Record<string, string[]> = {
  "+": ["Equal", "NumpadAdd", "BracketRight"],
  "-": ["Minus", "NumpadSubtract", "Slash"],
  "0": ["Digit0", "Numpad0"],
};

/**
 * Check if a key binding matches a keyboard event.
 * Supports formats like: "j", "#", "Shift+U", "Ctrl+K", "Ctrl+Shift+E", "Ctrl+Enter", "Ctrl+Shift++".
 * Symbol keys ("#", "!", "?", "/") ignore Shift/AltGr, since on many layouts
 * (Italian included) they can only be typed with a modifier.
 */
function matchesKey(binding: string, e: KeyboardEvent): boolean {
  const { key, ctrl, shift, alt } = parseBinding(binding);
  const isSymbol = key.length === 1 && !/[a-z0-9]/i.test(key);
  const hasCtrl = e.ctrlKey || e.metaKey;

  if (isSymbol && !ctrl) {
    // AltGr arrives as ctrl+alt on Windows: accept it for symbols.
    if (hasCtrl && !e.altKey) return false;
    return e.key === key;
  }

  const ctrlMatch = ctrl ? hasCtrl : !hasCtrl;
  const shiftMatch = shift ? e.shiftKey : !e.shiftKey;
  const altMatch = alt ? e.altKey : !e.altKey;
  if (!ctrlMatch || !shiftMatch || !altMatch) return false;

  if (key.length === 1) {
    if (e.key.toLowerCase() === key.toLowerCase()) return true;
    const codes = CODE_ALIASES[key];
    return !!codes && codes.includes(e.code);
  }
  return e.key === key;
}

/**
 * Build a reverse map from the key map:
 * - singleKey: plain key -> action ID
 * - twoKeySequences: second key -> action ID (first key is always "g")
 * - combos: action ID -> binding with modifiers (checked with matchesKey)
 */
function buildReverseMap(keyMap: Record<string, string>): {
  singleKey: Map<string, string>;
  twoKeySequences: Map<string, string>;
  combos: Map<string, string>;
} {
  const singleKey = new Map<string, string>();
  const twoKeySequences = new Map<string, string>();
  const combos = new Map<string, string>();

  for (const [id, keys] of Object.entries(keyMap)) {
    if (!keys) continue;
    if (keys.includes(" then ")) {
      const secondKey = keys.split(" then ")[1]!.trim();
      twoKeySequences.set(secondKey, id);
    } else if (keys.length > 1 && keys.includes("+")) {
      combos.set(id, keys);
    } else {
      singleKey.set(keys, id);
    }
  }

  return { singleKey, twoKeySequences, combos };
}

// Cached reverse map to avoid rebuilding on every keypress
let cachedKeyMap: Record<string, string> | null = null;
let cachedReverseMap: ReturnType<typeof buildReverseMap> | null = null;

function getCachedReverseMap(keyMap: Record<string, string>): ReturnType<typeof buildReverseMap> {
  if (cachedKeyMap === keyMap && cachedReverseMap) return cachedReverseMap;
  cachedKeyMap = keyMap;
  cachedReverseMap = buildReverseMap(keyMap);
  return cachedReverseMap;
}

/** Combos that also run while typing in a text field (they don't edit text). */
const INPUT_SAFE_ACTIONS = new Set([
  "action.compose",
  "app.search",
  "app.commandPalette",
  "app.toggleSidebar",
  "app.fontBigger",
  "app.fontSmaller",
  "app.fontReset",
  "app.help",
  "app.syncFolder",
]);

/** Plain keys that also run while typing (function keys only). */
const INPUT_SAFE_KEYS = new Set(["F1", "F5"]);

/**
 * Global keyboard shortcuts handler (Superhuman-inspired).
 * Uses customizable key bindings from the shortcut store.
 */
export function useKeyboardShortcuts() {
  const pendingKeyRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Close context menu on Escape before any other handling
      if (e.key === "Escape" && useContextMenuStore.getState().menuType) {
        e.preventDefault();
        useContextMenuStore.getState().closeMenu();
        return;
      }
      if (e.isComposing) return;

      const target = e.target as HTMLElement;
      const isInputFocused =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      const keyMap = useShortcutStore.getState().keyMap;
      const { singleKey, twoKeySequences, combos } = getCachedReverseMap(keyMap);

      // Combos with modifiers (Ctrl+N, Shift+U, ...)
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
        for (const [id, binding] of combos) {
          if (!matchesKey(binding, e)) continue;
          const actionId = baseActionId(id);
          if (isInputFocused && !INPUT_SAFE_ACTIONS.has(actionId)) return;
          e.preventDefault();
          await executeAction(actionId);
          return;
        }
        // AltGr (ctrl+alt on Windows) types symbols like "?" and "#": let
        // those reach the single-key shortcuts below.
        const altGr = e.ctrlKey && e.altKey;
        if ((e.ctrlKey || e.metaKey || e.altKey) && !altGr) return;
      }

      // Function keys work even when a text field is focused
      const plainId = singleKey.get(e.key);
      if (plainId && INPUT_SAFE_KEYS.has(e.key)) {
        e.preventDefault();
        await executeAction(baseActionId(plainId));
        return;
      }

      // Don't process single-key shortcuts when typing
      if (isInputFocused) return;

      const key = e.key;

      // Handle two-key sequences (pending "g" key)
      if (pendingKeyRef.current === "g") {
        pendingKeyRef.current = null;
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
        const actionId = twoKeySequences.get(key);
        if (actionId) {
          e.preventDefault();
          await executeAction(baseActionId(actionId));
          return;
        }
      }

      // Check if "g" starts a two-key sequence
      if (key === "g" && twoKeySequences.size > 0) {
        pendingKeyRef.current = "g";
        pendingTimerRef.current = setTimeout(() => {
          pendingKeyRef.current = null;
        }, 1000);
        return;
      }

      // Arrow keys: when the reading pane is hidden and a thread is open,
      // ThreadView uses them to move between messages.
      if (key === "ArrowDown" || key === "ArrowUp") {
        const paneOff = useUIStore.getState().readingPanePosition === "hidden";
        if (paneOff && getSelectedThreadId()) return;
      }

      // Enter on a focused button must still click it
      if (key === "Enter" && (target.tagName === "BUTTON" || target.tagName === "A")) return;

      let actionId = singleKey.get(key);
      if (!actionId && (key === "Delete" || key === "Backspace")) {
        actionId = "action.delete";
      }
      if (actionId) {
        e.preventDefault();
        await executeAction(baseActionId(actionId));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}

const FONT_SCALES: FontScale[] = ["small", "default", "large", "xlarge"];

/** Move the text size one step (or back to default with 0). */
function stepFontScale(direction: -1 | 0 | 1): void {
  const ui = useUIStore.getState();
  if (direction === 0) {
    ui.setFontScale("default");
    return;
  }
  const idx = FONT_SCALES.indexOf(ui.fontScale);
  const next = FONT_SCALES[Math.max(0, Math.min(FONT_SCALES.length - 1, idx + direction))]!;
  ui.setFontScale(next);
}

/** Account that owns a thread (unified view can mix accounts in one list). */
function accountOf(threadId: string): string | null {
  return useThreadStore.getState().threadMap.get(threadId)?.accountId
    ?? useAccountStore.getState().activeAccountId;
}

async function executeAction(actionId: string): Promise<void> {
  const threads = useThreadStore.getState().threads;
  const selectedId = getSelectedThreadId();
  const currentIdx = threads.findIndex((t) => t.id === selectedId);
  const activeAccountId = useAccountStore.getState().activeAccountId;

  switch (actionId) {
    case "nav.next": {
      const nextIdx = Math.min(currentIdx + 1, threads.length - 1);
      if (threads[nextIdx]) {
        navigateToThread(threads[nextIdx].id);
      }
      break;
    }
    case "nav.prev": {
      const prevIdx = Math.max(currentIdx - 1, 0);
      if (threads[prevIdx]) {
        navigateToThread(threads[prevIdx].id);
      }
      break;
    }
    case "nav.open": {
      if (!selectedId && threads[0]) {
        navigateToThread(threads[0].id);
      }
      break;
    }
    case "nav.goInbox":
      navigateToLabel("inbox");
      break;
    case "nav.goStarred":
      navigateToLabel("starred");
      break;
    case "nav.goSent":
      navigateToLabel("sent");
      break;
    case "nav.goDrafts":
      navigateToLabel("drafts");
      break;
    case "nav.goPrimary":
      if (useUIStore.getState().inboxViewMode === "split") {
        navigateToLabel("inbox", { category: "Primary" });
      }
      break;
    case "nav.goUpdates":
      if (useUIStore.getState().inboxViewMode === "split") {
        navigateToLabel("inbox", { category: "Updates" });
      }
      break;
    case "nav.goPromotions":
      if (useUIStore.getState().inboxViewMode === "split") {
        navigateToLabel("inbox", { category: "Promotions" });
      }
      break;
    case "nav.goSocial":
      if (useUIStore.getState().inboxViewMode === "split") {
        navigateToLabel("inbox", { category: "Social" });
      }
      break;
    case "nav.goNewsletters":
      if (useUIStore.getState().inboxViewMode === "split") {
        navigateToLabel("inbox", { category: "Newsletters" });
      }
      break;
    case "nav.goTasks":
      navigateToLabel("tasks");
      break;
    case "nav.goAttachments":
      navigateToLabel("attachments");
      break;
    case "nav.escape": {
      if (useComposerStore.getState().isOpen) {
        useComposerStore.getState().closeComposer();
      } else if (useThreadStore.getState().selectedThreadIds.size > 0) {
        useThreadStore.getState().clearMultiSelect();
      } else if (selectedId) {
        navigateBack();
      }
      break;
    }
    case "action.compose":
      useComposerStore.getState().openComposer();
      break;
    case "action.undo":
      undoLastAction();
      break;
    case "action.toggleRead": {
      const ids = useThreadStore.getState().selectedThreadIds.size > 0
        ? [...useThreadStore.getState().selectedThreadIds]
        : selectedId ? [selectedId] : [];
      const anyUnread = ids.some((id) => !useThreadStore.getState().threadMap.get(id)?.isRead);
      for (const id of ids) {
        const acc = accountOf(id);
        if (acc) await markThreadRead(acc, id, [], anyUnread);
      }
      break;
    }
    case "action.reply": {
      if (selectedId) {
        const replyMode = useUIStore.getState().defaultReplyMode;
        window.dispatchEvent(new CustomEvent("velo-inline-reply", { detail: { mode: replyMode } }));
      }
      break;
    }
    case "action.replyAll":
      if (selectedId) {
        window.dispatchEvent(new CustomEvent("velo-inline-reply", { detail: { mode: "replyAll" } }));
      }
      break;
    case "action.forward":
      if (selectedId) {
        window.dispatchEvent(new CustomEvent("velo-inline-reply", { detail: { mode: "forward" } }));
      }
      break;
    case "action.archive": {
      const multiIds = useThreadStore.getState().selectedThreadIds;
      if (multiIds.size > 0 && activeAccountId) {
        const ids = [...multiIds];
        for (const id of ids) {
          await archiveThread(accountOf(id)!, id, []);
        }
      } else if (selectedId && activeAccountId) {
        await archiveThread(accountOf(selectedId)!, selectedId, []);
      }
      break;
    }
    case "action.delete": {
      const deleteLabelCtx = getActiveLabel();
      const isTrashView = deleteLabelCtx === "trash";
      const isDraftsView = deleteLabelCtx === "drafts";
      const multiDeleteIds = useThreadStore.getState().selectedThreadIds;
      if (multiDeleteIds.size > 0 && activeAccountId) {
        const ids = [...multiDeleteIds];
        for (const id of ids) {
          if (isTrashView) {
            await permanentDeleteThread(accountOf(id)!, id, []);
            await deleteThreadFromDb(accountOf(id)!, id);
          } else if (isDraftsView) {
            try {
              const acc = accountOf(id)!;
              const client = await getGmailClient(acc);
              await deleteDraftsForThread(client, acc, id);
              useThreadStore.getState().removeThread(id);
            } catch (err) {
              console.error("Draft delete failed:", err);
            }
          } else {
            await trashThread(accountOf(id)!, id, []);
          }
        }
      } else if (selectedId && activeAccountId) {
        if (isTrashView) {
          await permanentDeleteThread(accountOf(selectedId)!, selectedId, []);
          await deleteThreadFromDb(accountOf(selectedId)!, selectedId);
        } else if (isDraftsView) {
          try {
            const acc = accountOf(selectedId)!;
            const client = await getGmailClient(acc);
            await deleteDraftsForThread(client, acc, selectedId);
            useThreadStore.getState().removeThread(selectedId);
          } catch (err) {
            console.error("Draft delete failed:", err);
          }
        } else {
          await trashThread(accountOf(selectedId)!, selectedId, []);
        }
      }
      break;
    }
    case "action.star": {
      if (selectedId && activeAccountId) {
        const thread = threads.find((t) => t.id === selectedId);
        if (thread) {
          await starThread(accountOf(selectedId)!, selectedId, [], !thread.isStarred);
        }
      }
      break;
    }
    case "action.spam": {
      const isSpamView = getActiveLabel() === "spam";
      const multiSpamIds = useThreadStore.getState().selectedThreadIds;
      if (multiSpamIds.size > 0 && activeAccountId) {
        const ids = [...multiSpamIds];
        for (const id of ids) {
          await spamThread(accountOf(id)!, id, [], !isSpamView);
        }
      } else if (selectedId && activeAccountId) {
        await spamThread(accountOf(selectedId)!, selectedId, [], !isSpamView);
      }
      break;
    }
    case "action.pin": {
      if (selectedId && activeAccountId) {
        const thread = threads.find((t) => t.id === selectedId);
        if (thread) {
          const newPinned = !thread.isPinned;
          useThreadStore.getState().updateThread(selectedId, { isPinned: newPinned });
          try {
            if (newPinned) {
              await pinThreadDb(accountOf(selectedId)!, selectedId);
            } else {
              await unpinThreadDb(accountOf(selectedId)!, selectedId);
            }
          } catch (err) {
            console.error("Pin failed:", err);
            useThreadStore.getState().updateThread(selectedId, { isPinned: !newPinned });
          }
        }
      }
      break;
    }
    case "action.selectAll": {
      useThreadStore.getState().selectAll();
      break;
    }
    case "action.selectFromHere": {
      useThreadStore.getState().selectAllFromHere();
      break;
    }
    case "action.unsubscribe": {
      if (selectedId && activeAccountId) {
        try {
          const msgs = await getMessagesWithBodies(accountOf(selectedId)!, selectedId);
          const unsubMsg = msgs.find((m) => m.list_unsubscribe);
          if (unsubMsg) {
            const url = parseUnsubscribeUrl(unsubMsg.list_unsubscribe!);
            if (url) {
              await openUrl(url);
              await archiveThread(accountOf(selectedId)!, selectedId, []);
            }
          }
        } catch (err) {
          console.error("Unsubscribe failed:", err);
        }
      }
      break;
    }
    case "action.mute": {
      const multiMuteIds = useThreadStore.getState().selectedThreadIds;
      if (multiMuteIds.size > 0 && activeAccountId) {
        const ids = [...multiMuteIds];
        for (const id of ids) {
          const t = threads.find((thread) => thread.id === id);
          if (t?.isMuted) {
            await unmuteThreadDb(accountOf(id)!, id);
            useThreadStore.getState().updateThread(id, { isMuted: false });
          } else {
            await muteThreadDb(accountOf(id)!, id);
            await archiveThread(accountOf(id)!, id, []);
          }
        }
      } else if (selectedId && activeAccountId) {
        const thread = threads.find((t) => t.id === selectedId);
        if (thread) {
          if (thread.isMuted) {
            await unmuteThreadDb(accountOf(selectedId)!, selectedId);
            useThreadStore.getState().updateThread(selectedId, { isMuted: false });
          } else {
            await muteThreadDb(accountOf(selectedId)!, selectedId);
            await archiveThread(accountOf(selectedId)!, selectedId, []);
          }
        }
      }
      break;
    }
    case "action.createTaskFromEmail": {
      if (selectedId) {
        window.dispatchEvent(new CustomEvent("velo-extract-task", { detail: { threadId: selectedId } }));
      }
      break;
    }
    case "action.moveToFolder": {
      const multiMoveIds = useThreadStore.getState().selectedThreadIds;
      const moveThreadIds = multiMoveIds.size > 0 ? [...multiMoveIds] : selectedId ? [selectedId] : [];
      if (moveThreadIds.length > 0) {
        window.dispatchEvent(new CustomEvent("velo-move-to-folder", { detail: { threadIds: moveThreadIds } }));
      }
      break;
    }
    case "app.commandPalette":
      window.dispatchEvent(new Event("velo-toggle-command-palette"));
      break;
    case "app.search":
      window.dispatchEvent(new Event("velo-focus-search"));
      break;
    case "app.fontBigger":
      stepFontScale(1);
      break;
    case "app.fontSmaller":
      stepFontScale(-1);
      break;
    case "app.fontReset":
      stepFontScale(0);
      break;
    case "app.toggleSidebar":
      useUIStore.getState().toggleSidebar();
      break;
    case "app.askInbox":
      window.dispatchEvent(new Event("velo-toggle-ask-inbox"));
      break;
    case "app.help":
      window.dispatchEvent(new Event("velo-toggle-shortcuts-help"));
      break;
    case "app.syncFolder": {
      if (activeAccountId) {
        const currentLabel = getActiveLabel();
        useUIStore.getState().setSyncingFolder(currentLabel);
        triggerSync([activeAccountId]);
      }
      break;
    }
  }
}
