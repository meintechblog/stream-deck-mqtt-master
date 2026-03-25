# Project Research Summary

**Project:** Stream Deck MQTT Plugin
**Domain:** Elgato Stream Deck Plugin with Bidirectional MQTT
**Researched:** 2026-03-25
**Confidence:** HIGH

## Executive Summary

This project is a Stream Deck plugin that gives users bidirectional MQTT control from hardware buttons: press to publish, subscribe to display live device state. The technology stack is unusually constrained — there is exactly one viable SDK (`@elgato/streamdeck` ^2.0.4), one viable MQTT client (`mqtt` ^5.15.0 / MQTT.js), and one standard bundler (Rollup, as scaffolded by the Elgato CLI). No meaningful alternative choices exist in either category. The Property Inspector (settings UI) uses plain HTML with `sdpi-components.js` web components — no frontend framework is warranted or recommended.

The competitive landscape strongly favors building this now. All five existing Stream Deck MQTT plugins use the legacy SDK v1, most are publish-only, and the only one with subscribe support has 5 GitHub stars and zero releases. Building on SDK v2 with bidirectional MQTT (publish AND subscribe driven by live broker state) is an unoccupied position in the Elgato Marketplace. The most successful IoT Stream Deck plugin (cgiesche/streamdeck-homeassistant, 500+ stars) demonstrates that the winning pattern is live state display plus action — exactly what this plugin does for MQTT.

The critical risks are architectural, not technological. Three decisions must be made correctly in Phase 1 or they require rewrites: (1) MQTT connections must be pooled per-broker, never per-button; (2) broker credentials must go in global settings, never action settings; (3) subscription tracking must use `topic -> Set<contextId>` one-to-many mapping from day one. Getting any of these wrong produces hard-to-detect failures — silent data staleness, credential leaks in profile exports, and reconnect storms — that are expensive to fix after the action classes are built on top.

## Key Findings

### Recommended Stack

See full detail: `.planning/research/STACK.md`

The scaffolded SDK project uses TypeScript ~5.7, Rollup ^4.x, and the `@elgato/cli` (^1.7.3) for development lifecycle management. The plugin runs as a single persistent Node.js 20 process (provided by Stream Deck app — do not install separately). The build output is a single bundled `plugin.js` via Rollup; the `mqtt` npm package and all transitive dependencies must be bundled with `@rollup/plugin-node-resolve` + `@rollup/plugin-commonjs` + `@rollup/plugin-json`.

**Core technologies:**
- `@elgato/streamdeck` ^2.0.4 — SDK for actions, events, settings, PI communication — only option
- `mqtt` ^5.15.0 — MQTT client with native TCP, auto-reconnect, QoS 0/1/2 — ecosystem standard
- TypeScript ~5.7 — provided by SDK scaffold; do not override version
- `zod` ^3.24 — settings validation; SDK docs explicitly recommend it; validate all PI inputs before use
- `@elgato/cli` ^1.7.3 — scaffold, link, dev mode, pack for distribution
- Rollup ^4.x — SDK-standard bundler; do not switch to esbuild or webpack

**What not to use:**
- `@elgato-stream-deck/node` (Julusian) — hardware HID library, not a plugin SDK
- `async-mqtt` — dead wrapper; MQTT.js v5 has native `connectAsync()`
- React/Vue/Svelte for Property Inspector — overkill for a 5-8 field config form
- WebSocket MQTT transport — plugin runs in Node.js, not a browser; native TCP is simpler and faster

### Expected Features

See full detail: `.planning/research/FEATURES.md`

**Must have (table stakes) — Phase 1:**
- MQTT Publish on button press — every existing plugin has this; non-negotiable baseline
- MQTT Subscribe with live title update — THE primary differentiator vs all existing plugins
- Broker connection config (host, port, auth, TLS) — cannot function without it
- Toggle mode (two-state publish based on subscribed state) — most common smart home pattern
- Connection status indicator — users need to know if broker is reachable
- Auto-reconnect — `mqtt.js` provides this; must wire correctly with explicit resubscription
- QoS level selection (0, 1, 2) — MQTT fundamental; default to QoS 0
- Retain flag option — standard MQTT feature; checkbox per publish action
- TLS/SSL support — most production brokers require it; `mqtt.js` handles it natively

**Should have (competitive differentiators) — Phase 2:**
- JSON path value extraction — many MQTT payloads are JSON; `payload.temperature` from `{"temperature":22.5}`
- State-based icon rendering — button visually reflects device state (on/off/unknown/disconnected)
- Display value formatting template — `{{value}} C` instead of raw `22.5`
- Multiple broker support — users have home and office brokers
- Long press action — different payload on hold vs tap; SDK v2 supports keyDown/keyUp timing

**Defer (v2+):**
- Full template engine (Jinja2/Nunjucks) — `{{value}}` substitution covers 95% of use cases
- Built-in icon library — Stream Deck's native icon picker handles this
- MQTT Discovery / auto-detect — Home Assistant-specific convention, not generic MQTT
- Dial/touchscreen (Stream Deck+) support — different interaction model; v1 targets LCD keys only
- Multi-action button (publish to multiple topics per press) — Stream Deck's native multi-action is a workaround

### Architecture Approach

See full detail: `.planning/research/ARCHITECTURE.md`

The plugin is a single Node.js process with two runtime components: the plugin backend (Node.js 20) and the Property Inspector UI (Chromium). They communicate via the Stream Deck WebSocket bridge. The central architectural decision is the **Singleton ConnectionManager**: one `MqttClient` instance per unique broker (keyed by host+port+user hash), shared across all buttons. A **TopicRouter** maps each MQTT topic to the `Set<contextId>` of all buttons subscribed to it, enabling one-to-many message dispatch. Button lifecycle events (`willAppear`/`willDisappear`) drive subscription lifecycle — not settings changes alone.

**Major components:**
1. **ConnectionManager** (singleton) — broker-keyed pool of `MqttClient` instances; handles connect, reconnect, resubscription on `connect` event
2. **TopicRouter** — `Map<brokerKey, Map<topic, Set<contextId>>>` data structure; reference-counted subscribe/unsubscribe
3. **MqttToggleAction** — thin action class: delegates to ConnectionManager + TopicRouter on lifecycle events; handles keyDown for publish
4. **MqttPublishAction** — publish-only action; simpler lifecycle
5. **PayloadMapper** (`util/payload-mapper.ts`) — maps MQTT payload string to button state index + title; configurable on/off values
6. **Property Inspector** (`ui/*.html`) — plain HTML + sdpi-components; pulls state on load, never receives unsolicited push from plugin

**Key patterns to follow:**
- Bind MQTT subscriptions to `willAppear`/`willDisappear`, not settings change handlers
- Store broker credentials in global settings only (encrypted, not exported in profiles)
- Reference brokers by ID in action settings; resolve credentials at runtime from global settings
- On plugin startup, reset all tracking state and rebuild from `willAppear` events (crash recovery)
- Explicitly resubscribe all active topics on every MQTT `connect` event; do not rely on MQTT.js built-in `resubscribe`

### Critical Pitfalls

See full detail: `.planning/research/PITFALLS.md`

1. **Per-button MQTT connections** — Creating `mqtt.connect()` inside action handlers instead of using a shared pool. With 32 buttons on an XL, this spawns 32 TCP connections, causes reconnect storms, and produces memory leaks (documented MQTT.js issues #791, #161). Must be solved in Phase 1; retrofitting is a rewrite.

2. **Credential leakage in action settings** — Per-action settings are plain-text and included in profile exports. Broker username/password must go in global settings exclusively. Users who share profiles would leak MQTT broker access. Must be designed correctly from day one.

3. **Silent subscription loss after reconnect** — MQTT.js `resubscribe: true` option has documented bugs depending on protocol version and clean session mode. After reconnect, subscriptions silently disappear; buttons show stale data with no error. Prevention: maintain a `Set<string>` of active topics in ConnectionManager and explicitly resubscribe all of them on every `connect` event.

4. **`onWillDisappear` not called on plugin crash** — If the plugin crashes, `willDisappear` never fires for visible buttons. After restart, `willAppear` fires for all buttons again. Any tracking state based on increment/decrement will have wrong counts. Prevention: reset all state on startup; treat `willAppear` as source of truth.

5. **High-frequency MQTT topics overwhelming `setTitle`/`setImage`** — Sensor topics publishing every 100ms flood the Stream Deck WebSocket. The plugin event loop blocks, buttons freeze, the WebSocket connection drops. Prevention: throttle title/image updates to max 2-4 per second per button (250ms minimum). Apply in Phase 2 before release.

**Additional notable pitfalls:**
- Property Inspector lifecycle desync: PI is not always running; never push state to it proactively; PI must pull on load
- QoS 1/2 memory growth (~4KB/second in MQTT.js issue #161): default to QoS 0 for subscriptions
- MQTT client ID collisions: generate unique client ID per installation (`crypto.randomUUID()`), store in global settings
- TLS `rejectUnauthorized: false` shipping to production: default to strict validation; explicit user opt-out only

## Implications for Roadmap

Based on combined research, the architecture's dependency layers map directly to a 4-phase structure:

### Phase 1: Foundation and Core Architecture

**Rationale:** The ConnectionManager singleton is the hardest architectural piece and everything else depends on it. Getting the data structures wrong (one-to-one instead of one-to-many topic routing, credentials in wrong settings store) requires a rewrite of all action classes built on top. Phase 1 establishes the skeleton that all future phases extend.

**Delivers:** Working plugin that connects to a broker, publishes on button press, subscribes and updates button title with live MQTT values.

**Features addressed:**
- Broker connection config (host, port, auth, TLS)
- MQTT Publish on button press
- MQTT Subscribe with live title update
- Auto-reconnect with explicit resubscription on `connect` event
- QoS selection and retain flag (defaults established)
- Connection status indicator (basic)

**Pitfalls avoided:**
- Per-button connection antipattern (ConnectionManager from day one)
- Credential leakage (global settings for broker config from day one)
- `willDisappear` crash asymmetry (reset on startup, rebuild from `willAppear`)
- Client ID collision (generate UUID on first run, persist in global settings)
- QoS memory growth (QoS 0 as default)

**Research flag:** Standard SDK patterns, well-documented. No additional research needed.

### Phase 2: Toggle Mode and Property Inspector

**Rationale:** Toggle is the primary use case for smart home users (light on/off, switch, valve open/close). It requires the subscribe infrastructure from Phase 1 and adds the state tracking logic. The Property Inspector must be built at this phase because toggle configuration is complex (separate publish topic, payload values for on/off, state feedback topic). Phase 2 also adds polish that makes the plugin usable by real users.

**Delivers:** Full bidirectional toggle buttons with visual state feedback, complete settings UI, TLS support, and connection status visible in PI.

**Features addressed:**
- Toggle mode (two-state publish driven by subscribed state)
- Display value formatting template (`{{value}}`)
- Property Inspector for broker config and per-button settings
- TLS/SSL support (default strict validation)
- Connection status visible in PI
- Long press action (different payload on hold)

**Pitfalls avoided:**
- Local-only toggle state (always trust MQTT subscribe state, not local toggle tracking)
- PI lifecycle desync (PI pulls state on load, plugin never pushes unsolicited)
- TLS `rejectUnauthorized: false` in production (default strict; explicit opt-out checkbox)
- High-frequency topic throttling (add 250ms throttle before any public release)

**Research flag:** `sdpi-components` documentation is sparse — may need to reference source code. Prototype PI communication (fetch from plugin, send to plugin) early in this phase before building full UI.

### Phase 3: Power Features and Visual Polish

**Rationale:** JSON path extraction and state-based icons are the features that make the plugin competitive with the best IoT Stream Deck plugins (cgiesche/HA has 500+ stars driven by exactly these features). They are additive on top of Phase 2 and do not require architectural changes.

**Delivers:** JSON payload parsing, configurable on/off icons, multiple broker support, dynamic image rendering.

**Features addressed:**
- JSON path value extraction (`payload.temperature` from nested JSON)
- State-based icon rendering (color/greyscale per state; SVG-to-base64 dynamic generation)
- Multiple broker support (broker profile dropdown in PI)
- Multi-device context routing (already designed; verified here)

**Pitfalls avoided:**
- Base64 image encoding on every update: cache rendered images by `${state}-${value}` key
- Multi-device button context collisions: verify one-to-many routing works with two physical decks

**Research flag:** SVG-to-base64 dynamic image rendering approach needs experimentation — verify Stream Deck handles `data:image/svg+xml;base64,...` at 72x72 and 96x96 resolutions on both macOS and Windows before committing to this approach.

### Phase 4: Distribution and Marketplace

**Rationale:** Packaging and submission are separate concerns from functionality. The Elgato Marketplace has specific validation requirements, manifest field requirements, and DRM checks that are not relevant until the plugin is functionally complete. Deferring this avoids premature constraint on the development workflow.

**Delivers:** `.streamDeckPlugin` package for distribution, validated manifest, marketplace submission.

**Features addressed:**
- `streamdeck pack` output validation
- `.sdignore` to exclude dev artifacts and node_modules
- Manifest completeness (`SupportedInMultiActions`, icon sizes, all required fields)
- Cross-platform testing (macOS + Windows)
- Payload templates with variables (deferred from Phase 2; include here if time allows)
- LWT configuration (deferred; include here if time allows)

**Pitfalls avoided:**
- Missing manifest fields breaking marketplace submission
- Dev files and node_modules bloat in distribution package
- Multi-action container compatibility (`SupportedInMultiActions: false` if needed)

**Research flag:** Marketplace DRM validation requirements and submission process need research immediately before Phase 4 begins. SDK v2 is required for DRM; the specific DRM implementation and review timeline are not yet researched.

### Phase Ordering Rationale

- Phase 1 must establish ConnectionManager first — it is the foundation all action classes delegate to; retrofitting is a full rewrite of action logic
- Phase 2 builds the user-facing experience (toggle + PI) on the Phase 1 infrastructure; toggle requires subscribe which Phase 1 provides
- Phase 3 is purely additive — JSON parsing, dynamic images, multi-broker all extend Phase 2 without changing its internals
- Phase 4 is a release concern independent of feature work; packaging last validates the complete plugin in one step

### Research Flags

**Needs deeper research before planning:**
- **Phase 3:** SVG/dynamic image rendering — verify data URI support in Stream Deck at hardware-specific resolutions before designing the image pipeline
- **Phase 4:** Marketplace DRM validation, submission process, and review timeline — research when Phase 3 nears completion

**Standard patterns (skip research-phase):**
- **Phase 1:** SDK architecture is well-documented, official examples exist, ConnectionManager pattern is established
- **Phase 2:** sdpi-components patterns are predictable; PI communication is documented (prototype early but no dedicated research needed)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Both core libraries verified from npm (SDK v2.0.4, MQTT.js v5.15.0). No meaningful alternatives exist. CLI commands and Rollup config verified from official docs. |
| Features | MEDIUM-HIGH | Competitor analysis based on GitHub repos and Marketplace listings. All five competing plugins reviewed. Feature prioritization grounded in IoT UX patterns from HA plugin ecosystem (500+ star reference implementations). |
| Architecture | HIGH | ConnectionManager + TopicRouter pattern derived from official SDK docs, MQTT best practices, and structural analysis of existing plugin pitfalls. Data structures (one-to-many topic routing) verified against multi-device requirements. |
| Pitfalls | HIGH | Sourced from MQTT.js GitHub issues (#791, #161, #1157, #1727), official SDK documentation warnings, and architectural analysis. All critical pitfalls have documented real-world consequences and clear prevention strategies. |

**Overall confidence:** HIGH

### Gaps to Address

- **`sdpi-components` documentation:** Functional but under-documented web component library. Reference the source code during Phase 2 PI implementation. Prototype communication patterns before building full UI.
- **Node.js 24 in manifest:** SDK now supports `"24"` in manifest but the specific build Stream Deck bundles is unclear. Use `"20"` as safe default throughout.
- **SVG data URI rendering:** Unverified that Stream Deck handles `data:image/svg+xml;base64,...` correctly at all hardware button resolutions (72x72 MK.2 vs 96x96 XL). Needs experimentation in Phase 3.
- **Multi-action container compatibility:** Need to verify whether MQTT toggle actions work correctly inside Stream Deck's built-in multi-action containers, or whether `SupportedInMultiActions: false` is required in manifest.
- **Marketplace DRM requirements:** SDK v2 is required for DRM but the specific validation process and submission timeline are unresearched. Defer to Phase 4.
- **QoS 1/2 memory growth at scale:** MQTT.js issue #161 documents ~4KB/second memory growth with QoS 1/2. Default QoS 0 mitigates this; verify in a 32-button soak test during Phase 3.

## Sources

### Primary (HIGH confidence — official documentation)
- [Elgato Stream Deck SDK — Getting Started](https://docs.elgato.com/streamdeck/sdk/introduction/getting-started/)
- [Elgato Stream Deck SDK — Settings Guide](https://docs.elgato.com/streamdeck/sdk/guides/settings/)
- [Elgato Stream Deck SDK — Property Inspectors](https://docs.elgato.com/streamdeck/sdk/guides/ui/)
- [Elgato Stream Deck SDK — Manifest Reference](https://docs.elgato.com/streamdeck/sdk/references/manifest/)
- [Elgato Stream Deck CLI](https://docs.elgato.com/streamdeck/cli/intro/)
- [@elgato/streamdeck on npm](https://www.npmjs.com/package/@elgato/streamdeck) — v2.0.4, 2026-03-19
- [@elgato/cli on npm](https://www.npmjs.com/package/@elgato/cli) — v1.7.3, 2026-03-17
- [MQTT.js on GitHub](https://github.com/mqttjs/MQTT.js) — v5.x TypeScript API
- [mqtt on npm](https://www.npmjs.com/package/mqtt) — v5.15.0, 2026-02

### Secondary (MEDIUM confidence — community and existing implementations)
- [pherting/streamdeck-mqtt](https://github.com/pherting/streamdeck-mqtt) — most popular MQTT plugin; publish-only; legacy SDK
- [hobbyquaker/streamdeck-plugin-mqtt](https://github.com/hobbyquaker/streamdeck-plugin-mqtt) — only bidirectional MQTT plugin; 5 stars, no releases, legacy SDK
- [cgiesche/streamdeck-homeassistant](https://github.com/cgiesche/streamdeck-homeassistant) — gold standard IoT SD plugin; reference for features and UX patterns
- [basnijholt/home-assistant-streamdeck-yaml](https://github.com/basnijholt/home-assistant-streamdeck-yaml) — advanced rendering patterns reference
- [Stream Deck Lambda Plugin Tutorial (2025)](https://mauricebrg.com/2025/06/streamdeck-lambda-trigger.html) — real-world Rollup config example

### Tertiary (LOW confidence — known issues, needs validation)
- [MQTT.js Issue #791](https://github.com/mqttjs/MQTT.js/issues/791) — memory leak with multiple connections
- [MQTT.js Issue #161](https://github.com/mqttjs/MQTT.js/issues/161) — QoS 1/2 memory growth
- [MQTT.js Issue #1157](https://github.com/mqttjs/MQTT.js/issues/1157) — resubscribe bug after reconnect
- [MQTT.js Issue #1727](https://github.com/mqttjs/MQTT.js/issues/1727) — post-reconnect publish failure

---
*Research completed: 2026-03-25*
*Ready for roadmap: yes*
