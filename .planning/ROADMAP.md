# Roadmap: stream-deck-master

## Overview

This roadmap delivers a bidirectional MQTT Stream Deck plugin in 3 phases. Phase 1 builds the core plugin architecture (ConnectionManager, TopicRouter) with publish and subscribe working end-to-end. Phase 2 adds toggle mode and the Property Inspector settings UI, making the plugin fully configurable by users. Phase 3 hardens the plugin with connection status feedback, proper subscription lifecycle management, and validates local deployment on the target Mac Mini.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Core MQTT Plugin** - ConnectionManager, publish on press, subscribe with live title updates
- [ ] **Phase 2: Toggle + Settings UI** - Toggle mode, Property Inspector configuration, JSON path extraction
- [ ] **Phase 3: Hardening + Deployment** - Connection status indicator, subscription lifecycle, local deployment

## Phase Details

### Phase 1: Core MQTT Plugin
**Goal**: User can install the plugin, connect to an MQTT broker, press a button to publish a message, and see live MQTT values on button titles
**Depends on**: Nothing (first phase)
**Requirements**: CONN-01, CONN-02, CONN-03, CONN-04, CONN-05, CONN-06, PUB-01, PUB-02, PUB-03, SUB-01, SUB-02, ARCH-01, ARCH-02, ARCH-03, ARCH-04
**Success Criteria** (what must be TRUE):
  1. Plugin connects to Mosquitto broker at 192.168.3.8:1883 and stays connected across Stream Deck restarts
  2. Pressing a button publishes a configured payload to a configured MQTT topic (verifiable via `mosquitto_sub`)
  3. Button title updates in real-time when a subscribed MQTT topic receives a new value (verifiable via `mosquitto_pub`)
  4. After broker goes offline and comes back, plugin reconnects and subscriptions resume delivering values without user intervention
  5. Multiple buttons sharing the same broker use a single TCP connection (verifiable via broker connection count)
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Scaffold project, types, ConnectionManager + TopicRouter services
- [ ] 01-02-PLAN.md — Unified MqttAction, Property Inspector, plugin entry point + build
- [ ] 01-03-PLAN.md — Deploy to Mac Mini, E2E hardware verification

### Phase 2: Toggle + Settings UI
**Goal**: User can configure all button settings through a visual Property Inspector and use toggle buttons that reflect and change MQTT device state
**Depends on**: Phase 1
**Requirements**: TOGL-01, TOGL-02, TOGL-03, SUB-03, UI-01, UI-02, UI-03, UI-04
**Success Criteria** (what must be TRUE):
  1. User can configure broker connection (host, port, auth, TLS) through the Property Inspector without editing files
  2. Toggle button shows current device state from MQTT and switches to the opposite state on press (e.g., light on/off)
  3. Toggle state is always derived from the subscribed MQTT topic, not tracked locally (unplugging and replugging the button shows correct state)
  4. User can extract a value from a JSON MQTT payload using a configured JSON path (e.g., `temperature` from `{"temperature": 22.5}` displays as `22.5`)
  5. Button image/state changes visually based on the received MQTT value (distinct appearance for on vs off)
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Hardening + Deployment
**Goal**: Plugin handles edge cases gracefully and runs reliably on the target Mac Mini as a daily-use smart home controller
**Depends on**: Phase 2
**Requirements**: SUB-04, UI-05, ARCH-05
**Success Criteria** (what must be TRUE):
  1. Button shows a visible disconnect indicator when the MQTT broker is unreachable (user knows something is wrong without checking logs)
  2. Removing a button from the Stream Deck layout stops its MQTT subscription; re-adding it resubscribes (no stale subscriptions accumulate)
  3. Plugin is deployed and running on mini-von-jorg-7.local, surviving Stream Deck app restarts, with buttons controlling real MQTT devices
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core MQTT Plugin | 0/3 | Not started | - |
| 2. Toggle + Settings UI | 0/3 | Not started | - |
| 3. Hardening + Deployment | 0/2 | Not started | - |
