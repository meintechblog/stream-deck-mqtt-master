# Phase 1: Core MQTT Plugin - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the foundational Stream Deck plugin with bidirectional MQTT: ConnectionManager for broker connections, TopicRouter for message routing, basic Publish on button press, and Subscribe with live title updates. Includes minimal Property Inspector for configuration. This phase delivers a working end-to-end MQTT plugin that can be sideloaded on the target Mac Mini.

</domain>

<decisions>
## Implementation Decisions

### Action Design
- **D-01:** Unified Action — one "MQTT" action type that handles Publish, Subscribe, and Toggle via configuration. No separate action types.
- **D-02:** 2 Button States — State 0 (off/default) and State 1 (on/active). Covers toggle and status display use cases.

### Plugin Identity
- **D-03:** Plugin name: **MQTT Master**
- **D-04:** Plugin UUID: `io.github.meintechblog.mqtt-master` (reverse-DNS based on GitHub user)
- **D-05:** GitHub repo: `meintechblog/stream-deck-mqtt-master` (to be created)

### Connection Sharing
- **D-06:** Phase 1 includes a minimal Property Inspector (basic HTML form for Host/Port/Topic/Payload). Functional but unstyled. Phase 2 polishes the UI.
- **D-07:** Single broker support in Phase 1. ConnectionManager architecture should be ready for multi-broker, but UI only supports one broker config. Multi-broker comes in Phase 2+.

### Dev Workflow
- **D-08:** Development and testing directly on remote Mac Mini (`ssh admin@mini-von-jorg-7.local`). Stream Deck app runs there, plugin sideloaded into `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`.
- **D-09:** Use `streamdeck create` CLI scaffolding for project initialization. Generates Rollup config, manifest.json, TypeScript setup.

### Claude's Discretion
- ConnectionManager internal architecture (singleton pattern, connection pooling data structures)
- TopicRouter implementation (topic→context mapping, subscription reference counting)
- Rollup bundling configuration for `mqtt` npm package
- Error handling and logging patterns
- TypeScript strict mode and configuration details

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Stream Deck SDK
- `.planning/research/STACK.md` — SDK versions, mqtt package version, build tooling
- `.planning/research/ARCHITECTURE.md` — Plugin structure, ConnectionManager pattern, TopicRouter, manifest.json template

### MQTT Integration
- `.planning/research/PITFALLS.md` — Critical pitfalls: reconnect bugs, credential storage, rate limiting
- `.planning/research/FEATURES.md` — Competitor analysis, feature gap that this plugin fills

### Project Context
- `.planning/PROJECT.md` — Project vision, constraints, MQTT broker details (192.168.3.8:1883)
- `.planning/REQUIREMENTS.md` — Phase 1 requirements: CONN-01..06, PUB-01..03, SUB-01..02, ARCH-01..04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes the patterns

### Integration Points
- Stream Deck Plugin directory on Mac Mini: `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`
- MQTT Broker: Mosquitto at 192.168.3.8:1883 (no auth, TCP only)
- Existing plugins on Mac Mini: keycreator, OBS Studio, tutorial, volume-controller, Home Assistant (perdoctus)

</code_context>

<specifics>
## Specific Ideas

- Plugin name "MQTT Master" matches the repo name convention
- GitHub user `meintechblog` has `gh` CLI access configured
- Mac Mini runs macOS 26.2 with Stream Deck app already installed
- Development happens directly on the Mac Mini via SSH

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-core-mqtt-plugin*
*Context gathered: 2026-03-25*
