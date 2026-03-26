# stream-deck-master

## What This Is

Ein Elgato Stream Deck Plugin für bidirektionales MQTT. Nutzer können per Tastendruck MQTT-Nachrichten an beliebige Topics senden (Publish) und gleichzeitig Topics abonnieren (Subscribe), sodass der aktuelle Status live auf den Buttons angezeigt wird — Text, Bild und Button-State aktualisieren sich in Echtzeit. Das Plugin richtet sich an Smart-Home-Nutzer und IoT-Enthusiasten, die ihr Stream Deck als physisches Control Panel für MQTT-gesteuerte Geräte nutzen wollen.

## Core Value

Ein Button auf dem Stream Deck zeigt den aktuellen MQTT-Status UND kann ihn per Tastendruck ändern — bidirektional, live, ohne Umwege.

## Current State

**Shipped:** v2.0 Power Features + Polish (2026-03-26)
**Previous:** v1.0 MVP (2026-03-25)
**GitHub:** meintechblog/stream-deck-mqtt-master
**Codebase:** 859 LOC TypeScript
**Deployed:** Mac Mini (mini-von-jorg-7.local) via `npm run deploy`

## Requirements

### Validated

- ✓ Plugin verbindet sich mit einem MQTT-Broker (TCP, optional TLS) — v1.0
- ✓ Broker-Verbindung konfigurierbar: Host, Port, optional Username/Passwort — v1.0
- ✓ Button-Druck sendet konfigurierbares Payload an ein konfigurierbares MQTT-Topic — v1.0
- ✓ Button abonniert ein konfigurierbares MQTT-Topic und aktualisiert sich live — v1.0
- ✓ Button-Text zeigt den aktuellen Wert des abonnierten Topics an — v1.0
- ✓ Button-State ändert sich basierend auf empfangenem MQTT-Wert — v1.0
- ✓ Toggle-Modus mit konfigurierbaren On/Off-Werten — v1.0
- ✓ Mehrere Buttons können denselben oder verschiedene Broker nutzen — v1.0
- ✓ Property Inspector UI zur Konfiguration pro Button — v1.0
- ✓ Persistenter Node.js-Prozess mit stabiler MQTT-Verbindung — v1.0
- ✓ Auto-Reconnect bei Verbindungsverlust — v1.0
- ✓ Kompatibel mit Stream Deck MK.2 und XL — v1.0
- ✓ Disconnect-Indikator auf Buttons — v1.0
- ✓ Subscription Lifecycle (willAppear/willDisappear) — v1.0
- ✓ macOS Deployment — v1.0
- ✓ `tsc --noEmit` fehlerfrei (isKey() type guards) — v2.0
- ✓ Long Press: 500ms Threshold, eigenes Topic+Payload, opt-in — v2.0
- ✓ PI Redesign: Dark Theme, Accordion Sections, Advanced Toggles — v2.0
- ✓ Display Templates: `{{value}} °C` Substitution — v1.0 (D-17)

### Active

(None — next milestone requirements TBD via `/gsd:new-milestone`)

### Out of Scope

- WebSocket-only MQTT — Node.js nutzt native TCP
- Home Assistant-spezifische Integration — Plugin ist generisch MQTT
- Stream Deck Mobile App Support — anderes SDK
- Stream Deck + Dial/Touchscreen-Support — LCD-Tasten Only
- Multi-Action Button — aus v2.0 Scope entfernt (nicht benötigt)
- Konfigurierbarer Long-Press Threshold — v2 nutzt feste 500ms

## Context

- **Broker:** Mosquitto auf 192.168.3.8:1883
- **Stream Deck Modelle:** MK.2 (15 Tasten) und XL (32 Tasten)
- **SDK:** Elgato Stream Deck SDK v2, Node.js 20+, TypeScript
- **MQTT Client:** `mqtt` npm-Package
- **Distribution:** GitHub Release auf meintechblog/stream-deck-mqtt-master
- **Deployment:** `npm run deploy` für Mac Mini, `npm run package` für .streamDeckPlugin

## Constraints

- **SDK**: Elgato Stream Deck SDK v2 (`@elgato/streamdeck`)
- **Runtime**: Node.js 20+ (von Stream Deck mitgeliefert)
- **Sprache**: TypeScript
- **Platform**: macOS (primär), Windows-Kompatibilität wünschenswert
- **MQTT**: `mqtt` npm-Package

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Native TCP statt WebSocket | Node.js kann direkt TCP nutzen | ✓ Good |
| Elgato SDK v2 | TypeScript-Support, Node.js Runtime | ✓ Good |
| `mqtt` npm-Package | Standard-Client, voller Feature-Support | ✓ Good |
| Generisches MQTT statt HA-spezifisch | Flexibler, nicht an Plattform gebunden | ✓ Good |
| Unified Action | Eine Action für alle Modi | ✓ Good |
| ConnectionManager Singleton | Per-Broker Pooling, effizient | ✓ Good |
| CJS Output für Rollup | Kompatibel mit Stream Deck Runtime | ✓ Good |
| sdpi-components + Custom CSS | Standard Elgato UI + eigenes Dark Theme | ✓ Good |
| All publish on KeyUp | Ermöglicht Short/Long Press Unterscheidung | ✓ Good |
| `<details>/<summary>` Accordion | Pure HTML, kein Framework für PI | ✓ Good |
| Long Press blind send | Loxone changeTo/off ist idempotent | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

---
*Last updated: 2026-03-26 after v2.0 milestone*
