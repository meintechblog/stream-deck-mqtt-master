---
type: quick-task
slug: long-press-on-hold
date: 2026-05-11
status: in-progress
---

# Fire long-press on hold (not on release)

## Problem

Today's behavior: long-press payload only sends after the user releases the key. The plugin records the keyDown timestamp, then on keyUp computes `Date.now() - down` and branches into long-press vs short-press. So a user pressing-and-holding gets nothing physical until they let go — feels laggy and unlike a normal hold gesture.

User asked: trigger the long-press the moment the threshold (500ms) is crossed while still held.

## Fix

Move long-press firing from keyUp into a setTimeout armed at keyDown:

- On `onKeyDown`: record timestamp (unchanged). Additionally, if `longPressTopic` and `longPressPayload` are configured, arm a 500ms timer; on fire, publish immediately.
- On `onKeyUp`: ask the coordinator whether the long-press already fired during the hold.
  - If yes → skip short-press path (nothing more to do — release after long-fire shouldn't double-publish).
  - If no AND duration < 500ms → existing short-press logic (toggle / non-toggle).
  - If no AND duration ≥ 500ms (i.e. long-press was NOT configured) → preserve existing "ignored" log message. Don't fall through to short-press — that would change behavior for buttons that intentionally have no longPress config but were held long.

## Design — `LongPressCoordinator` helper

Pure timer + state class, no SDK deps (matches the StaleTracker pattern from the previous quick task — keeps testable logic out of the SDK-bound action class).

```ts
arm(id, thresholdMs, onFire): void   // (re)starts timer; fire-once
cancel(id): boolean                  // true if onFire already ran since arm()
```

`cancel` is the atomic-enough query the keyUp handler needs: it clears all state for `id` and returns whether the timer had already fired. Single-threaded JS means there's no race between timer-fire and keyUp callback — both run on the same event loop turn order.

## What NOT to change

- 500ms threshold stays hardcoded. The decision log already notes "configurable deferred" (v2.0).
- Long-press topic / payload still come from the same settings fields. No PI changes.
- Short-press behavior unchanged.

## Verify

- `pnpm exec tsc --noEmit` clean.
- Unit tests on the coordinator: arm-then-cancel-early, arm-then-fire, arm-cancel-second-arm-independence, threshold-0 no-op, multiple ids.
- Build, deploy, restart Stream Deck on remote, confirm clean `willAppear x4`.
- Live test via the tail (already wired): the test miniserver topic has `longPressPayload="Aus"` on button (4,1). Press and hold (4,1) — within ~500ms should see a `Long press (>=500ms, on hold): published "Aus" to loxone-hallbude/buero/licht/cmd` line, BEFORE keyUp. Release: no second publish.

## Deploy

Same flow as previous quick tasks: build → scp bin via /tmp → swap in place with backup → killall "Stream Deck" → reopen → tail log.
