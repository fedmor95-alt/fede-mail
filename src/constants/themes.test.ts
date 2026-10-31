import { describe, it, expect, vi } from "vitest";
import {
  COLOR_THEMES,
  DEFAULT_COLOR_THEME,
  getThemeById,
} from "./themes";

describe("themes", () => {
  it("all themes have unique IDs", () => {
    const ids = COLOR_THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all themes have complete light and dark color sets", () => {
    const requiredKeys = ["bgPrimary", "textPrimary", "accent", "accentHover", "accentLight", "bgSelected", "sidebarBg"];
    for (const theme of COLOR_THEMES) {
      for (const key of requiredKeys) {
        expect(theme.light).toHaveProperty(key);
        expect(theme.light[key as keyof typeof theme.light]).toBeTruthy();
        expect(theme.dark).toHaveProperty(key);
        expect(theme.dark[key as keyof typeof theme.dark]).toBeTruthy();
      }
    }
  });

  it("DEFAULT_COLOR_THEME is windows outside macOS", () => {
    expect(DEFAULT_COLOR_THEME).toBe("windows");
  });

  it("DEFAULT_COLOR_THEME is mail on macOS", async () => {
    const ua = vi
      .spyOn(navigator, "userAgent", "get")
      .mockReturnValue("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15");
    vi.resetModules();
    const fresh = await import("./themes");
    expect(fresh.DEFAULT_COLOR_THEME).toBe("mail");
    ua.mockRestore();
  });

  it("getThemeById returns correct theme", () => {
    const carta = getThemeById("carta");
    expect(carta.id).toBe("carta");
    expect(carta.name).toBe("Carta");
  });

  it("getThemeById falls back to mail for unknown ID", () => {
    const fallback = getThemeById("nonexistent");
    expect(fallback.id).toBe("windows");
  });
});
