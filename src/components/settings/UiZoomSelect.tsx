import { useEffect, useState } from "react";
import { getSetting } from "@/services/db/settings";
import { UI_ZOOM_LEVELS, UI_ZOOM_SETTING, parseUiZoom, setUiZoom } from "@/services/uiZoom";

/** "Dimensione interfaccia": zooms the whole app, not just the text. */
export function UiZoomSelect() {
  const [level, setLevel] = useState(1);

  useEffect(() => {
    getSetting(UI_ZOOM_SETTING).then((v) => setLevel(parseUiZoom(v))).catch(() => {});
  }, []);

  return (
    <select
      value={String(level)}
      onChange={(e) => {
        const next = parseUiZoom(e.target.value);
        setLevel(next);
        setUiZoom(next).catch(() => {});
      }}
      className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
    >
      {UI_ZOOM_LEVELS.map((z) => (
        <option key={z} value={String(z)}>
          {Math.round(z * 100)}%{z === 1 ? " (predefinita)" : ""}
        </option>
      ))}
    </select>
  );
}
