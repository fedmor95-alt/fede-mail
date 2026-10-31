/**
 * True when the app runs on macOS. WKWebView's user agent always contains
 * "Macintosh", so this works before any Tauri plugin is ready.
 */
export function isMac(): boolean {
  return typeof navigator !== "undefined" && navigator.userAgent.includes("Macintosh");
}
