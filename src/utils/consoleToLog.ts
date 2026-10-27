import { invoke } from "@tauri-apps/api/core";

/**
 * Mirror console warnings/errors (and sync progress lines) into the Rust log
 * file (%LOCALAPPDATA%\com.velomail.app\logs\Velo.log), since release builds
 * have no devtools.
 */
const LEVEL = { info: 3, warn: 4, error: 5 } as const;

function stringify(args: unknown[]): string {
  return args
    .map((a) => (a instanceof Error ? `${a.message}${a.stack ? `\n${a.stack}` : ""}` : typeof a === "string" ? a : safeJson(a)))
    .join(" ")
    .slice(0, 4000);
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function installConsoleToLog(): void {
  if (!("__TAURI_INTERNALS__" in window)) return;
  for (const level of ["warn", "error", "info"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      invoke("plugin:log|log", { level: LEVEL[level], message: stringify(args), location: "webview" }).catch(() => {});
    };
  }
  const originalLog = console.log.bind(console);
  console.log = (...args: unknown[]) => {
    originalLog(...args);
    if (typeof args[0] === "string" && /^\[(syncManager|push|imapSync|search|bodies)\]/.test(args[0])) {
      invoke("plugin:log|log", { level: LEVEL.info, message: stringify(args), location: "webview" }).catch(() => {});
    }
  };
  window.addEventListener("unhandledrejection", (e) => console.error("Unhandled rejection:", e.reason));
}
