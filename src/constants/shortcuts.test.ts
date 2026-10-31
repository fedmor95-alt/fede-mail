import { describe, it, expect } from "vitest";
import { SHORTCUTS, getDefaultKeyMap, formatShortcut } from "./shortcuts";

describe("SHORTCUTS", () => {
  it("has at least 3 categories (Navigation, Actions, App)", () => {
    expect(SHORTCUTS.length).toBeGreaterThanOrEqual(3);

    const categoryNames = SHORTCUTS.map((c) => c.category);
    expect(categoryNames).toContain("Navigazione");
    expect(categoryNames).toContain("Azioni");
    expect(categoryNames).toContain("App");
  });

  it("each category has items with keys and desc", () => {
    for (const category of SHORTCUTS) {
      expect(category.category).toBeDefined();
      expect(category.items.length).toBeGreaterThan(0);

      for (const item of category.items) {
        expect(item).toHaveProperty("id");
        expect(item).toHaveProperty("keys");
        expect(item).toHaveProperty("desc");
      }
    }
  });

  it("all shortcuts have non-empty id, keys and descriptions", () => {
    for (const category of SHORTCUTS) {
      for (const item of category.items) {
        expect(item.id.trim().length).toBeGreaterThan(0);
        expect(item.keys.trim().length).toBeGreaterThan(0);
        expect(item.desc.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("all shortcut IDs are unique", () => {
    const ids = SHORTCUTS.flatMap((c) => c.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getDefaultKeyMap returns map of all shortcuts", () => {
    const map = getDefaultKeyMap();
    const allIds = SHORTCUTS.flatMap((c) => c.items.map((i) => i.id));
    for (const id of allIds) {
      expect(map[id]).toBeDefined();
    }
  });
});

describe("formatShortcut", () => {
  it("leaves bindings untouched outside macOS", () => {
    expect(formatShortcut("Ctrl+Shift+R", false)).toBe("Ctrl+Shift+R");
    expect(formatShortcut("CmdOrCtrl+Shift+M", false)).toBe("CmdOrCtrl+Shift+M");
  });

  it("uses the Apple notation on macOS", () => {
    expect(formatShortcut("Ctrl+N", true)).toBe("⌘N");
    expect(formatShortcut("Ctrl+Shift+R", true)).toBe("⇧⌘R");
    expect(formatShortcut("Ctrl+Shift++", true)).toBe("⇧⌘+");
    expect(formatShortcut("Ctrl+Shift+-", true)).toBe("⇧⌘-");
    expect(formatShortcut("Ctrl+Enter", true)).toBe("⌘↩");
    expect(formatShortcut("CmdOrCtrl+Shift+M", true)).toBe("⇧⌘M");
    expect(formatShortcut("Shift+U", true)).toBe("⇧U");
  });

  it("keeps plain keys and sequences readable on macOS", () => {
    expect(formatShortcut("j", true)).toBe("j");
    expect(formatShortcut("?", true)).toBe("?");
    expect(formatShortcut("g then i", true)).toBe("g then i");
    expect(formatShortcut("Backspace", true)).toBe("⌫");
  });
});
