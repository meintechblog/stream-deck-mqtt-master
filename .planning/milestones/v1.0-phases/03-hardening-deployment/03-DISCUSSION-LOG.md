# Phase 3: Hardening + Deployment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-03-25
**Phase:** 03-hardening-deployment
**Areas discussed:** Disconnect-Anzeige, Deployment-Script

---

## Disconnect-Anzeige

| Option | Description | Selected |
|--------|-------------|----------|
| Titel ändern | Button-Text wird "⚠ Offline" | ✓ |
| State 0 + Text | Button dunkel + "Offline" | |
| You decide | Claude wählt | |

**User's choice:** Titel ändern (Recommended)

---

## Deployment-Script

| Option | Description | Selected |
|--------|-------------|----------|
| npm run deploy | build + scp + restart | ✓ |
| Makefile | make deploy | |
| You decide | Claude wählt | |

**User's choice:** User wants full distribution — .streamDeckPlugin installer for GitHub Release, plus npm run deploy for dev
**Notes:** User wants it available for download. First GitHub Release, later Elgato Marketplace.

---

## Claude's Discretion

- Disconnect detection implementation
- Deploy/package script details
- GitHub repo setup
- README content

## Deferred Ideas

- Elgato Marketplace submission (v2)
- MQTT topic browser web UI (separate project)
