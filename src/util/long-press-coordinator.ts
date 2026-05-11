/**
 * Per-context long-press timer. Armed on keyDown; the callback fires once
 * while the key is still held if the threshold is exceeded. `cancel` on keyUp
 * returns whether the callback already ran so the caller can suppress any
 * short-press fallback path (avoids double-publishing on release).
 *
 * Pure logic — no SDK / no MQTT dependencies. See stale-tracker.ts for the
 * sibling pattern.
 */
export class LongPressCoordinator {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private firedIds = new Set<string>();

  /**
   * (Re)arm the long-press timer for an id. Cancels any previous timer.
   * No-op when thresholdMs <= 0 (caller should pre-check on configurability).
   */
  arm(id: string, thresholdMs: number, onFire: () => void): void {
    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);
    this.timers.delete(id);
    this.firedIds.delete(id);
    if (thresholdMs <= 0) return;
    const timer = setTimeout(() => {
      this.timers.delete(id);
      this.firedIds.add(id);
      onFire();
    }, thresholdMs);
    this.timers.set(id, timer);
  }

  /**
   * Tear down all state for an id. Returns true iff the timer had already
   * fired (i.e. onFire was invoked since the last arm). Idempotent: a second
   * cancel returns false because the state was cleared.
   */
  cancel(id: string): boolean {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    const hadFired = this.firedIds.delete(id);
    return hadFired;
  }
}
