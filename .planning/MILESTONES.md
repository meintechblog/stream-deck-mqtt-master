# Milestones

## v1.0 MVP (Shipped: 2026-03-25)

**Phases completed:** 3 phases, 8 plans, 12 tasks

**Key accomplishments:**

- Stream Deck MQTT Master plugin scaffold with ConnectionManager (per-broker pooling, auto-reconnect, TLS) and TopicRouter (1:N topic-to-button routing with ref counting)
- Unified MqttAction with publish-on-press, subscribe-on-appear, live PI topic changes, and minimal Property Inspector with sdpi-components for broker and action configuration
- Status:
- Extended MqttActionSettings with auth/TLS/toggle/JSON-path fields, resolveJsonPath utility with 12 passing tests, and complete 4-section Property Inspector with 16 sdpi-component fields
- Toggle-aware MqttAction with JSON path extraction, display templates, setState feedback, and auth/TLS passthrough
- Status:
- Status listener registry in ConnectionManager with offline/reconnect button notifications and full memory cleanup in MqttAction
- Deploy script with scp to Mac Mini, streamdeck pack for .streamDeckPlugin installer, and v0.1.0 GitHub Release on meintechblog/stream-deck-mqtt-master

---
