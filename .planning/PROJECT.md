# stream-deck-master

## What This Is

Ein Elgato Stream Deck Plugin für bidirektionales MQTT. Nutzer können per Tastendruck MQTT-Nachrichten an beliebige Topics senden (Publish) und gleichzeitig Topics abonnieren (Subscribe), sodass der aktuelle Status live auf den Buttons angezeigt wird — Text, Bild und Button-State aktualisieren sich in Echtzeit. Das Plugin richtet sich an Smart-Home-Nutzer und IoT-Enthusiasten, die ihr Stream Deck als physisches Control Panel für MQTT-gesteuerte Geräte nutzen wollen.

## Core Value

Ein Button auf dem Stream Deck zeigt den aktuellen MQTT-Status UND kann ihn per Tastendruck ändern — bidirektional, live, ohne Umwege.

## Current State

**Shipped:** v1.0 MVP (2026-03-25)
**GitHub:** meintechblog/stream-deck-mqtt-master (v0.1.0 Release)
**Codebase:** 814 LOC TypeScript, 60 files
**Deployed:** Mac Mini (mini-von-jorg-7.local) via `npm run deploy`

## Requirements

### Validated

- ✓ Plugin verbindet sich mit einem MQTT-Broker (TCP, optional TLS) — v1.0
- ✓ Broker-Verbindung konfigurierbar: Host, Port, optional Username/Passwort — v1.0
- ✓ Button-Druck sendet konfigurierbares Payload an ein konfigurierbares MQTT-Topic (Publish) — v1.0
- ✓ Button abonniert ein konfigurierbares MQTT-Topic und aktualisiert sich bei Änderungen (Subscribe) — v1.0
- ✓ Button-Text zeigt den aktuellen Wert des abonnierten Topics an (dynamischer Titel) — v1.0
- ✓ Button-Bild/State ändert sich basierend auf dem empfangenen MQTT-Wert (z.B. an/aus) — v1.0
- ✓ Toggle-Modus: Button zeigt aktuellen State und toggled beim Drücken zwischen zwei Werten — v1.0
- ✓ Mehrere Buttons können denselben oder verschiedene Broker nutzen — v1.0
- ✓ Property Inspector UI zur Konfiguration pro Button (Broker, Topics, Payloads, QoS) — v1.0
- ✓ Plugin läuft als persistenter Node.js-Prozess mit stabiler MQTT-Verbindung — v1.0
- ✓ Reconnect-Logik bei Verbindungsverlust zum Broker — v1.0
- ✓ Kompatibel mit Stream Deck MK.2 (15 Tasten) und Stream Deck XL (32 Tasten) — v1.0
- ✓ Plugin zeigt sichtbaren Disconnect-Indikator wenn Broker unerreichbar — v1.0
- ✓ Button-Entfernung stoppt MQTT-Subscription, Wieder-Hinzufügen resubscribt — v1.0
- ✓ Plugin kann lokal deployed werden auf macOS — v1.0

### Active

(None — next milestone requirements TBD via `/gsd:new-milestone`)

### Out of Scope

- WebSocket-only MQTT (wir nutzen native TCP via Node.js — kein Browser-Kontext) — unnötig
- Home Assistant-spezifische Integration (Plugin ist generisch MQTT) — zu eng gekoppelt
- Stream Deck Mobile App Support — anderes SDK, anderer Kontext
- Stream Deck + Dial/Touchscreen-Support — v1 fokussiert auf LCD-Tasten

## Context

- **Broker:** Mosquitto auf 192.168.3.8:1883, kein Auth (aber Auth-Support im Plugin nötig)
- **Stream Deck Modelle:** MK.2 (15 Tasten) und XL (32 Tasten)
- **SDK:** Elgato Stream Deck SDK v2 (`@elgato/streamdeck`), Node.js 20+, TypeScript
- **MQTT Client:** `mqtt` npm-Package (unterstützt TCP, TLS, Auth, Reconnect)
- **Distribution:** GitHub Release v0.1.0 auf meintechblog/stream-deck-mqtt-master, Elgato Marketplace deferred
- **Deployment:** `npm run deploy` für Mac Mini, `npm run package` für .streamDeckPlugin Installer
- **Known Issue:** `tsc --noEmit` meldet 7 Fehler (setState auf union type) — Rollup Build funktioniert

## Constraints

- **SDK**: Elgato Stream Deck SDK v2 (`@elgato/streamdeck`) — Pflicht für Plugin-Kompatibilität
- **Runtime**: Node.js 20+ (von Stream Deck mitgeliefert) — keine externe Node.js-Installation nötig
- **Sprache**: TypeScript — SDK-Standard, Type Safety
- **Platform**: macOS (primär, Nutzer hat Mac), Windows-Kompatibilität wünschenswert
- **MQTT**: `mqtt` npm-Package — bewährter Standard, TCP + TLS + Auth + Auto-Reconnect

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Native TCP statt WebSocket | Node.js-Plugin kann direkt TCP nutzen, kein Browser-Kontext | ✓ Good |
| Elgato SDK v2 | Aktuelles SDK mit TypeScript-Support und Node.js Runtime | ✓ Good |
| `mqtt` npm-Package | Standard-MQTT-Client für Node.js, voller Feature-Support | ✓ Good |
| Generisches MQTT statt HA-spezifisch | Flexibler, nicht an eine Plattform gebunden | ✓ Good |
| Unified Action (eine Action für alle Modi) | Einfacher für User, weniger Code-Duplikation | ✓ Good |
| Broker-Credentials in Global Settings | Sicherheit: nicht in exportierbaren Action Settings | ✓ Good |
| ConnectionManager Singleton mit Per-Broker Pooling | Effizient: eine TCP-Verbindung pro Broker | ✓ Good |
| CJS Output für Rollup | Kompatibel mit Stream Deck Runtime | ✓ Good |
| sdpi-components für Property Inspector | Standard Elgato UI, kein Framework nötig | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-25 after v1.0 milestone*
