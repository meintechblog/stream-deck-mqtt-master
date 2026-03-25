---
phase: 01-core-mqtt-plugin
plan: 01
subsystem: infra
tags: [mqtt, stream-deck-sdk, typescript, rollup, zod, connection-pool]

# Dependency graph
requires: []
provides:
  - "Plugin project scaffold (package.json, tsconfig, rollup, manifest)"
  - "ConnectionManager singleton MQTT connection pool"
  - "TopicRouter 1:N topic-to-action routing with ref counting"
  - "Zod schemas for GlobalSettings and MqttActionSettings"
  - "BrokerConfig type and brokerKey utility"
affects: [01-02-PLAN, 01-03-PLAN]

# Tech tracking
tech-stack:
  added: ["@elgato/streamdeck 2.0.4", "mqtt 5.15.1", "zod 3.24.2", "rollup 4.x", "typescript 5.7"]
  patterns: ["Singleton service pattern", "Reference-counted subscriptions", "Explicit resubscription on connect"]

key-files:
  created:
    - package.json
    - tsconfig.json
    - rollup.config.mjs
    - io.github.meintechblog.mqtt-master.sdPlugin/manifest.json
    - src/types/settings.ts
    - src/util/broker-key.ts
    - src/util/logger.ts
    - src/services/connection-manager.ts
    - src/services/topic-router.ts
  modified: []

key-decisions:
  - "Manual scaffold instead of streamdeck create (CLI not available locally, interactive prompts)"
  - "CJS output format for Rollup (safe default per Lambda tutorial)"
  - "rejectUnauthorized: false for TLS (home network self-signed certs)"
  - "clean: true with explicit resubscription (Pitfall 1 reliability fix)"

patterns-established:
  - "Singleton services: export const instance = new Class()"
  - "Broker key: protocol://host:port as unique connection identifier"
  - "TopicRouter ref counting: register returns isFirst, unregister returns isLast"
  - "Credentials in GlobalSettings only, never in action settings (CONN-06)"
  - "reset() on both services for crash recovery (Pitfall 2)"

requirements-completed: [CONN-01, CONN-02, CONN-03, CONN-04, CONN-05, CONN-06, ARCH-01, ARCH-02, ARCH-03]

# Metrics
duration: 3min
completed: 2026-03-25
---

# Phase 01 Plan 01: Core MQTT Plugin Scaffold Summary

**Stream Deck MQTT Master plugin scaffold with ConnectionManager (per-broker pooling, auto-reconnect, TLS) and TopicRouter (1:N topic-to-button routing with ref counting)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-25T15:20:35Z
- **Completed:** 2026-03-25T15:23:56Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Complete plugin project scaffold with package.json, tsconfig, rollup config, and manifest.json
- ConnectionManager singleton handles MQTT connection lifecycle: connect, reconnect (5s), TLS, auth, client ID via randomUUID
- TopicRouter routes MQTT messages from broker to 1:N button action contexts with reference counting
- Type system with Zod schemas separates global settings (credentials) from action settings (topics/payloads)
- All five Pitfall mitigations from research implemented: explicit resubscribe, reset on restart, global credentials, unique client IDs, QoS 0 defaults

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold plugin project and configure build tooling** - `712da51` (feat)
2. **Task 2: Create type definitions and utility modules** - `ab69d6d` (feat)
3. **Task 3: Implement ConnectionManager and TopicRouter services** - `90a6a29` (feat)

## Files Created/Modified
- `package.json` - Project metadata with @elgato/streamdeck, mqtt, zod dependencies
- `tsconfig.json` - TypeScript config with ES2022 target, strict mode, bundler resolution
- `rollup.config.mjs` - Bundles src/plugin.ts to sdPlugin/bin/plugin.js (CJS + sourcemap)
- `io.github.meintechblog.mqtt-master.sdPlugin/manifest.json` - Plugin identity, single MQTT action with 2 states
- `src/types/settings.ts` - GlobalSettingsSchema, MqttActionSettingsSchema, BrokerConfig interface
- `src/util/broker-key.ts` - Deterministic broker key from protocol://host:port
- `src/util/logger.ts` - SDK logger wrapper with MqttMaster scope
- `src/services/connection-manager.ts` - Singleton MQTT connection pool with auto-reconnect
- `src/services/topic-router.ts` - Topic-to-action routing with ref counting and dispatch

## Decisions Made
- **Manual scaffold over streamdeck create:** CLI requires interactive TTY and is not installed locally. Manual approach gives full control over exact configuration.
- **CJS output format:** Safe default confirmed by Lambda plugin tutorial. Stream Deck Node.js runtime handles CJS reliably.
- **rejectUnauthorized: false:** Home network deployments commonly use self-signed certificates. Strict validation deferred to Phase 2 with explicit user opt-in.
- **clean: true + explicit resubscribe:** MQTT.js resubscribe has documented bugs (#1157). Own topic tracking with resubscription on every connect event is more reliable.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- ConnectionManager and TopicRouter services ready for MqttAction class (Plan 02)
- Type system established for action settings and global broker config
- Build tooling ready (rollup will work once src/plugin.ts entry point is created in Plan 02)
- Manifest.json references PI at ui/mqtt-action.html (created in Plan 02)

## Self-Check: PASSED

All 9 created files verified on disk. All 3 task commits verified in git history.

---
*Phase: 01-core-mqtt-plugin*
*Completed: 2026-03-25*
