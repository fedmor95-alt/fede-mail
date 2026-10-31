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
  currentZoom = level;
  if (level !== 1) await setWebviewZoom(level);
  return level;
}

/** Next level up or down from `current`; stays put at either end. */
export function stepUiZoomLevel(current: number, dir: 1 | -1): number {
  const levels = UI_ZOOM_LEVELS as readonly number[];
  const i = levels.indexOf(parseUiZoom(String(current)));
  return levels[Math.min(levels.length - 1, Math.max(0, i + dir))] ?? 1;
}

let currentZoom = 1;

/**
 * Ctrl/Cmd + "+" / "-" / "0" change the interface size from anywhere.
 * Doesn't touch the DB: the level comes from initUiZoom/setUiZoom.
 * Returns the cleanup function.
 */
export function initUiZoomShortcuts(): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    let next: number | null = null;
    if (e.key === "+" || e.key === "=") next = stepUiZoomLevel(currentZoom, 1);
    else if (e.key === "-" || e.key === "_") next = stepUiZoomLevel(currentZoom, -1);
    else if (e.key === "0") next = 1;
    if (next === null) return;
    e.preventDefault();
    if (next !== currentZoom) setUiZoom(next).catch(() => {});
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}

export async function setUiZoom(level: number): Promise<void> {
  const value = parseUiZoom(String(level));
  currentZoom = value;
  await setWebviewZoom(value);
  await setSetting(UI_ZOOM_SETTING, String(value));
  window.dispatchEvent(new CustomEvent("velo-ui-zoom", { detail: value }));
}
