---
phase: 03-hardening-deployment
plan: 01
subsystem: mqtt, lifecycle
tags: [mqtt, disconnect-indicator, memory-cleanup, singleton-action, connection-manager]

# Dependency graph
requires:
  - phase: 02-toggle-settings-ui
    provides: MqttAction with subscribe/publish lifecycle, ConnectionManager with per-broker pooling
provides:
  - Status listener registry in ConnectionManager for offline/connect notifications
  - Memory leak fixes in MqttAction onWillDisappear (lastValues, debounceTimers cleanup)
  - Disconnect indicator on buttons when broker goes offline
affects: [03-02-PLAN]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget setTitle with .catch(() => {}) for status notifications"
    - "Status listener registry pattern: Map<brokerKey, Map<actionId, actionRef>>"

key-files:
  created: []
  modified:
    - src/services/connection-manager.ts
    - src/actions/mqtt-action.ts

key-decisions:
  - "Empty string title on reconnect lets retained MQTT messages naturally restore real value"
  - "Status unregister placed outside subscribeTopic check -- buttons without subscribe still need offline indicator cleanup"

patterns-established:
  - "StatusListener pattern: register on willAppear, unregister on willDisappear, fire-and-forget notifications"
  - "Full Map cleanup order in onWillDisappear: status, topic, lastValues, debounceTimers, previousTopics"

requirements-completed: [SUB-04, UI-05]

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 03 Plan 01: Disconnect Indicator and Lifecycle Cleanup Summary

**Status listener registry in ConnectionManager with offline/reconnect button notifications and full memory cleanup in MqttAction**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T21:59:23Z
- **Completed:** 2026-03-25T22:00:59Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- ConnectionManager notifies all registered button actions when broker goes offline ("! Offline" title) or reconnects (cleared title)
- MqttAction registers for status on willAppear and unregisters on willDisappear
- Fixed memory leaks: lastValues and debounceTimers Maps now properly cleaned up on button removal

## Task Commits

Each task was committed atomically:

1. **Task 1: Add status listener registry to ConnectionManager** - `41f5e47` (feat)
2. **Task 2: Wire status registration and memory cleanup in MqttAction** - `87be5ad` (feat)

## Files Created/Modified
- `src/services/connection-manager.ts` - Added statusListeners map, registerActionForStatus/unregisterActionForStatus methods, offline/connect notification loops, reset cleanup
- `src/actions/mqtt-action.ts` - Added registerActionForStatus call in onWillAppear, unregisterActionForStatus + lastValues + debounceTimers cleanup in onWillDisappear

## Decisions Made
- Empty string for reconnect title (not restoring cached value) -- retained MQTT messages will naturally push the real value via subscription callbacks
- Status unregister placed outside the subscribeTopic conditional -- a button with only publish config still needs to clean up its status listener

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Disconnect indicator wiring complete, ready for 03-02 (deployment/packaging)
- Pre-existing TS errors (setState on DialAction union type) remain from earlier phases -- not introduced by this plan

## Self-Check: PASSED

- All files exist: connection-manager.ts, mqtt-action.ts
- All commits verified: 41f5e47, 87be5ad

---
*Phase: 03-hardening-deployment*
*Completed: 2026-03-25*
