# Phase 2: Toggle + Settings UI - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add toggle mode (bidirectional MQTT state control), polish the Property Inspector with full configuration options, implement JSON path extraction for complex payloads, and add visual state feedback on buttons. Builds on Phase 1's working publish/subscribe infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Toggle UX
- **D-10:** Separate Topics for command and status — Publish-Topic for commands (e.g. `cmnd/light/POWER`), Subscribe-Topic for state feedback (e.g. `stat/light/POWER`). Matches Tasmota/Shelly IoT patterns.
- **D-11:** Freely configurable on/off values — User enters On-Payload, Off-Payload, On-Value (match string from subscribe), Off-Value. Supports any pattern: ON/OFF, 1/0, true/false, custom strings.
- **D-12:** Toggle state derived from subscribed topic (TOGL-02) — never tracked locally. Current MQTT value determines button state.

### Property Inspector Design
- **D-13:** Broker config stays in Action Settings (same as Phase 1). No migration to Global Settings — simplicity over CONN-06 security for this use case (user's broker has no auth).
- **D-14:** sdpi-components standard styling — uses Elgato's web components library for native Stream Deck look and feel. No custom CSS.
- **D-15:** PI sections: Broker (host, port, user, pass, TLS toggle), Subscribe (topic, JSON path, display template), Publish (topic, payload, QoS, retain), Toggle (on-payload, off-payload, on-value, off-value).

### JSON Path Extraction
- **D-16:** Claude's Discretion — choose between dot-notation (simple, no dependency) or lightweight JSONPath. Prioritize simplicity.
- **D-17:** Display value formatting via simple template — textfield with `{{value}}` placeholder (e.g. `{{value}} °C` → `22.5 °C`). No full template engine.

### State Visuals
- **D-18:** Use SDK `setState(0/1)` for toggle state display — leverages manifest.json's 2-state icon system. State 0 = off (default), State 1 = on (active).
- **D-19:** Claude's Discretion for default icons — provide sensible defaults (e.g. MQTT-themed or generic toggle icons). Users can replace icons in Stream Deck UI.

### Carried Forward from Phase 1
- **D-01:** Unified Action (one action type for everything)
- **D-02:** 2 Button States (state 0 = off, state 1 = on)
- **D-08:** Development on Mac Mini via SSH

### Claude's Discretion
- JSON path implementation approach (dot-notation vs jsonpath-plus)
- Default icon design (MQTT logo variants vs generic toggle indicators)
- PI field grouping and section ordering within sdpi-components
- Toggle logic implementation (how onKeyDown decides which payload to send)
- Error states in PI (invalid JSON path, connection failed indicators)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Plugin Code
- `src/actions/mqtt-action.ts` — Current MqttAction with publish/subscribe lifecycle handlers
- `src/types/settings.ts` — MqttActionSettings schema (needs extension for toggle fields)
- `src/services/connection-manager.ts` — ConnectionManager with host trim normalization
- `src/services/topic-router.ts` — TopicRouter with 1:N dispatch
- `io.github.meintechblog.mqtt-master.sdPlugin/ui/mqtt-action.html` — Current minimal PI
- `io.github.meintechblog.mqtt-master.sdPlugin/manifest.json` — Manifest with 2 states defined

### Research
- `.planning/research/FEATURES.md` — Feature landscape, competitor analysis (HA plugin patterns)
- `.planning/research/ARCHITECTURE.md` — PI communication patterns, settings architecture
- `.planning/research/PITFALLS.md` — Throttling setTitle/setImage, credential storage

### Project Context
- `.planning/PROJECT.md` — Project vision, Phase 2 requirements
- `.planning/REQUIREMENTS.md` — TOGL-01..03, SUB-03, UI-01..04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MqttAction` class: Already has onWillAppear, onKeyDown, onWillDisappear, onDidReceiveSettings — extend for toggle logic
- `ConnectionManager`: Singleton with getOrCreate, ensureSubscribed/Unsubscribed — no changes needed
- `TopicRouter`: 1:N dispatch with register/unregister — no changes needed
- `settings.ts`: Zod schemas — extend MqttActionSettings with toggle and JSON path fields
- `mqtt-action.html`: Minimal PI with sdpi-components — extend with toggle and JSON path sections

### Established Patterns
- sdpi-components auto-binding via `setting="fieldName"` attribute — use for all new fields
- Broker config in action settings with host trim normalization
- Callback-based title updates via topicRouter.register

### Integration Points
- `onKeyDown` needs toggle logic: read current state, publish opposite payload
- `onWillAppear` callback needs JSON path extraction before setTitle
- `onDidReceiveSettings` needs to handle toggle field changes
- manifest.json states need proper default icons

</code_context>

<specifics>
## Specific Ideas

- Toggle follows Tasmota/Shelly pattern: separate command/status topics
- Display template is dead simple: `{{value}}` replacement only, no expressions
- Icons are replaceable by users — we just provide sensible defaults
- PI uses native sdpi-components look, no custom theming

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-toggle-settings-ui*
*Context gathered: 2026-03-25*
