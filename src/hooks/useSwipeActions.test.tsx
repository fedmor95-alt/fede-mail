import { render, act } from "@testing-library/react";
import { useSwipeActions, SWIPE_SETTLE_MS, type SwipeDirection } from "./useSwipeActions";

function Row({ onSwipe, removes = true }: { onSwipe: (d: SwipeDirection) => void; removes?: boolean }) {
  const swipe = useSwipeActions(() => true, () => removes, onSwipe);
  return <div data-testid="row" ref={swipe.rowRef} data-offset={swipe.offset} />;
}

function wheel(el: Element, deltaX: number, deltaY = 0) {
  el.dispatchEvent(new WheelEvent("wheel", { deltaX, deltaY, bubbles: true, cancelable: true }));
}

describe("useSwipeActions", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires a two-finger swipe as soon as it crosses the threshold, without waiting for the wheel to stop", () => {
    const onSwipe = vi.fn();
    const { getByTestId } = render(<Row onSwipe={onSwipe} />);
    const row = getByTestId("row");

    act(() => { wheel(row, 80); });
    expect(row.dataset.offset).toBe("-80");
    act(() => { wheel(row, 80); });
    expect(row.dataset.offset).toBe("-400");
    act(() => { vi.advanceTimersByTime(SWIPE_SETTLE_MS); });
    expect(onSwipe).toHaveBeenCalledWith("left");
  });

  it("springs back without firing on a short swipe", () => {
    const onSwipe = vi.fn();
    const { getByTestId } = render(<Row onSwipe={onSwipe} />);
    const row = getByTestId("row");

    act(() => { wheel(row, -40); });
    act(() => { vi.advanceTimersByTime(400); });
    expect(onSwipe).not.toHaveBeenCalled();
    expect(row.dataset.offset).toBe("0");
  });

  it("ignores vertical scrolling", () => {
    const onSwipe = vi.fn();
    const { getByTestId } = render(<Row onSwipe={onSwipe} />);
    const row = getByTestId("row");

    act(() => { wheel(row, 20, 200); });
    expect(row.dataset.offset).toBe("0");
  });
});
