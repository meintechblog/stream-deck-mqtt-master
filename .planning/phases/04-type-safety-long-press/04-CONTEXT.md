# Phase 4: Type Safety + Long Press - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all TypeScript compiler errors (setState on DialAction|KeyAction union) and add Long Press as a second interaction mode — long key hold sends a different payload than short press. All publish logic moves from onKeyDown to onKeyUp.

</domain>

<decisions>
## Implementation Decisions

### TypeScript Fixes
- **D-25:** Narrow `actionRef` type from `DialAction | KeyAction` to `KeyAction` only — this plugin only uses key actions (no dials). Cast or type guard where setState is called. Must result in `tsc --noEmit` exiting with zero errors.

### Long Press Trigger Model
- **D-26:** All publish actions fire on KeyUp, never KeyDown. onKeyDown only records a timestamp. onKeyUp calculates duration and decides short vs long press. This eliminates race conditions and simplifies the logic — at KeyUp time you know exactly how long the key was held.
- **D-27:** Threshold: 500ms hardcoded (not user-configurable in v2). Short press = < 500ms, Long press = ≥ 500ms.
- **D-28:** If no Long Press payload is configured, long press does nothing (opt-in). Short press always fires as before.
- **D-29:** Long Press payload is sent unconditionally (no state check). Loxone `changeTo/off` is idempotent — sending "off" to an already-off light is safe.

### Long Press Settings
- **D-30:** Two new fields: `longPressTopic` (own topic, separate from publishTopic) and `longPressPayload`. Both optional — empty means Long Press disabled.
- **D-31:** PI gets a "Long Press" section with these two fields. Styling is functional/minimal (Phase 5 redesigns everything).

### Carried Forward
- **D-01:** Unified Action
- **D-08:** Dev on Mac Mini via SSH
- **D-13:** Broker config in Action Settings
- **D-14:** sdpi-components standard styling (until Phase 5)
- trimSettings in all handlers
- DisableAutomaticStates in manifest
- In-memory lastValues cache
- buildSubscriptionCallback pattern

### Claude's Discretion
- Exact type narrowing approach (type guard vs cast vs generic constraint)
- How to refactor onKeyDown → onKeyUp (may need new onKeyUp handler override)
- Long Press section placement in PI HTML
- Whether to add a `keyDownTimestamp` map or use a simpler approach

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Plugin Code
- `src/actions/mqtt-action.ts` — MqttAction with onKeyDown (currently fires publish), onWillAppear, onWillDisappear, buildSubscriptionCallback
- `src/types/settings.ts` — MqttActionSettings schema (needs longPressTopic + longPressPayload fields)
- `src/services/connection-manager.ts` — ConnectionManager with statusListeners
- `io.github.meintechblog.mqtt-master.sdPlugin/property-inspector/mqtt.html` — Property Inspector HTML
- `io.github.meintechblog.mqtt-master.sdPlugin/manifest.json` — Plugin manifest

### Project Context
- `.planning/PROJECT.md` — Project vision, v2.0 milestone goals
- `.planning/REQUIREMENTS.md` — QUAL-01, LP-01 through LP-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildSubscriptionCallback()` — shared pattern for subscription logic, can inform long press callback pattern
- `trimSettings()` — already trims all string fields, needs longPressTopic + longPressPayload added
- `brokerKey()` utility — generates broker identifier from config
- `connectionManager.getOrCreate(config)` — ensures broker connection exists

### Established Patterns
- All publish logic in `onKeyDown` — must be moved to new `onKeyUp` handler
- `lastValues` Map for toggle state — Long Press doesn't need this (unconditional send)
- `debounceTimers` Map pattern — similar Map pattern for `keyDownTimestamps`

### Integration Points
- `onKeyDown` handler needs refactoring: remove publish logic, add timestamp recording
- New `onKeyUp` handler: calculate duration, route to short/long press logic
- `MqttActionSettings` type: add `longPressTopic` and `longPressPayload` fields
- PI HTML: add Long Press section with two text fields
- `trimSettings()`: add new fields to the trim list

### TypeScript Error Analysis
- 7 errors all on `setState()` — `DialAction` doesn't have `setState`, `KeyAction` does
- Fix: type-narrow `actionRef` to `KeyAction` (this plugin only uses keys, no dials)
- 1 vitest import error in test file — separate concern, may need vitest in devDependencies

</code_context>

<specifics>
## Specific Ideas

- Loxone light control use case: Short press toggles light, Long press always sends `changeTo/off` (idempotent off command)
- Topic example: `loxone-hallbude/buero/licht/cmd` with payload `changeTo/off`
- User explicitly wants separate Long Press topic (not reusing publishTopic) for maximum flexibility

</specifics>

<deferred>
## Deferred Ideas

- Configurable Long Press threshold (LP-05, deferred to v3+)
- Visual feedback during key hold (LP-06, deferred to v3+)

</deferred>

---

*Phase: 04-type-safety-long-press*
*Context gathered: 2026-03-25*
