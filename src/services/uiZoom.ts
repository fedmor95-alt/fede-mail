import { getCurrentWebview } from "@tauri-apps/api/webview";
import { getSetting, setSetting } from "./db/settings";

/**
 * Interface size: zooms the whole webview (text, icons, spacing and the
 * email bodies), unlike the font-size setting which only scales text.
 * Stored in settings as "ui_zoom" and applied in every window at startup.
 */
export const UI_ZOOM_LEVELS = [0.8, 0.9, 1, 1.1, 1.25, 1.5] as const;
export const UI_ZOOM_SETTING = "ui_zoom";

export function parseUiZoom(value: string | null | undefined): number {
  const n = Number(value);
  return (UI_ZOOM_LEVELS as readonly number[]).includes(n) ? n : 1;
}

async function setWebviewZoom(level: number): Promise<void> {
  try {
    await getCurrentWebview().setZoom(level);
  } catch (err) {
    console.warn("[uiZoom] setZoom failed:", err);
  }
}

export async function initUiZoom(): Promise<number> {
  const level = parseUiZoom(await getSetting(UI_ZOOM_SETTING).catch(() => null));
  if (level !== 1) await setWebviewZoom(level);
  return level;
}

export async function setUiZoom(level: number): Promise<void> {
  const value = parseUiZoom(String(level));
  await setWebviewZoom(value);
  await setSetting(UI_ZOOM_SETTING, String(value));
  window.dispatchEvent(new CustomEvent("velo-ui-zoom", { detail: value }));
}
