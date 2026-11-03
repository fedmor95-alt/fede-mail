import { useEffect, useState } from "react";
import { getSetting, setSetting } from "@/services/db/settings";
import {
  SYNC_INTERVAL_CHOICES,
  SYNC_INTERVAL_SETTING,
  parseSyncInterval,
  setSyncIntervalMinutes,
} from "@/services/gmail/syncManager";

/** "Controlla nuova posta ogni": how often the background sync runs. */
export function SyncIntervalSelect() {
  const [minutes, setMinutes] = useState(1);

  useEffect(() => {
    getSetting(SYNC_INTERVAL_SETTING).then((v) => setMinutes(parseSyncInterval(v))).catch(() => {});
  }, []);

  return (
    <select
      value={String(minutes)}
      onChange={(e) => {
        const next = parseSyncInterval(e.target.value);
        setMinutes(next);
        setSyncIntervalMinutes(next);
        setSetting(SYNC_INTERVAL_SETTING, String(next)).catch(() => {});
      }}
      className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
    >
      {SYNC_INTERVAL_CHOICES.map((m) => (
        <option key={m} value={String(m)}>
          {m === 1 ? "1 minuto" : `${m} minuti`}
        </option>
      ))}
    </select>
  );
}
