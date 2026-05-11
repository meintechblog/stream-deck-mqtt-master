import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { StaleTracker } from "./stale-tracker";

describe("StaleTracker", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not fire when threshold is 0 (feature disabled)", () => {
    const t = new StaleTracker();
    const onStale = vi.fn();
    t.arm("a", 0, onStale);
    vi.advanceTimersByTime(60_000);
    expect(onStale).not.toHaveBeenCalled();
    expect(t.isStale("a")).toBe(false);
  });

  it("does not fire when threshold is negative", () => {
    const t = new StaleTracker();
    const onStale = vi.fn();
    t.arm("a", -5, onStale);
    vi.advanceTimersByTime(60_000);
    expect(onStale).not.toHaveBeenCalled();
  });

  it("fires onStale and flips flag after threshold elapses", () => {
    const t = new StaleTracker();
    const onStale = vi.fn();
    t.arm("a", 5, onStale);
    expect(t.isStale("a")).toBe(false);
    vi.advanceTimersByTime(4_999);
    expect(onStale).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onStale).toHaveBeenCalledExactlyOnceWith("a");
    expect(t.isStale("a")).toBe(true);
  });

  it("re-arming cancels the previous timer", () => {
    const t = new StaleTracker();
    const onStale = vi.fn();
    t.arm("a", 5, onStale);
    vi.advanceTimersByTime(4_000);
    t.arm("a", 5, onStale); // resets — total elapsed irrelevant, only since last arm matters
    vi.advanceTimersByTime(4_000); // 4s since re-arm
    expect(onStale).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2_000); // now 6s since re-arm
    expect(onStale).toHaveBeenCalledOnce();
  });

  it("markFresh drops the stale flag without affecting timer", () => {
    const t = new StaleTracker();
    const onStale = vi.fn();
    t.arm("a", 5, onStale);
    vi.advanceTimersByTime(5_000);
    expect(t.isStale("a")).toBe(true);
    t.markFresh("a");
    expect(t.isStale("a")).toBe(false);
  });

  it("clear cancels timer AND drops flag", () => {
    const t = new StaleTracker();
    const onStale = vi.fn();
    t.arm("a", 5, onStale);
    t.clear("a");
    vi.advanceTimersByTime(60_000);
    expect(onStale).not.toHaveBeenCalled();
    expect(t.isStale("a")).toBe(false);
  });

  it("tracks multiple ids independently", () => {
    const t = new StaleTracker();
    const onStale = vi.fn();
    t.arm("a", 5, onStale);
    t.arm("b", 10, onStale);
    vi.advanceTimersByTime(5_000);
    expect(onStale).toHaveBeenCalledExactlyOnceWith("a");
    expect(t.isStale("a")).toBe(true);
    expect(t.isStale("b")).toBe(false);
    vi.advanceTimersByTime(5_000);
    expect(onStale).toHaveBeenCalledTimes(2);
    expect(t.isStale("b")).toBe(true);
  });
});
