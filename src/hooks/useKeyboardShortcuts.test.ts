import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies needed for the hook to mount and dispatch events.
// The hook reads store state and calls navigate/emailActions — only mock
// what's needed for the three event-dispatch tests below.
vi.mock("@/stores/uiStore", () => ({
  useUIStore: { getState: () => ({ inboxViewMode: "unified", toggleSidebar: vi.fn() }) },
}));
vi.mock("@/stores/threadStore", () => ({
  useThreadStore: {
    getState: () => ({
      threads: [],
      threadMap: new Map(),
      selectedThreadIds: new Set(),
      removeThread: vi.fn(),
      removeThreads: vi.fn(),
      updateThread: vi.fn(),
      clearMultiSelect: vi.fn(),
      selectAll: vi.fn(),
      selectAllFromHere: vi.fn(),
    }),
  },
}));
vi.mock("@/stores/composerStore", () => ({
  useComposerStore: { getState: () => ({ isOpen: false, openComposer: vi.fn(), closeComposer: vi.fn() }) },
}));
vi.mock("@/stores/accountStore", () => ({
  useAccountStore: { getState: () => ({ activeAccountId: null }) },
}));
vi.mock("@/stores/shortcutStore", async () => {
  const { getDefaultKeyMap } = await import("@/constants/shortcuts");
  const keyMap = getDefaultKeyMap();
  return { useShortcutStore: { getState: () => ({ keyMap }) } };
});
vi.mock("@/stores/contextMenuStore", () => ({
  useContextMenuStore: { getState: () => ({ menuType: null, closeMenu: vi.fn() }) },
}));
vi.mock("@/router/navigate", () => ({
  navigateToLabel: vi.fn(),
  navigateToThread: vi.fn(),
  navigateBack: vi.fn(),
  getActiveLabel: () => "inbox",
  getSelectedThreadId: () => null,
}));
vi.mock("@/services/emailActions", () => ({
  archiveThread: vi.fn(),
  trashThread: vi.fn(),
  permanentDeleteThread: vi.fn(),
  starThread: vi.fn(),
  spamThread: vi.fn(),
  markThreadRead: vi.fn(),
  undoLastAction: vi.fn(),
}));
vi.mock("@/services/db/threads", () => ({
  deleteThread: vi.fn(),
  pinThread: vi.fn(),
  unpinThread: vi.fn(),
  muteThread: vi.fn(),
  unmuteThread: vi.fn(),
}));
vi.mock("@/services/gmail/draftDeletion", () => ({ deleteDraftsForThread: vi.fn() }));
vi.mock("@/services/gmail/tokenManager", () => ({ getGmailClient: vi.fn() }));
vi.mock("@/services/db/messages", () => ({ getMessagesForThread: vi.fn() }));
vi.mock("@/components/email/MessageItem", () => ({ parseUnsubscribeUrl: vi.fn() }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));
vi.mock("@/services/gmail/syncManager", () => ({ triggerSync: vi.fn() }));

import { renderHook } from "@testing-library/react";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("dispatches velo-toggle-ask-inbox when 'i' is pressed", () => {
    renderHook(() => useKeyboardShortcuts());

    const listener = vi.fn();
    window.addEventListener("velo-toggle-ask-inbox", listener);

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "i", bubbles: true }),
    );

    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("velo-toggle-ask-inbox", listener);
  });

  it("dispatches velo-focus-search when '/' is pressed", () => {
    renderHook(() => useKeyboardShortcuts());

    const listener = vi.fn();
    window.addEventListener("velo-focus-search", listener);

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "/", bubbles: true }),
    );

    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("velo-focus-search", listener);
  });

  it("dispatches velo-focus-search for Ctrl+F, also inside a text field", () => {
    renderHook(() => useKeyboardShortcuts());

    const listener = vi.fn();
    window.addEventListener("velo-focus-search", listener);
    const input = document.createElement("input");
    document.body.appendChild(input);

    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "f", ctrlKey: true, bubbles: true }),
    );

    expect(listener).toHaveBeenCalledTimes(1);

    input.remove();
    window.removeEventListener("velo-focus-search", listener);
  });

  it("dispatches velo-toggle-command-palette for Ctrl+K", () => {
    renderHook(() => useKeyboardShortcuts());

    const listener = vi.fn();
    window.addEventListener("velo-toggle-command-palette", listener);

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
    );

    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("velo-toggle-command-palette", listener);
  });

  it("ignores Ctrl+A inside a text field (text selection wins)", () => {
    renderHook(() => useKeyboardShortcuts());

    const input = document.createElement("input");
    document.body.appendChild(input);
    const ev = new KeyboardEvent("keydown", { key: "a", ctrlKey: true, bubbles: true, cancelable: true });
    input.dispatchEvent(ev);

    expect(ev.defaultPrevented).toBe(false);
    input.remove();
  });

  it("accepts '?' typed with AltGr (ctrl+alt on Windows)", () => {
    renderHook(() => useKeyboardShortcuts());

    const listener = vi.fn();
    window.addEventListener("velo-toggle-shortcuts-help", listener);

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "?", ctrlKey: true, altKey: true, bubbles: true }),
    );

    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("velo-toggle-shortcuts-help", listener);
  });

  it("dispatches velo-toggle-shortcuts-help when '?' is pressed", () => {
    renderHook(() => useKeyboardShortcuts());

    const listener = vi.fn();
    window.addEventListener("velo-toggle-shortcuts-help", listener);

    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "?", shiftKey: true, bubbles: true }),
    );

    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener("velo-toggle-shortcuts-help", listener);
  });
});
