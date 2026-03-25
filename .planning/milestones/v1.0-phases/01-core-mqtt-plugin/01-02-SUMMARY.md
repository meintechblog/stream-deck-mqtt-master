---
phase: 01-core-mqtt-plugin
plan: 02
subsystem: plugin
tags: [mqtt, stream-deck-sdk, typescript, singleton-action, property-inspector, sdpi-components]

# Dependency graph
requires:
  - phase: 01-core-mqtt-plugin/01
    provides: "ConnectionManager, TopicRouter, settings types, broker-key utility, logger"
provides:
  - "MqttAction class with full lifecycle: willAppear, keyDown, willDisappear, didReceiveSettings"
  - "Plugin entry point (plugin.ts) registering MqttAction and connecting to Stream Deck"
  - "Property Inspector HTML with broker config (global settings) and action config (per-button)"
  - "Working Rollup build producing bundled plugin.js"
affects: [01-03-PLAN]

# Tech tracking
tech-stack:
  added: ["sdpi-components v3 (CDN)"]
  patterns: ["SingletonAction lifecycle pattern", "Global settings for broker, action settings for topics", "previousTopics cache for live PI change detection"]

key-files:
  created:
    - src/actions/mqtt-action.ts
    - src/plugin.ts
    - io.github.meintechblog.mqtt-master.sdPlugin/ui/mqtt-action.html
    - .gitignore
  modified:
    - rollup.config.mjs

key-decisions:
  - "Override outDir in Rollup typescript plugin to match Rollup output directory"
  - "previousTopics Map for tracking topic changes in onDidReceiveSettings"

patterns-established:
  - "SingletonAction lifecycle: onWillAppear (subscribe), onKeyDown (publish), onWillDisappear (unsubscribe), onDidReceiveSettings (live PI changes)"
  - "Broker config via streamDeck.settings.getGlobalSettings, action config via event payload"
  - "PI broker fields use custom JS with SDPIComponents.streamDeckClient, action fields use setting attribute auto-binding"

requirements-completed: [PUB-01, PUB-02, PUB-03, SUB-01, SUB-02, ARCH-01, ARCH-04]

# Metrics
duration: 2min
completed: 2026-03-25
---

# Phase 01 Plan 02: MqttAction + Plugin Entry + Property Inspector Summary

**Unified MqttAction with publish-on-press, subscribe-on-appear, live PI topic changes, and minimal Property Inspector with sdpi-components for broker and action configuration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-25T15:26:20Z
- **Completed:** 2026-03-25T15:28:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- MqttAction handles full lifecycle: subscribe on willAppear (SUB-01, SUB-02), publish on keyDown (PUB-01, PUB-02, PUB-03), unsubscribe on willDisappear, live settings updates via onDidReceiveSettings
- Plugin entry point registers MqttAction and connects to Stream Deck SDK (ARCH-01)
- Property Inspector provides broker host/port (global settings) and action-specific MQTT config (subscribeTopic, publishTopic, payload, QoS, retain)
- Rollup build succeeds producing 1MB+ bundled plugin.js ready for sideloading

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unified MqttAction class and plugin entry point** - `af8fd4c` (feat)
2. **Task 2: Create minimal Property Inspector and verify build** - `2b0899e` (feat)
3. **Add .gitignore** - `f613442` (chore)

## Files Created/Modified
- `src/actions/mqtt-action.ts` - Unified MQTT action with 4 lifecycle handlers, broker config from global settings
- `src/plugin.ts` - Minimal entry point: register action + connect
- `io.github.meintechblog.mqtt-master.sdPlugin/ui/mqtt-action.html` - Property Inspector with broker and action config fields
- `rollup.config.mjs` - Fixed outDir mismatch for TypeScript plugin
- `.gitignore` - Excludes node_modules, dist, and build output (bin/)

## Decisions Made
- **Rollup outDir override:** @rollup/plugin-typescript requires outDir to be in the same directory as the Rollup output file. Overriding in plugin config (with declaration: false) fixes the build without changing tsconfig.json.
- **previousTopics cache:** Map tracking subscribe topics per action context enables detecting topic changes in onDidReceiveSettings for proper unregister/register cycle.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Rollup build outDir mismatch**
- **Found during:** Task 2 (Build verification)
- **Issue:** @rollup/plugin-typescript error: outDir (./dist) must be in same directory as Rollup output file (sdPlugin/bin/plugin.js)
- **Fix:** Added outDir and declaration override in rollup.config.mjs typescript plugin options
- **Files modified:** rollup.config.mjs
- **Verification:** npm run build succeeds, plugin.js produced at 1MB+
- **Committed in:** 2b0899e (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added .gitignore**
- **Found during:** Task 2 (Post-build file check)
- **Issue:** Build output (bin/) and node_modules were untracked, would pollute repo
- **Fix:** Created .gitignore with node_modules, dist, bin, and sourcemap patterns
- **Files modified:** .gitignore
- **Committed in:** f613442

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes necessary for a clean build and repository hygiene. No scope creep.

## Issues Encountered

- Rollup warnings about `this` rewritten to `undefined` and circular dependencies are from third-party packages (js-sdsl, readable-stream) bundled with mqtt. These are harmless and do not affect runtime behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plugin is feature-complete for Phase 1: publish on press, subscribe with live title updates
- Ready for Plan 03: unit tests and build verification
- Plugin can be sideloaded for manual testing via `streamdeck link`

---
*Phase: 01-core-mqtt-plugin*
*Completed: 2026-03-25*
