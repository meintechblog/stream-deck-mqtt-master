# Plan 01-03: Deploy and E2E Verification — Summary

**Status:** Complete
**Completed:** 2026-03-25

## What Was Built

Deployed the MQTT Master plugin to the Mac Mini (`mini-von-jorg-7.local`) and verified end-to-end MQTT functionality against the Mosquitto broker at 192.168.3.8:1883.

## Key Findings

### Tests Passed
- **Publish:** Button press sends configured payload to MQTT topic (verified via logs)
- **Subscribe:** Button title updates live when MQTT topic receives new value (verified: HALLO → 99 → Temperatur: 22°C)

### Issues Found and Fixed During Verification
1. **Broker settings not persisting:** sdpi-components `SDPIComponents.streamDeckClient` global settings API didn't work reliably. Fix: moved broker config to action settings with `setting="brokerHost"` auto-binding.
2. **Trailing whitespace in host:** PI textfield saved `"192.168.3.8 "` with trailing space, causing DNS resolution failure. Fix: trim in `getBrokerConfigFromSettings()`, `brokerKey()`, and `ConnectionManager.getOrCreate()`. Added auto-trim on `willAppear`.
3. **Manual title override:** Stream Deck's "Title" field overrides `setTitle()`. This is expected behavior — documented for users.

### Deferred Tests
- Reconnect after broker restart (Test 3)
- Connection sharing with multiple buttons (Test 4)
- Stream Deck app restart survival (Test 5)

These can be validated in Phase 3 (Hardening).

## Deviations

- **CONN-06 deferred:** Broker credentials stored in action settings (not global settings) for Phase 1. sdpi-components auto-binding doesn't support global settings well. Will move to global settings in Phase 2 when building the polished Property Inspector.

## Key Files

### Created
- Remote deployment: `~/Library/Application Support/com.elgato.StreamDeck/Plugins/io.github.meintechblog.mqtt-master.sdPlugin/`

### Modified
- `src/actions/mqtt-action.ts` — broker config from action settings, trim fix
- `src/types/settings.ts` — added brokerHost/brokerPort to action settings
- `src/services/connection-manager.ts` — normalize host on connect
- `src/util/broker-key.ts` — trim in key generation
- `io.github.meintechblog.mqtt-master.sdPlugin/ui/mqtt-action.html` — simplified PI with auto-binding

## Hardware

- **Stream Deck MK.2** (5x3, 15 keys) — confirmed working
- **Stream Deck XL** (8x4, 32 keys) — connected but not individually tested
- **macOS 26.2** on Mac Mini

---
*Plan: 01-03-deploy-and-verify*
*Completed: 2026-03-25*
