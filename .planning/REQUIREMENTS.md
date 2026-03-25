# Requirements: stream-deck-master

**Defined:** 2026-03-25
**Milestone:** v2.0 Power Features + Polish
**Core Value:** Ein Button auf dem Stream Deck zeigt den aktuellen MQTT-Status UND kann ihn per Tastendruck ändern — bidirektional, live, ohne Umwege.

## v2 Requirements

### Long Press

- [ ] **LP-01**: Langer Tastendruck (≥500ms) sendet konfigurierbares Long-Press-Payload an konfigurierbares Topic
- [ ] **LP-02**: Kurzer Tastendruck (<500ms) verhält sich wie bisher (normaler Publish/Toggle)
- [ ] **LP-03**: Wenn kein Long-Press-Payload konfiguriert ist, passiert bei langem Druck nichts
- [ ] **LP-04**: Property Inspector hat Felder für Long-Press Topic und Long-Press Payload

### Property Inspector Redesign

- [ ] **PI-01**: PI hat lesbaren, hellen Text auf dunklem Hintergrund (passend zum Stream Deck Dark Theme)
- [ ] **PI-02**: Sections sind visuell klar getrennt (Broker, Publish, Subscribe, Toggle, Long Press)
- [ ] **PI-03**: PI nutzt Custom CSS über sdpi-components hinaus für modernes Erscheinungsbild

### Display

- [ ] **DISP-01**: User kann ein Display-Template pro Button konfigurieren (z.B. `{{value}} °C`)
- [ ] **DISP-02**: Template wird auf den empfangenen MQTT-Wert angewendet und als Button-Titel angezeigt

### Quality

- [ ] **QUAL-01**: `tsc --noEmit` läuft fehlerfrei durch (setState union type Fehler behoben)

## Future Requirements

### Display Polish (deferred from v2)
- **DISP-03**: Farbkodierte Button-Hintergründe basierend auf MQTT-Werten
- **DISP-04**: Custom Icons pro State (on/off/unknown)

### Power Features (deferred)
- **PWR-02**: Multi-Action-Button (ein Button publisht an mehrere Topics gleichzeitig)
- **PWR-03**: Last Will and Testament (LWT) Support
- **PWR-04**: Payload-Templates mit Variablen
- **LP-05**: Konfigurierbarer Long-Press Threshold (aktuell hardcoded 500ms)
- **LP-06**: Visuelles Feedback während Long Press (Farbänderung)

### Distribution (deferred)
- **DIST-02**: Marketplace-Submission bei Elgato

### Hardware (deferred)
- **HW-01**: Stream Deck + Dial/Touchscreen-Support
- **HW-02**: Multi-Action Container-Kompatibilität

## Out of Scope

| Feature | Reason |
|---------|--------|
| WebSocket MQTT Transport | Node.js Plugin nutzt native TCP — kein Browser-Kontext |
| Home Assistant-spezifische Integration | Plugin ist generisch MQTT, nicht an HA gekoppelt |
| Stream Deck Mobile Support | Anderes SDK, anderer Runtime-Kontext |
| Konfigurierbarer Long-Press Threshold | v2 nutzt feste 500ms — bei Bedarf in v3 konfigurierbar |
| React/Vue/Svelte für PI | sdpi-components + Custom CSS reichen — kein Framework nötig |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| QUAL-01 | Phase 4 | Pending |
| LP-01 | Phase 4 | Pending |
| LP-02 | Phase 4 | Pending |
| LP-03 | Phase 4 | Pending |
| LP-04 | Phase 4 | Pending |
| PI-01 | Phase 5 | Pending |
| PI-02 | Phase 5 | Pending |
| PI-03 | Phase 5 | Pending |
| DISP-01 | Phase 6 | Pending |
| DISP-02 | Phase 6 | Pending |

**Coverage:**
- v2 requirements: 10 total
- Mapped to phases: 10
- Unmapped: 0

---
*Requirements defined: 2026-03-25*
*Last updated: 2026-03-25 after v2.0 roadmap creation*
