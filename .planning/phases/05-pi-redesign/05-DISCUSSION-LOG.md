# Phase 5: PI Redesign - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 05-pi-redesign
**Areas discussed:** Visual style, Section design, Field layout

---

## Visual Style

| Option | Description | Selected |
|--------|-------------|----------|
| Stream Deck nativ | Dunkles Grau (#2D2D2D), weißer Text, blaue Akzente (#0078D7) | ✓ |
| Dunkler + Akzentfarbe | Fast schwarz (#1A1A1A), Akzentfarbe (grün/orange/cyan) | |
| Du entscheidest | Claude wählt | |

**User's choice:** Stream Deck nativ — seamless integration with the app.

---

## Section Design

| Option | Description | Selected |
|--------|-------------|----------|
| Collapsible Sections | Accordion, ein-/ausklappbar, Broker offen by default | ✓ |
| Feste Sections mit Rahmen | Alle sichtbar, visuell getrennt durch Karten | |
| Tabs | Tab-Leiste oben, eine Section sichtbar | |

**User's choice:** Collapsible Sections — saves space, user sees only what they need.

---

## Field Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Advanced Toggle | Standard-Felder sichtbar, QoS/Retain/JSON Path/TLS hinter "Show Advanced" | ✓ |
| Alles sichtbar | Collapsible Sections reichen für Übersicht | |
| Du entscheidest | Claude entscheidet | |

**User's choice:** Advanced Toggle — hide power-user fields by default.

---

## Claude's Discretion

- Exact CSS values, font sizes, padding
- Accordion implementation (`<details>/<summary>` vs CSS hack)
- Advanced toggle visual design
- Section header icons
- Animation approach
