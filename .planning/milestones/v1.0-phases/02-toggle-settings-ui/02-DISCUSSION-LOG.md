# Phase 2: Toggle + Settings UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 02-toggle-settings-ui
**Areas discussed:** Toggle UX, PI Design, JSON Path, State Visuals

---

## Toggle UX

### MQTT Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Separate Topics | Publish-Topic für Kommando, Subscribe-Topic für Status. Tasmota/Shelly-Pattern | ✓ |
| Gleiches Topic | Ein Topic für beides | |
| You decide | Claude wählt | |

**User's choice:** Separate Topics (Recommended)

### Toggle Values

| Option | Description | Selected |
|--------|-------------|----------|
| Frei konfigurierbar | User gibt On-Payload, Off-Payload, On-Value, Off-Value ein | ✓ |
| Vordefinierte Presets | Dropdown mit gängigen Patterns | |
| You decide | Claude wählt | |

**User's choice:** Frei konfigurierbar (Recommended)

---

## PI Design

### Credential Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Action Settings | Bleibt wie Phase 1, sdpi-components Auto-Binding | ✓ |
| Global Settings | Sicherer (CONN-06), custom JS nötig | |
| You decide | Claude wählt | |

**User's choice:** Action Settings (Recommended)

### PI Styling

| Option | Description | Selected |
|--------|-------------|----------|
| sdpi-components Standard | Elgato's Web Components, native Look | ✓ |
| Custom CSS | Eigenes Design | |
| You decide | Claude wählt | |

**User's choice:** sdpi-components Standard

---

## JSON Path

### Syntax

| Option | Description | Selected |
|--------|-------------|----------|
| Dot-Notation | Einfach, kein extra Package | |
| JSONPath | Volle Syntax, braucht npm-Package | |
| You decide | Claude wählt | ✓ |

**User's choice:** You decide (Claude's Discretion)

### Formatting

| Option | Description | Selected |
|--------|-------------|----------|
| Ja, einfaches Template | {{value}} Platzhalter | ✓ |
| Nein, Rohwert | Direkter Wert | |
| You decide | Claude wählt | |

**User's choice:** Ja, einfaches Template

---

## State Visuals

### Toggle Display

| Option | Description | Selected |
|--------|-------------|----------|
| SDK setState | 2 States aus manifest.json | ✓ |
| Dynamisches setImage | Programmatische Bildgenerierung | |
| You decide | Claude wählt | |

**User's choice:** SDK setState (after explanation about 2-state system)
**Notes:** User fragte ob es immer nur 2 Bilder gibt → Ja, setState(0/1) wechselt zwischen 2 Icons

### Default Icons

| Option | Description | Selected |
|--------|-------------|----------|
| MQTT Logo Varianten | Grau/grün MQTT-Logo | |
| Generische Toggle-Icons | Kreis grau/grün | |
| You decide | Claude wählt | ✓ |

**User's choice:** You decide

---

## Claude's Discretion

- JSON path implementation (dot-notation vs jsonpath-plus)
- Default icon design
- PI field grouping
- Toggle logic implementation
- Error state handling

## Deferred Ideas

None
