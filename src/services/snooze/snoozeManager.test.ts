import { describe, it, expect, vi, beforeEach } from "vitest";

const execute = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock("@/services/db/connection", () => ({
  getDb: vi.fn(() => Promise.resolve({ execute, select: vi.fn(() => Promise.resolve([])) })),
  withTransaction: vi.fn((fn: (db: unknown) => Promise<void>) => fn({ execute })),
}));

const threadMap = new Map<string, { accountId: string }>();
vi.mock("@/stores/threadStore", () => ({
  useThreadStore: { getState: () => ({ threadMap }) },
  clearPendingRemovals: vi.fn(),
}));

import { snoozeThread } from "./snoozeManager";
import { undoLastAction, _resetUndoForTesting } from "@/services/emailActions";

function sqlCalls(): [string, unknown[]][] {
  return execute.mock.calls.map((c) => [c[0] as string, c[1] as unknown[]]);
}

describe("snoozeThread", () => {
  beforeEach(() => {
    execute.mockClear();
    threadMap.clear();
    _resetUndoForTesting();
  });

  it("snoozes the thread on its own account in the unified inbox", async () => {
    threadMap.set("t1", { accountId: "acc-b" });
    await snoozeThread("acc-a", "t1", 1_800_000_000);

    const update = sqlCalls().find(([sql]) => sql.startsWith("UPDATE threads SET is_snoozed = 1"));
    expect(update?.[1]).toEqual([1_800_000_000, "acc-b", "t1"]);
    for (const [, params] of sqlCalls()) expect(params).not.toContain("acc-a");
  });

  it("falls back to the given account when the thread is not in the list", async () => {
    await snoozeThread("acc-a", "t1", 1_800_000_000);
    const update = sqlCalls().find(([sql]) => sql.startsWith("UPDATE threads SET is_snoozed = 1"));
    expect(update?.[1]).toEqual([1_800_000_000, "acc-a", "t1"]);
  });

  it("can be undone with Ctrl+Z: the thread wakes up in the inbox", async () => {
    threadMap.set("t1", { accountId: "acc-b" });
    await snoozeThread("acc-a", "t1", 1_800_000_000);
    execute.mockClear();

    expect(undoLastAction()).toBe(true);
    await vi.waitFor(() => {
      expect(sqlCalls()).toContainEqual([
        "UPDATE threads SET is_snoozed = 0, snooze_until = NULL WHERE account_id = $1 AND id = $2",
        ["acc-b", "t1"],
      ]);
      expect(sqlCalls()).toContainEqual([
        "INSERT OR IGNORE INTO thread_labels (account_id, thread_id, label_id) VALUES ($1, $2, 'INBOX')",
        ["acc-b", "t1"],
      ]);
    });
  });
});
