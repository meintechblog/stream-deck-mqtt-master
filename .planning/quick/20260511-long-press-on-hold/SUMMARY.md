---
quick_id: 20260511-long-press-on-hold
date: 2026-05-11
status: complete
---

# Summary: Fire long-press while key is held (not on release)

## Diagnosis

Pre-change flow: `onKeyDown` only recorded a timestamp. All publish decisions happened in `onKeyUp` — duration was computed from the timestamp, and short vs long was decided after the fact. Net effect for the user: holding a key did nothing physical until the release moment, then a long-press payload would fly out. Felt laggy.

User asked for the gesture to be "fire on hold" — the moment the threshold is crossed, send the long-press payload, without waiting for release.

## Changes

`src/util/long-press-coordinator.ts` (new) — pure timer + state class with two ops:

- `arm(id, thresholdMs, onFire)` — start a fire-once timer (resets any prior arm and clears any "fired" flag).
- `cancel(id): boolean` — clears all state for `id` and returns whether `onFire` had already run. The caller uses this on keyUp to gate the short-press path.

Eight unit tests cover threshold 0 / negative (no-op), arm-and-fire, cancel-before-fire (returns false), cancel-after-fire (returns true), idempotency, re-arm-after-fire independence, re-arm-during-pending cancellation of prior timer, and multi-id isolation.

`src/actions/mqtt-action.ts`:

- Threshold extracted to a file-level `LONG_PRESS_THRESHOLD_MS = 500` constant (still hardcoded per the v2.0 "configurable deferred" decision, just no longer a magic number inline twice).
- `onKeyDown`: timestamp recording unchanged. If `longPressTopic` and `longPressPayload` are both set, arm the coordinator. The fire callback captures `topic`, `payload`, and `config` and publishes directly to the broker. Logs `Long press (on hold, >=500ms): published "<payload>" to <topic>` — note the "on hold" marker distinguishes the new path from any legacy log line.
- `onKeyUp`: queries `coordinator.cancel(id)` first.
  - If `cancel` returned true (fired on hold) → return immediately. No double-publish on release.
  - Otherwise: existing duration-branch — `>= 500ms` only happens now when no longPress was configured (so coordinator never armed). Preserved as a logged no-op (`Long press (N ms): no longPressTopic/Payload configured, ignoring`) so users intentionally without long-press config don't get surprise short-press payloads after a long hold.
  - `< 500ms` → existing short-press / toggle logic, untouched.
- `onWillDisappear`: also cancels the coordinator alongside the existing stale-tracker cleanup.

## Why a coordinator helper

Same rationale as the StaleTracker extraction yesterday: vitest + the @elgato/streamdeck SDK don't play nicely (the SDK's ESM-default-export pattern breaks the test transformer). Pure helpers stay testable; mqtt-action stays thin around them.

## Verify

- `pnpm exec tsc --noEmit` clean.
- `pnpm exec vitest run` — 27/27 (12 resolve-json-path + 7 stale-tracker + 8 long-press-coordinator).
- `pnpm run build` — bundle 1.1 MB. Grep confirms `LongPressCoordinator`, `longPressCoordinator`, `LONG_PRESS_THRESHOLD_MS`, and `on hold` are all present (10 hits).
- Deploy: scp via /tmp, swap with backup, restart Stream Deck on remote. Log shows clean `willAppear x4`, `Connected`, retained mood/state for both PROD and TEST topics.
- **Live physical verification — deferred to user**: button (4,1) on the Stream Deck XL is the only one currently configured with longPress (`Aus` to `loxone-hallbude/buero/licht/cmd`). Hold it for >500ms and you should see `Long press (on hold, ...)` in the plugin log _before_ you release. Releasing should not produce a second publish.

## Behavior matrix (after this change)

| Has longPress config | Hold duration | What fires |
|---|---|---|
| Yes | <500ms (released early) | Short-press path on keyUp (toggle or plain publishPayload) |
| Yes | ≥500ms (still held) | **Long-press fires on hold at 500ms exactly. KeyUp is a no-op.** |
| No  | <500ms | Short-press path on keyUp |
| No  | ≥500ms | Ignored (logged) — same as previous behavior |

## Out of scope

- Configurable long-press threshold in settings/PI — v2.0 deferral still stands.
- Haptic / visual feedback on the Stream Deck button at the 500ms moment — would be a nice UX touch but out of scope here.
- Continuous re-fire while held (think "hold to repeat-publish every N ms") — different feature, not requested.
