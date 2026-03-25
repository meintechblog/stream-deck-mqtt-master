---
phase: 04-type-safety-long-press
plan: 02
subsystem: actions
tags: [long-press, keyup, keydown, mqtt-publish, stream-deck-sdk]

# Dependency graph
requires:
  - phase: 04-type-safety-long-press plan 01
    provides: "longPressTopic + longPressPayload settings fields, zero tsc errors"
provides:
  - "onKeyUp handler with short/long press routing (500ms threshold)"
  - "keyDownTimestamps map for press duration tracking"
  - "Long press publishes longPressPayload to longPressTopic"
affects: [04-pi-long-press-fields, 05-pi-redesign]

# Tech tracking
tech-stack:
  added: []
  patterns: ["keyDown timestamp + keyUp duration calculation for long press detection"]

key-files:
  created: []
  modified:
    - src/actions/mqtt-action.ts

key-decisions:
  - "All publish logic fires on KeyUp, onKeyDown only records timestamp (D-26)"
  - "500ms hardcoded threshold, duration >= 500 = long press (D-27)"
  - "Long press requires both longPressTopic AND longPressPayload (D-28)"
  - "Long press payload is unconditional -- no toggle logic, no state check (D-29)"

patterns-established:
  - "keyDown/keyUp timestamp pattern: record Date.now() on down, calculate duration on up, delete after use"

requirements-completed: [LP-01, LP-02, LP-03]

# Metrics
duration: 1min
completed: 2026-03-25
---

# Phase 04 Plan 02: Long Press Routing Summary

**onKeyDown refactored to timestamp-only, onKeyUp routes short press (<500ms) to publish/toggle and long press (>=500ms) to longPressTopic/longPressPayload**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-25T23:28:08Z
- **Completed:** 2026-03-25T23:29:33Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Moved all publish logic from onKeyDown to onKeyUp for duration-based routing
- Long press (>= 500ms) sends longPressPayload to longPressTopic (LP-01)
- Short press (< 500ms) preserves existing publish/toggle behavior unchanged (LP-02)
- Unconfigured long press silently ignored -- opt-in feature (LP-03)
- keyDownTimestamps cleanup in onWillDisappear prevents memory leaks
- Zero tsc errors, rollup build passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactor onKeyDown to timestamp-only + implement onKeyUp with long press routing** - `4f4e535` (feat)

## Files Created/Modified
- `src/actions/mqtt-action.ts` - onKeyDown reduced to timestamp recording, new onKeyUp with short/long press routing, keyDownTimestamps map added

## Decisions Made
- All publish on KeyUp, never KeyDown (D-26) -- eliminates race conditions
- 500ms hardcoded threshold (D-27) -- configurable deferred to v3
- Long press unconditional send (D-29) -- Loxone idempotent commands are safe to repeat
- Both longPressTopic and longPressPayload required for long press to fire (D-28)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Long press backend logic complete
- PI fields for longPressTopic/longPressPayload needed (future plan) for user configuration
- Ready for testing on physical Stream Deck with Loxone light control

---
## Self-Check: PASSED

- FOUND: src/actions/mqtt-action.ts
- FOUND: commit 4f4e535

*Phase: 04-type-safety-long-press*
*Completed: 2026-03-25*
