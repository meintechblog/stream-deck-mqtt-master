import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LongPressCoordinator } from "./long-press-coordinator";

describe("LongPressCoordinator", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("does not fire when thresholdMs is 0", () => {
    const c = new LongPressCoordinator();
    const onFire = vi.fn();
    c.arm("a", 0, onFire);
    vi.advanceTimersByTime(60_000);
    expect(onFire).not.toHaveBeenCalled();
    expect(c.cancel("a")).toBe(false);
  });

  it("does not fire when thresholdMs is negative", () => {
    const c = new LongPressCoordinator();
    const onFire = vi.fn();
    c.arm("a", -10, onFire);
    vi.advanceTimersByTime(60_000);
    expect(onFire).not.toHaveBeenCalled();
  });

  it("fires onFire after thresholdMs elapses while still armed", () => {
    const c = new LongPressCoordinator();
    const onFire = vi.fn();
    c.arm("a", 500, onFire);
    vi.advanceTimersByTime(499);
    expect(onFire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2);
    expect(onFire).toHaveBeenCalledOnce();
  });

  it("cancel before fire returns false and prevents the callback", () => {
    const c = new LongPressCoordinator();
    const onFire = vi.fn();
    c.arm("a", 500, onFire);
    vi.advanceTimersByTime(400);
    expect(c.cancel("a")).toBe(false);
    vi.advanceTimersByTime(200);
    expect(onFire).not.toHaveBeenCalled();
  });

  it("cancel after fire returns true and is idempotent (subsequent cancel returns false)", () => {
    const c = new LongPressCoordinator();
    const onFire = vi.fn();
    c.arm("a", 500, onFire);
    vi.advanceTimersByTime(500);
    expect(onFire).toHaveBeenCalledOnce();
    expect(c.cancel("a")).toBe(true);
    expect(c.cancel("a")).toBe(false);
  });

  it("re-arming after a fire is independent (treated as a new press cycle)", () => {
    const c = new LongPressCoordinator();
    const onFire = vi.fn();
    c.arm("a", 500, onFire);
    vi.advanceTimersByTime(500);
    expect(onFire).toHaveBeenCalledOnce();
    // Without calling cancel, immediately re-arm — simulates a quick second press.
    c.arm("a", 500, onFire);
    expect(c.cancel("a")).toBe(false); // re-arm cleared the fired flag
    // Re-arm + wait — second fire should still work.
    c.arm("a", 500, onFire);
    vi.advanceTimersByTime(500);
    expect(onFire).toHaveBeenCalledTimes(2);
  });

  it("re-arming during a pending timer cancels the prior one", () => {
    const c = new LongPressCoordinator();
    const onFire = vi.fn();
    c.arm("a", 500, onFire);
    vi.advanceTimersByTime(300);
    c.arm("a", 500, onFire); // restart
    vi.advanceTimersByTime(300); // 300ms into new arm, total 600ms but only 300 since restart
    expect(onFire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200); // now 500ms since restart
    expect(onFire).toHaveBeenCalledOnce();
  });

  it("tracks multiple ids independently", () => {
    const c = new LongPressCoordinator();
    const onFireA = vi.fn();
    const onFireB = vi.fn();
    c.arm("a", 300, onFireA);
    c.arm("b", 500, onFireB);
    vi.advanceTimersByTime(300);
    expect(onFireA).toHaveBeenCalledOnce();
    expect(onFireB).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onFireB).toHaveBeenCalledOnce();
    expect(c.cancel("a")).toBe(true);
    expect(c.cancel("b")).toBe(true);
  });
});
