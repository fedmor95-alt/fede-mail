import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { getSetting } from "@/services/db/settings";
import { UI_ZOOM_LEVELS, UI_ZOOM_SETTING, parseUiZoom, setUiZoom, stepUiZoomLevel } from "@/services/uiZoom";

const isMac = navigator.userAgent.includes("Macintosh");

/** "Dimensione interfaccia": zooms the whole app, not just the text. */
export function UiZoomSelect() {
  const [level, setLevel] = useState(1);

  useEffect(() => {
    getSetting(UI_ZOOM_SETTING).then((v) => setLevel(parseUiZoom(v))).catch(() => {});
    // Keep in sync with the Ctrl +/- shortcuts
    const onZoom = (e: Event) => setLevel((e as CustomEvent<number>).detail);
    window.addEventListener("velo-ui-zoom", onZoom);
    return () => window.removeEventListener("velo-ui-zoom", onZoom);
  }, []);

  const apply = (next: number) => {
    setLevel(next);
    setUiZoom(next).catch(() => {});
  };

  const stepButton = "p-1.5 rounded-md border border-border-primary bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-hover disabled:opacity-40 disabled:pointer-events-none transition-colors";
  const mod = isMac ? "⌘" : "Ctrl";

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => apply(stepUiZoomLevel(level, -1))}
        disabled={level === UI_ZOOM_LEVELS[0]}
        className={stepButton}
        title={`Rimpicciolisci (${mod} −)`}
        aria-label="Rimpicciolisci"
      >
        <Minus size={14} />
      </button>
      <select
        value={String(level)}
        onChange={(e) => apply(parseUiZoom(e.target.value))}
        className="w-32 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
      >
        {UI_ZOOM_LEVELS.map((z) => (
          <option key={z} value={String(z)}>
            {Math.round(z * 100)}%{z === 1 ? " (predefinita)" : ""}
          </option>
        ))}
      </select>
      <button
        onClick={() => apply(stepUiZoomLevel(level, 1))}
        disabled={level === UI_ZOOM_LEVELS[UI_ZOOM_LEVELS.length - 1]}
        className={stepButton}
        title={`Ingrandisci (${mod} +)`}
        aria-label="Ingrandisci"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
