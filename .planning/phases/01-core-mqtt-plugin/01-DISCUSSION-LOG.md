# Phase 1: Core MQTT Plugin - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 01-core-mqtt-plugin
**Areas discussed:** Action Design, Plugin Identity, Connection Sharing, Dev Workflow

---

## Action Design

### Action Types

| Option | Description | Selected |
|--------|-------------|----------|
| Unified Action | Eine Action 'MQTT' die alles kann: Publish, Subscribe, Toggle — konfigurierbar pro Button | ✓ |
| Getrennte Actions | 3 separate Actions: 'MQTT Publish', 'MQTT Subscribe', 'MQTT Toggle' | |
| You decide | Claude wählt den besten Ansatz | |

**User's choice:** Unified Action (Recommended)
**Notes:** Weniger Clutter im Action-Menü, ein Action-Typ für alles

### Button States

| Option | Description | Selected |
|--------|-------------|----------|
| 2 States | State 0 (off/default) und State 1 (on/active) | ✓ |
| 1 State | Nur ein State, dynamisches Bild/Text via setTitle/setImage | |
| You decide | Claude wählt basierend auf SDK-Capabilities | |

**User's choice:** 2 States (Recommended)
**Notes:** Deckt Toggle und Status-Anzeige ab

---

## Plugin Identity

### Plugin Name

| Option | Description | Selected |
|--------|-------------|----------|
| MQTT Control | Klar und beschreibend | |
| MQTT Bridge | Betont die bidirektionale Verbindung | |
| MQTT Master | Passt zum Repo-Namen stream-deck-master | ✓ |

**User's choice:** MQTT Master
**Notes:** Konsistent mit Repo-Name

### Plugin UUID

| Option | Description | Selected |
|--------|-------------|----------|
| dev.mqtt-master | Projekt-basiert | |
| io.streamdeck.mqtt-master | Generisch | |
| Eigene Domain | User hat eine eigene Domain | |

**User's choice:** io.github.meintechblog.mqtt-master (custom — based on GitHub user `meintechblog` and repo `stream-deck-mqtt-master`)
**Notes:** User plant Veröffentlichung unter GitHub user meintechblog. `gh` CLI ist authentifiziert.

---

## Connection Sharing

### Phase 1 Config Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal PI | Einfaches HTML-Formular für Host/Port/Topic/Payload — funktional aber hässlich | ✓ |
| Hardcoded defaults | Erstmal alles auf 192.168.3.8:1883 hardcoden | |
| You decide | Claude wählt | |

**User's choice:** Minimal PI (Recommended)
**Notes:** Phase 2 macht es hübsch

### Broker Pool

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-Broker ready | ConnectionManager pooled per Broker-Key | |
| Single Broker | Erstmal nur ein Broker | ✓ |
| You decide | Claude entscheidet | |

**User's choice:** Single Broker
**Notes:** Architektur soll multi-broker-ready sein, aber UI zeigt erstmal nur einen

---

## Dev Workflow

### Dev Target

| Option | Description | Selected |
|--------|-------------|----------|
| Remote Mac Mini | Direkt auf mini-von-jorg-7.local entwickeln | ✓ |
| Lokal + Deploy | Lokal entwickeln, per SCP deployen | |
| You decide | Claude wählt | |

**User's choice:** Remote Mac Mini (Recommended)
**Notes:** ssh admin@mini-von-jorg-7.local, Stream Deck App läuft dort

### SDK Setup

| Option | Description | Selected |
|--------|-------------|----------|
| streamdeck create | Elgato CLI Scaffolding | ✓ |
| Manual Setup | Alles von Hand | |
| You decide | Claude wählt | |

**User's choice:** streamdeck create (Recommended)
**Notes:** Generiert Boilerplate, Rollup Config, manifest.json

---

## Claude's Discretion

- ConnectionManager architecture (singleton, pooling)
- TopicRouter implementation (topic→context mapping)
- Rollup bundling configuration for mqtt package
- Error handling and logging patterns
- TypeScript configuration

## Deferred Ideas

None — discussion stayed within phase scope
