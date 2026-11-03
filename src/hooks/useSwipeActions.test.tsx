import { render, act } from "@testing-library/react";
import { useSwipeActions, type SwipeDirection } from "./useSwipeActions";

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

  it("fires a two-finger swipe to the left once it is released past the threshold", () => {
    const onSwipe = vi.fn();
    const { getByTestId } = render(<Row onSwipe={onSwipe} />);
    const row = getByTestId("row");

    act(() => { wheel(row, 80); wheel(row, 80); });
    expect(row.dataset.offset).toBe("-160");
    act(() => { vi.advanceTimersByTime(130); });
    act(() => { vi.advanceTimersByTime(200); });
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
