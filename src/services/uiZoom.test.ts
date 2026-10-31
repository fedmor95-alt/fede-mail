import { describe, it, expect, vi } from "vitest";

vi.mock("@tauri-apps/api/webview", () => ({ getCurrentWebview: () => ({ setZoom: vi.fn() }) }));
vi.mock("./db/settings", () => ({ getSetting: vi.fn(), setSetting: vi.fn() }));

import { parseUiZoom, stepUiZoomLevel } from "./uiZoom";

describe("parseUiZoom", () => {
  it("accepts the offered levels", () => {
    expect(parseUiZoom("0.9")).toBe(0.9);
    expect(parseUiZoom("1.25")).toBe(1.25);
  });

  it("falls back to 100% for missing or unknown values", () => {
    expect(parseUiZoom(null)).toBe(1);
    expect(parseUiZoom("abc")).toBe(1);
    expect(parseUiZoom("3")).toBe(1);
  });
});

describe("stepUiZoomLevel", () => {
  it("moves one level up or down", () => {
    expect(stepUiZoomLevel(1, 1)).toBe(1.1);
    expect(stepUiZoomLevel(1, -1)).toBe(0.9);
  });

  it("stays put at either end", () => {
    expect(stepUiZoomLevel(1.5, 1)).toBe(1.5);
    expect(stepUiZoomLevel(0.8, -1)).toBe(0.8);
  });
});
