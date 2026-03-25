# Requirements: stream-deck-master

**Defined:** 2026-03-25
**Core Value:** Ein Button auf dem Stream Deck zeigt den aktuellen MQTT-Status UND kann ihn per Tastendruck ändern — bidirektional, live, ohne Umwege.

## v1 Requirements

### Connection

- [x] **CONN-01**: Plugin verbindet sich mit einem MQTT-Broker über TCP (Host + Port konfigurierbar)
- [x] **CONN-02**: Plugin unterstützt optionale Username/Passwort-Authentifizierung
- [x] **CONN-03**: Plugin unterstützt TLS/SSL-verschlüsselte Verbindungen
- [x] **CONN-04**: Plugin verbindet sich automatisch wieder nach Verbindungsverlust (Auto-Reconnect)
- [x] **CONN-05**: Mehrere Buttons können denselben Broker nutzen (Connection Pooling per Broker)
- [x] **CONN-06**: Broker-Credentials werden sicher in Global Settings gespeichert (nicht in exportierbaren Action Settings)

### Publish

- [x] **PUB-01**: User kann per Tastendruck ein konfigurierbares Payload an ein konfigurierbares MQTT-Topic senden
- [x] **PUB-02**: User kann QoS-Level (0, 1, 2) pro Button einstellen
- [x] **PUB-03**: User kann die Retain-Flag pro Publish-Aktion aktivieren/deaktivieren

### Subscribe

- [x] **SUB-01**: Button abonniert ein konfigurierbares MQTT-Topic und empfängt Nachrichten
- [x] **SUB-02**: Button-Titel aktualisiert sich live mit dem empfangenen MQTT-Wert
- [x] **SUB-03**: User kann einen JSON-Path angeben, um einen Wert aus einem JSON-Payload zu extrahieren (z.B. `temperature` aus `{"temperature": 22.5}`)
- [x] **SUB-04**: Subscriptions werden korrekt verwaltet (Subscribe bei willAppear, Unsubscribe bei willDisappear)

### Toggle

- [x] **TOGL-01**: Toggle-Modus wechselt zwischen zwei konfigurierbaren Payloads basierend auf dem aktuellen MQTT-State
- [x] **TOGL-02**: Toggle-State wird aus dem abonnierten Topic abgeleitet (nicht lokal getrackt)
- [x] **TOGL-03**: Button-State (Bild/Icon) ändert sich visuell basierend auf dem empfangenen MQTT-Wert

### UI

- [x] **UI-01**: Property Inspector bietet Konfiguration für Broker-Verbindung (Host, Port, Auth, TLS)
- [x] **UI-02**: Property Inspector bietet Konfiguration für Publish-Einstellungen (Topic, Payload, QoS, Retain)
- [x] **UI-03**: Property Inspector bietet Konfiguration für Subscribe-Einstellungen (Topic, JSON Path)
- [x] **UI-04**: Property Inspector bietet Toggle-Konfiguration (On-Payload, Off-Payload, On-Value, Off-Value)
- [x] **UI-05**: Button zeigt visuelles Feedback bei Broker-Disconnect (Connection Status Indicator)

### Architecture

- [x] **ARCH-01**: Plugin läuft als persistenter Node.js-Prozess mit stabiler MQTT-Verbindung
- [x] **ARCH-02**: ConnectionManager implementiert Singleton-Pattern mit Per-Broker Connection Pooling
- [x] **ARCH-03**: TopicRouter leitet eingehende MQTT-Nachrichten an die richtigen Buttons weiter (1:N Routing)
- [x] **ARCH-04**: Plugin ist kompatibel mit Stream Deck MK.2 (15 Tasten) und XL (32 Tasten)
- [ ] **ARCH-05**: Plugin kann lokal deployed werden auf macOS (Ziel: mini-von-jorg-7.local)

## v2 Requirements

### Display Polish

- **DISP-01**: State-basiertes Icon-Rendering (z.B. grün = an, rot = aus, grau = unbekannt)
- **DISP-02**: Display-Value-Formatting-Templates (`{{value}} °C`, `{{value}}%`)
- **DISP-03**: Farbkodierte Button-Hintergründe basierend auf MQTT-Werten

### Power Features

- **PWR-01**: Long-Press-Aktion (unterschiedliche Aktion bei kurzem vs. langem Drücken)
- **PWR-02**: Multi-Action-Button (ein Button publisht an mehrere Topics gleichzeitig)
- **PWR-03**: Last Will and Testament (LWT) Support
- **PWR-04**: Payload-Templates mit Variablen

### Distribution

- **DIST-01**: Plugin als `.streamDeckPlugin`-Installer verpackt
- **DIST-02**: Marketplace-Submission bei Elgato

### Hardware

- **HW-01**: Stream Deck + Dial/Touchscreen-Support
- **HW-02**: Multi-Action Container-Kompatibilität

## Out of Scope

| Feature | Reason |
|---------|--------|
| WebSocket MQTT Transport | Node.js Plugin nutzt native TCP — kein Browser-Kontext |
| Jinja2/Nunjucks Template Engine | Overkill für Button-Labels; einfache `{{value}}`-Substitution reicht |
| MQTT Discovery (Auto-Detect) | Home Assistant-Konvention, kein Standard-MQTT; koppelt an HA |
| Built-in Icon Library/Editor | Stream Deck hat eigene Icon-Verwaltung; Maintenance-Burden |
| Stream Deck Mobile Support | Anderes SDK, anderer Runtime-Kontext |
| Komplexe Conditional Logic | Plugin ist kein Programmier-Environment; Node-RED dafür nutzen |
| Dashboard/Multi-Page Navigation | Stream Deck hat native Profile/Pages |
| Zertifikat-Upload via Property Inspector | Komplexes File-Handling; Textfeld für Cert-Path reicht |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONN-01 | Phase 1 | Complete |
| CONN-02 | Phase 1 | Complete |
| CONN-03 | Phase 1 | Complete |
| CONN-04 | Phase 1 | Complete |
| CONN-05 | Phase 1 | Complete |
| CONN-06 | Phase 1 | Complete |
| PUB-01 | Phase 1 | Complete |
| PUB-02 | Phase 1 | Complete |
| PUB-03 | Phase 1 | Complete |
| SUB-01 | Phase 1 | Complete |
| SUB-02 | Phase 1 | Complete |
| SUB-03 | Phase 2 | Complete |
| SUB-04 | Phase 3 | Complete |
| TOGL-01 | Phase 2 | Complete |
| TOGL-02 | Phase 2 | Complete |
| TOGL-03 | Phase 2 | Complete |
| UI-01 | Phase 2 | Complete |
| UI-02 | Phase 2 | Complete |
| UI-03 | Phase 2 | Complete |
| UI-04 | Phase 2 | Complete |
| UI-05 | Phase 3 | Complete |
| ARCH-01 | Phase 1 | Complete |
| ARCH-02 | Phase 1 | Complete |
| ARCH-03 | Phase 1 | Complete |
| ARCH-04 | Phase 1 | Complete |
| ARCH-05 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after roadmap creation*
