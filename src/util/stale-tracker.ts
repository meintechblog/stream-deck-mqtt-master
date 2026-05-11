/**
 * Per-context stale-watch state. After `thresholdSeconds` of no `markFresh`
 * call, fires `onStale(id)` once and flips `isStale(id)` to true. Pure timer
 * logic with no SDK dependencies — keep the rendering side in mqtt-action.ts.
 */
export class StaleTracker {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private staleFlags = new Map<string, boolean>();

  /**
   * (Re)arm the stale timer for an id. Cancels any previous timer.
   * No-op when thresholdSeconds <= 0 (feature disabled).
   *
   * Note: arming does NOT clear the stale flag — call `markFresh` separately
   * for the "new data arrived" path. Arming a fresh appear with no data yet
   * leaves the flag at its default (false).
   */
  arm(id: string, thresholdSeconds: number, onStale: (id: string) => void): void {
    const existing = this.timers.get(id);
    if (existing) clearTimeout(existing);
    this.timers.delete(id);
    if (thresholdSeconds <= 0) return;
    const timer = setTimeout(() => {
      this.timers.delete(id);
      this.staleFlags.set(id, true);
      onStale(id);
    }, thresholdSeconds * 1000);
    this.timers.set(id, timer);
  }

  /** Mark the id as currently fresh (drops the stale flag). */
  markFresh(id: string): void {
    this.staleFlags.set(id, false);
  }

  /** True iff the id was flagged stale by a fired timer and not yet refreshed. */
  isStale(id: string): boolean {
    return this.staleFlags.get(id) ?? false;
  }

  /** Cancel the timer and forget all tracking for an id. */
  clear(id: string): void {
    const timer = this.timers.get(id);
    if (timer) clearTimeout(timer);
    this.timers.delete(id);
    this.staleFlags.delete(id);
  }
}
