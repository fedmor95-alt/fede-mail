import { useEffect, useState } from "react";
import { undoLastAction } from "@/services/emailActions";

const LABELS = {
  trash: ["Messaggio eliminato", "messaggi eliminati"],
  archive: ["Messaggio archiviato", "messaggi archiviati"],
} as const;

/** «Messaggio eliminato · Annulla» toast for the Ctrl+Z undo window. */
export function UndoToast() {
  const [state, setState] = useState<{ kind: "trash" | "archive"; count: number } | null>(null);

  useEffect(() => {
    const onAvailable = (e: Event) => setState((e as CustomEvent).detail);
    const onDone = () => setState(null);
    window.addEventListener("velo-undo-available", onAvailable);
    window.addEventListener("velo-undo-done", onDone);
    return () => {
      window.removeEventListener("velo-undo-available", onAvailable);
      window.removeEventListener("velo-undo-done", onDone);
    };
  }, []);

  if (!state) return null;
  const [one, many] = LABELS[state.kind];
  const text = state.count > 1 ? `${state.count} ${many}` : one;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg bg-text-primary text-bg-primary px-4 py-2 text-sm shadow-lg">
      <span>{text}</span>
      <span className="opacity-40">·</span>
      <button
        type="button"
        className="font-semibold text-accent hover:underline"
        onClick={() => undoLastAction()}
        title="Annulla (Ctrl+Z)"
      >
        Annulla
      </button>
    </div>
  );
}
