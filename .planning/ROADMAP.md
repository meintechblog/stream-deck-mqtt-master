# Roadmap: stream-deck-master

## Milestones

- [x] **v1.0 MVP** - Phases 1-3 (shipped 2026-03-25)
- [ ] **v2.0 Power Features + Polish** - Phases 4-6 (in progress)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-3) - SHIPPED 2026-03-25</summary>

- [x] **Phase 1: Plugin Scaffold + MQTT Core** - ConnectionManager, TopicRouter, basic MqttAction
- [x] **Phase 2: Toggle + Settings UI** - Toggle mode, JSON path, auth/TLS, full Property Inspector
- [x] **Phase 3: Hardening + Deploy** - Status indicators, reconnect, cleanup, deploy pipeline

</details>

### v2.0 Power Features + Polish

- [ ] **Phase 4: Type Safety + Long Press** - Fix tsc errors and add long press as second interaction mode
- [ ] **Phase 5: PI Redesign** - Dark theme overhaul with clear section separation and modern styling
- [ ] **Phase 6: Display Templates** - Template-based button titles with value substitution

## Phase Details

### Phase 4: Type Safety + Long Press
**Goal**: Users can long-press a button to send a different payload than short press, with a type-clean codebase
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: QUAL-01, LP-01, LP-02, LP-03, LP-04
**Success Criteria** (what must be TRUE):
  1. `tsc --noEmit` exits with zero errors
  2. User can configure a long-press topic and payload in the Property Inspector
  3. Holding a button for 500ms+ sends the long-press payload to the configured topic
  4. Short press (<500ms) still sends the normal publish/toggle payload unchanged
  5. A button with no long-press payload configured ignores long presses entirely
**Plans:** 2 plans
Plans:
- [x] 04-01-PLAN.md — Fix tsc errors (isKey guard) + add Long Press settings schema and PI fields
- [x] 04-02-PLAN.md — Refactor onKeyDown to onKeyUp with long press duration routing

### Phase 5: PI Redesign
**Goal**: Users see a polished, readable Property Inspector that matches the Stream Deck dark aesthetic
**Depends on**: Phase 4
**Requirements**: PI-01, PI-02, PI-03
**Success Criteria** (what must be TRUE):
  1. All PI text is clearly readable (light text on dark background, no low-contrast elements)
  2. Broker, Publish, Subscribe, Toggle, and Long Press sections are visually separated with clear headings
  3. PI styling extends beyond default sdpi-components with custom CSS for a modern look
**Plans:** 1 plan
Plans:
- [ ] 05-01-PLAN.md — Dark theme CSS + accordion HTML restructure with advanced toggles
**UI hint**: yes

### Phase 6: Display Templates
**Goal**: Users can format button titles with templates that include the live MQTT value
**Depends on**: Phase 4
**Requirements**: DISP-01, DISP-02
**Success Criteria** (what must be TRUE):
  1. User can enter a display template (e.g. `{{value}} °C`) in the Property Inspector
  2. Button title shows the template with `{{value}}` replaced by the current MQTT payload in real time
**Plans**: TBD

## Progress

**Execution Order:** Phase 4 -> Phase 5 -> Phase 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Plugin Scaffold + MQTT Core | v1.0 | 2/2 | Complete | 2026-03-25 |
| 2. Toggle + Settings UI | v1.0 | 3/3 | Complete | 2026-03-25 |
| 3. Hardening + Deploy | v1.0 | 3/3 | Complete | 2026-03-25 |
| 4. Type Safety + Long Press | v2.0 | 0/2 | Planning | - |
| 5. PI Redesign | v2.0 | 0/1 | Planned | - |
| 6. Display Templates | v2.0 | 0/? | Not started | - |
