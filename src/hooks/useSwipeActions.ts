import { useCallback, useEffect, useRef, useState } from "react";

export type SwipeDirection = "left" | "right";

/** Past this share of the row's width (or 120px) a released swipe triggers its action. */
const COMMIT_RATIO = 0.3;
const COMMIT_MAX_PX = 120;
/** A trackpad swipe ends after this long without wheel events. */
const WHEEL_END_MS = 120;
/** Horizontal movement needed before a touch drag counts as a swipe. */
const TOUCH_SLOP_PX = 10;
const SETTLE_MS = 180;

// Trackpad momentum keeps sending wheel events after a swipe has fired. Once
// the row is gone they would land on the next one and swipe it too, so every
// row ignores horizontal wheel input until the stream goes quiet.
let wheelBlocked = false;
let lastWheelAt = 0;

function commitDistance(width: number): number {
  return Math.min(COMMIT_MAX_PX, width * COMMIT_RATIO);
}

/**
 * Horizontal swipe on a list row, by two-finger trackpad scroll or touch drag
 * (mouse drags stay with drag-and-drop). `onSwipe` runs when the row is let go
 * past the threshold; `removes` says whether that action takes the row away
 * (archive, delete) or leaves it in place (read, star).
 */
export function useSwipeActions(
  enabled: (direction: SwipeDirection) => boolean,
  removes: (direction: SwipeDirection) => boolean,
  onSwipe: (direction: SwipeDirection) => void,
) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);
  const offsetRef = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touch = useRef<{ id: number; x: number; y: number; swiping: boolean } | null>(null);
  /** Swallows the click a touch swipe would otherwise end with. */
  const justSwiped = useRef(false);

  const move = useCallback((next: number) => {
    const width = rowRef.current?.offsetWidth || 400;
    // Only follow the finger towards a side that has an action
    let clamped = Math.max(-width, Math.min(width, next));
    if (clamped < 0 && !enabled("left")) clamped = 0;
    if (clamped > 0 && !enabled("right")) clamped = 0;
    offsetRef.current = clamped;
    setSettling(false);
    setOffset(clamped);
  }, [enabled]);

  const release = useCallback(() => {
    const width = rowRef.current?.offsetWidth || 400;
    const current = offsetRef.current;
    const direction: SwipeDirection = current < 0 ? "left" : "right";
    const fire = Math.abs(current) >= commitDistance(width);
    const goesAway = fire && removes(direction);
    offsetRef.current = goesAway ? Math.sign(current) * width : 0;
    setSettling(true);
    setOffset(offsetRef.current);
    if (fire) {
      wheelBlocked = true;
      // Let the row finish sliding out before it disappears
      setTimeout(() => onSwipe(direction), goesAway ? SETTLE_MS : 0);
    }
  }, [onSwipe, removes]);

  // The wheel listener lives for the whole mount (re-adding it on every
  // render would drop the pending end-of-swipe timer), so it reads the latest
  // callbacks through refs.
  const moveRef = useRef(move);
  const releaseRef = useRef(release);
  moveRef.current = move;
  releaseRef.current = release;

  // Added by hand: React's wheel listener is passive, and preventDefault
  // keeps the list from scrolling sideways while the row moves.
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      if (wheelBlocked && now - lastWheelAt < WHEEL_END_MS * 2) {
        lastWheelAt = now;
        return;
      }
      wheelBlocked = false;
      lastWheelAt = now;
      const swiping = wheelTimer.current !== null;
      if (!swiping && Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      moveRef.current(offsetRef.current - e.deltaX);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        wheelTimer.current = null;
        releaseRef.current();
      }, WHEEL_END_MS);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (wheelTimer.current) clearTimeout(wheelTimer.current);
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "touch") return;
    touch.current = { id: e.pointerId, x: e.clientX, y: e.clientY, swiping: false };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const t = touch.current;
    if (!t || t.id !== e.pointerId) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (!t.swiping) {
      if (Math.abs(dy) > TOUCH_SLOP_PX && Math.abs(dy) > Math.abs(dx)) {
        touch.current = null; // vertical: let the list scroll
        return;
      }
      if (Math.abs(dx) < TOUCH_SLOP_PX) return;
      t.swiping = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    move(dx);
  }, [move]);

  const onPointerEnd = useCallback((e: React.PointerEvent) => {
    const t = touch.current;
    if (!t || t.id !== e.pointerId) return;
    touch.current = null;
    if (t.swiping) {
      justSwiped.current = true;
      setTimeout(() => { justSwiped.current = false; }, 300);
      release();
    }
  }, [release]);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (justSwiped.current || offsetRef.current !== 0) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const width = rowRef.current?.offsetWidth || 400;
  return {
    rowRef,
    offset,
    settling,
    /** The swipe has gone far enough to fire when released. */
    armed: Math.abs(offset) >= commitDistance(width),
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onClickCapture,
    },
  };
}
