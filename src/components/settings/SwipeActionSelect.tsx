import { useUIStore, SWIPE_ACTIONS, type SwipeAction } from "@/stores/uiStore";

const LABELS: Record<SwipeAction, string> = {
  archive: "Archivia",
  trash: "Elimina",
  read: "Letta / non letta",
  star: "Speciale",
  none: "Nessuna azione",
};

/** What a two-finger (or touch) swipe on an email in the list does. */
export function SwipeActionSelect({ direction }: { direction: "left" | "right" }) {
  const value = useUIStore((s) => (direction === "left" ? s.swipeLeftAction : s.swipeRightAction));
  const setSwipeAction = useUIStore((s) => s.setSwipeAction);

  return (
    <select
      value={value}
      onChange={(e) => setSwipeAction(direction, e.target.value as SwipeAction)}
      className="w-48 bg-bg-tertiary text-text-primary text-sm px-3 py-1.5 rounded-md border border-border-primary focus:border-accent outline-none"
    >
      {SWIPE_ACTIONS.map((a) => (
        <option key={a} value={a}>{LABELS[a]}</option>
      ))}
    </select>
  );
}
