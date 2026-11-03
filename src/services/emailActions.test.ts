import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies
vi.mock("@/stores/uiStore", () => ({
  useUIStore: {
    getState: vi.fn(() => ({ isOnline: true })),
  },
}));

vi.mock("@/stores/threadStore", () => ({
  useThreadStore: {
    getState: vi.fn(() => ({
      updateThread: vi.fn(),
      removeThread: vi.fn(),
    })),
  },
  clearPendingRemovals: vi.fn(),
}));

vi.mock("@/services/email/providerFactory", () => ({
  getEmailProvider: vi.fn(),
}));

vi.mock("@/services/db/pendingOperations", () => ({
  enqueuePendingOperation: vi.fn(() => Promise.resolve("op-1")),
}));

vi.mock("@/services/db/connection", () => ({
  getDb: vi.fn(() =>
    Promise.resolve({
      execute: vi.fn(() => Promise.resolve()),
      select: vi.fn(() => Promise.resolve([])),
    }),
  ),
}));

vi.mock("@/router/navigate", () => ({
  navigateToThread: vi.fn(),
  getSelectedThreadId: vi.fn(() => null),
}));

import { useUIStore } from "@/stores/uiStore";
import { useThreadStore } from "@/stores/threadStore";
import { useAccountStore } from "@/stores/accountStore";
import { getEmailProvider } from "@/services/email/providerFactory";
import { enqueuePendingOperation } from "@/services/db/pendingOperations";
import {
  archiveThread,
  flushPendingUndo,
  trashThread,
  permanentDeleteThread,
  starThread,
  markThreadRead,
  spamThread,
  moveThread,
  executeEmailAction,
  undoLastAction,
  recordUndo,
  _resetUndoForTesting,
} from "./emailActions";
import { navigateToThread, getSelectedThreadId } from "@/router/navigate";
import { createMockEmailProvider, createMockUIStoreState, createMockThreadStoreState } from "@/test/mocks";

const mockProvider = createMockEmailProvider();

const mockUpdateThread = vi.fn();
const mockRemoveThread = vi.fn();

describe("emailActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEmailProvider).mockResolvedValue(mockProvider as never);
    vi.mocked(useUIStore.getState).mockReturnValue(createMockUIStoreState() as never);
    vi.mocked(useThreadStore.getState).mockReturnValue(createMockThreadStoreState({
      updateThread: mockUpdateThread,
      removeThread: mockRemoveThread,
    }) as never);
  });

  describe("undo after the undo window", () => {
    const account = (id: string, provider: string) =>
      ({ id, email: `${id}@test.com`, displayName: null, avatarUrl: null, isActive: false, provider });

    beforeEach(() => {
      _resetUndoForTesting();
      useAccountStore.setState({ accounts: [account("gmail", "gmail_api"), account("imap", "imap")] });
    });

    it("puts a committed Gmail archive back in the inbox", async () => {
      await archiveThread("gmail", "t1", []);
      await flushPendingUndo();
      expect(mockProvider.archive).toHaveBeenCalled();

      expect(undoLastAction()).toBe(true);
      await vi.waitFor(() => expect(mockProvider.addLabel).toHaveBeenCalledWith("t1", "INBOX"));
      expect(mockProvider.removeLabel).not.toHaveBeenCalled();
    });

    it("takes a committed Gmail delete out of the trash", async () => {
      await trashThread("gmail", "t1", []);
      await flushPendingUndo();

      expect(undoLastAction()).toBe(true);
      await vi.waitFor(() => expect(mockProvider.removeLabel).toHaveBeenCalledWith("t1", "TRASH"));
      expect(mockProvider.addLabel).toHaveBeenCalledWith("t1", "INBOX");
    });

    it("undoes the latest action first", async () => {
      const older = vi.fn(() => Promise.resolve());
      const newer = vi.fn(() => Promise.resolve());
      recordUndo(older);
      recordUndo(newer);

      undoLastAction();
      expect(newer).toHaveBeenCalledTimes(1);
      expect(older).not.toHaveBeenCalled();
    });

    it("undoes separate archives one at a time, newest first", async () => {
      vi.useFakeTimers();
      try {
        await archiveThread("gmail", "t1", []);
        vi.advanceTimersByTime(1000);
        await archiveThread("gmail", "t2", []);

        expect(undoLastAction()).toBe(true);
        await flushPendingUndo();
        // Only t1 is committed; t2 was dropped before reaching the server
        expect(mockProvider.archive).toHaveBeenCalledTimes(1);
        expect(mockProvider.archive).toHaveBeenCalledWith("t1", expect.anything());
      } finally {
        vi.useRealTimers();
      }
    });

    it("undoes a multi-selection archive as one action", async () => {
      await Promise.all([archiveThread("gmail", "t1", []), archiveThread("gmail", "t2", [])]);

      expect(undoLastAction()).toBe(true);
      await flushPendingUndo();
      expect(mockProvider.archive).not.toHaveBeenCalled();
      expect(undoLastAction()).toBe(false);
    });

    it("undoes the latest star instead of an older archive", async () => {
      await archiveThread("gmail", "t1", []);
      await flushPendingUndo();
      await new Promise((r) => setTimeout(r, 450));
      await starThread("gmail", "t2", [], true);

      expect(undoLastAction()).toBe(true);
      await vi.waitFor(() => expect(mockProvider.star).toHaveBeenLastCalledWith("t2", expect.anything(), false));
      expect(mockProvider.addLabel).not.toHaveBeenCalled();
    });

    it("skips automatic actions such as mark-as-read on open", async () => {
      const older = vi.fn(() => Promise.resolve());
      recordUndo(older);
      await markThreadRead("gmail", "t1", [], true, { undoable: false });

      undoLastAction();
      expect(older).toHaveBeenCalledTimes(1);
    });

    it("never reverts an older action when the latest cannot be undone (IMAP)", async () => {
      const older = vi.fn(() => Promise.resolve());
      recordUndo(older);
      await archiveThread("imap", "t2", []);
      await flushPendingUndo();

      expect(undoLastAction()).toBe(false);
      expect(older).not.toHaveBeenCalled();
      expect(mockProvider.addLabel).not.toHaveBeenCalled();
    });
  });

  describe("online execution", () => {
    it("archives a thread via provider", async () => {
      await archiveThread("acct-1", "t1", ["m1"]);
      const [result] = await flushPendingUndo();
      expect(result.success).toBe(true);
      expect(result.queued).toBeUndefined();
      expect(mockRemoveThread).toHaveBeenCalledWith("t1");
      expect(mockProvider.archive).toHaveBeenCalledWith("t1", ["m1"]);
    });

    it("trashes a thread via provider", async () => {
      await trashThread("acct-1", "t1", ["m1"]);
      const [result] = await flushPendingUndo();
      expect(result.success).toBe(true);
      expect(mockProvider.trash).toHaveBeenCalledWith("t1", ["m1"]);
    });

    it("stars a thread via provider", async () => {
      const result = await starThread("acct-1", "t1", ["m1"], true);
      expect(result.success).toBe(true);
      expect(mockUpdateThread).toHaveBeenCalledWith("t1", { isStarred: true });
      expect(mockProvider.star).toHaveBeenCalledWith("t1", ["m1"], true);
    });

    it("marks thread read via provider", async () => {
      const result = await markThreadRead("acct-1", "t1", ["m1"], true);
      expect(result.success).toBe(true);
      expect(mockUpdateThread).toHaveBeenCalledWith("t1", { isRead: true });
      expect(mockProvider.markRead).toHaveBeenCalledWith("t1", ["m1"], true);
    });

    it("reports spam via provider", async () => {
      const result = await spamThread("acct-1", "t1", ["m1"], true);
      expect(result.success).toBe(true);
      expect(mockRemoveThread).toHaveBeenCalledWith("t1");
      expect(mockProvider.spam).toHaveBeenCalledWith("t1", ["m1"], true);
    });
  });

  describe("offline queueing", () => {
    beforeEach(() => {
      vi.mocked(useUIStore.getState).mockReturnValue({ isOnline: false } as never);
    });

    it("queues archive when offline", async () => {
      await archiveThread("acct-1", "t1", ["m1"]);
      const [result] = await flushPendingUndo();
      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
      expect(mockProvider.archive).not.toHaveBeenCalled();
      expect(enqueuePendingOperation).toHaveBeenCalledWith(
        "acct-1",
        "archive",
        "t1",
        expect.objectContaining({ threadId: "t1", messageIds: ["m1"] }),
      );
    });

    it("still applies optimistic UI update when offline", async () => {
      await starThread("acct-1", "t1", ["m1"], true);
      expect(mockUpdateThread).toHaveBeenCalledWith("t1", { isStarred: true });
    });
  });

  describe("network error → queue fallback", () => {
    it("queues on retryable network error", async () => {
      vi.mocked(useUIStore.getState).mockReturnValue({ isOnline: true } as never);
      mockProvider.archive.mockRejectedValueOnce(new Error("Failed to fetch"));

      await archiveThread("acct-1", "t1", ["m1"]);

      const [result] = await flushPendingUndo();
      expect(result.success).toBe(true);
      expect(result.queued).toBe(true);
      expect(enqueuePendingOperation).toHaveBeenCalled();
    });
  });

  describe("permanent error → revert", () => {
    it("reverts star on permanent error", async () => {
      vi.mocked(useUIStore.getState).mockReturnValue({ isOnline: true } as never);
      mockProvider.star.mockRejectedValueOnce(new Error("Invalid request"));

      const result = await starThread("acct-1", "t1", ["m1"], true);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      // Revert: set starred to false
      expect(mockUpdateThread).toHaveBeenCalledWith("t1", { isStarred: false });
    });

    it("reverts markRead on permanent error", async () => {
      vi.mocked(useUIStore.getState).mockReturnValue({ isOnline: true } as never);
      mockProvider.markRead.mockRejectedValueOnce(new Error("Bad request"));

      const result = await markThreadRead("acct-1", "t1", ["m1"], true);
      expect(result.success).toBe(false);
      // Revert: set read to false
      expect(mockUpdateThread).toHaveBeenCalledWith("t1", { isRead: false });
    });
  });

  describe("auto-advance after removal", () => {
    const threads = [
      { id: "t1" },
      { id: "t2" },
      { id: "t3" },
    ];

    it("navigates to next thread when archiving the viewed thread", async () => {
      vi.mocked(getSelectedThreadId).mockReturnValue("t2");
      vi.mocked(useThreadStore.getState).mockReturnValue(createMockThreadStoreState({
        threads,
        updateThread: mockUpdateThread,
        removeThread: mockRemoveThread,
      }) as never);

      await archiveThread("acct-1", "t2", ["m1"]);

      await flushPendingUndo();
      expect(navigateToThread).toHaveBeenCalledWith("t3");
    });

    it("navigates to previous thread when archiving the last thread", async () => {
      vi.mocked(getSelectedThreadId).mockReturnValue("t3");
      vi.mocked(useThreadStore.getState).mockReturnValue(createMockThreadStoreState({
        threads,
        updateThread: mockUpdateThread,
        removeThread: mockRemoveThread,
      }) as never);

      await archiveThread("acct-1", "t3", ["m1"]);

      await flushPendingUndo();
      expect(navigateToThread).toHaveBeenCalledWith("t2");
    });

    it("does not navigate when archiving a non-viewed thread", async () => {
      vi.mocked(getSelectedThreadId).mockReturnValue("t1");
      vi.mocked(useThreadStore.getState).mockReturnValue(createMockThreadStoreState({
        threads,
        updateThread: mockUpdateThread,
        removeThread: mockRemoveThread,
      }) as never);

      await archiveThread("acct-1", "t2", ["m1"]);

      await flushPendingUndo();
      expect(navigateToThread).not.toHaveBeenCalled();
    });

    it("does not navigate when archiving the only thread", async () => {
      vi.mocked(getSelectedThreadId).mockReturnValue("t1");
      vi.mocked(useThreadStore.getState).mockReturnValue(createMockThreadStoreState({
        threads: [{ id: "t1" }],
        updateThread: mockUpdateThread,
        removeThread: mockRemoveThread,
      }) as never);

      await archiveThread("acct-1", "t1", ["m1"]);

      await flushPendingUndo();
      expect(navigateToThread).not.toHaveBeenCalled();
    });

    it("navigates on trash action", async () => {
      vi.mocked(getSelectedThreadId).mockReturnValue("t1");
      vi.mocked(useThreadStore.getState).mockReturnValue(createMockThreadStoreState({
        threads,
        updateThread: mockUpdateThread,
        removeThread: mockRemoveThread,
      }) as never);

      await trashThread("acct-1", "t1", ["m1"]);

      await flushPendingUndo();
      expect(navigateToThread).toHaveBeenCalledWith("t2");
    });

    it("navigates on spam action", async () => {
      vi.mocked(getSelectedThreadId).mockReturnValue("t1");
      vi.mocked(useThreadStore.getState).mockReturnValue(createMockThreadStoreState({
        threads,
        updateThread: mockUpdateThread,
        removeThread: mockRemoveThread,
      }) as never);

      await spamThread("acct-1", "t1", ["m1"], true);
      expect(navigateToThread).toHaveBeenCalledWith("t2");
    });

    it("navigates on permanentDelete action", async () => {
      vi.mocked(getSelectedThreadId).mockReturnValue("t2");
      vi.mocked(useThreadStore.getState).mockReturnValue(createMockThreadStoreState({
        threads,
        updateThread: mockUpdateThread,
        removeThread: mockRemoveThread,
      }) as never);

      await permanentDeleteThread("acct-1", "t2", ["m1"]);
      expect(navigateToThread).toHaveBeenCalledWith("t3");
    });

    it("navigates on moveToFolder action", async () => {
      vi.mocked(getSelectedThreadId).mockReturnValue("t2");
      vi.mocked(useThreadStore.getState).mockReturnValue(createMockThreadStoreState({
        threads,
        updateThread: mockUpdateThread,
        removeThread: mockRemoveThread,
      }) as never);

      await moveThread("acct-1", "t2", ["m1"], "Archive");
      expect(navigateToThread).toHaveBeenCalledWith("t3");
    });
  });

  describe("executeEmailAction with draft actions", () => {
    it("sends a message via provider", async () => {
      const result = await executeEmailAction("acct-1", {
        type: "sendMessage",
        rawBase64Url: "base64data",
        threadId: "t1",
      });
      expect(result.success).toBe(true);
      expect(mockProvider.sendMessage).toHaveBeenCalledWith("base64data", "t1");
    });

    it("creates a draft via provider", async () => {
      const result = await executeEmailAction("acct-1", {
        type: "createDraft",
        rawBase64Url: "base64data",
      });
      expect(result.success).toBe(true);
      expect(mockProvider.createDraft).toHaveBeenCalledWith("base64data", undefined);
    });
  });
});
