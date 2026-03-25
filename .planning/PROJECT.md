# stream-deck-master

## What This Is

Ein Elgato Stream Deck Plugin für bidirektionales MQTT. Nutzer können per Tastendruck MQTT-Nachrichten an beliebige Topics senden (Publish) und gleichzeitig Topics abonnieren (Subscribe), sodass der aktuelle Status live auf den Buttons angezeigt wird — Text, Bild und Button-State aktualisieren sich in Echtzeit. Das Plugin richtet sich an Smart-Home-Nutzer und IoT-Enthusiasten, die ihr Stream Deck als physisches Control Panel für MQTT-gesteuerte Geräte nutzen wollen.

## Core Value

Ein Button auf dem Stream Deck zeigt den aktuellen MQTT-Status UND kann ihn per Tastendruck ändern — bidirektional, live, ohne Umwege.

## Requirements

### Validated

- [x] Plugin zeigt sichtbaren Disconnect-Indikator wenn Broker unerreichbar (Phase 3: SUB-04, UI-05)
- [x] Button-Entfernung stoppt MQTT-Subscription, Wieder-Hinzufügen resubscribt (Phase 3: SUB-04)
- [x] Plugin kann lokal deployed werden auf macOS (Phase 3: ARCH-05)

### Active

- [ ] Plugin verbindet sich mit einem MQTT-Broker (TCP, optional TLS)
- [ ] Broker-Verbindung konfigurierbar: Host, Port, optional Username/Passwort
- [ ] Button-Druck sendet konfigurierbares Payload an ein konfigurierbares MQTT-Topic (Publish)
- [ ] Button abonniert ein konfigurierbares MQTT-Topic und aktualisiert sich bei Änderungen (Subscribe)
- [ ] Button-Text zeigt den aktuellen Wert des abonnierten Topics an (dynamischer Titel)
- [ ] Button-Bild/State ändert sich basierend auf dem empfangenen MQTT-Wert (z.B. an/aus)
- [ ] Toggle-Modus: Button zeigt aktuellen State und toggled beim Drücken zwischen zwei Werten
- [ ] Mehrere Buttons können denselben oder verschiedene Broker nutzen
- [ ] Property Inspector UI zur Konfiguration pro Button (Broker, Topics, Payloads, QoS)
- [ ] Plugin läuft als persistenter Node.js-Prozess mit stabiler MQTT-Verbindung
- [ ] Reconnect-Logik bei Verbindungsverlust zum Broker
- [ ] Kompatibel mit Stream Deck MK.2 (15 Tasten) und Stream Deck XL (32 Tasten)

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
- **Bestehendes Plugin:** Marketplace hat nur Publish-only Plugin (keine Subscribe-Funktion)
- **Vorteil:** Unser Plugin nutzt nativen TCP-MQTT (Port 1883), kein WebSocket nötig
- **Distribution:** GitHub Release v0.1.0 auf meintechblog/stream-deck-mqtt-master, Elgato Marketplace deferred
- **Deployment:** `npm run deploy` für Mac Mini, `npm run package` für .streamDeckPlugin Installer

## Constraints

- **SDK**: Elgato Stream Deck SDK v2 (`@elgato/streamdeck`) — Pflicht für Plugin-Kompatibilität
- **Runtime**: Node.js 20+ (von Stream Deck mitgeliefert) — keine externe Node.js-Installation nötig
- **Sprache**: TypeScript — SDK-Standard, Type Safety
- **Platform**: macOS (primär, Nutzer hat Mac), Windows-Kompatibilität wünschenswert
- **MQTT**: `mqtt` npm-Package — bewährter Standard, TCP + TLS + Auth + Auto-Reconnect

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Native TCP statt WebSocket | Node.js-Plugin kann direkt TCP nutzen, kein Browser-Kontext | — Pending |
| Elgato SDK v2 | Aktuelles SDK mit TypeScript-Support und Node.js Runtime | — Pending |
| `mqtt` npm-Package | Standard-MQTT-Client für Node.js, voller Feature-Support | — Pending |
| Generisches MQTT statt HA-spezifisch | Flexibler, nicht an eine Plattform gebunden | — Pending |

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
*Last updated: 2026-03-25 after Phase 3 completion*
