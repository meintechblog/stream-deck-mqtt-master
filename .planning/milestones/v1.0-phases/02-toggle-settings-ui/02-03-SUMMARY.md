# Plan 02-03: Deploy and E2E Verification — Summary

**Status:** Complete
**Completed:** 2026-03-25

## What Was Built

Deployed Phase 2 features to Mac Mini and verified end-to-end with real Loxone smart home system. Two buttons configured and working:
1. **Mood+ Button** — cycles through light moods (Nacht → Abend → Tag → Viel Licht → Studio → Aus), shows current mood name, dark when "Aus"
2. **Studio Toggle Button** — toggles Studio mood on/off, shows state visually

## Verified Features

- Toggle mode with separate command/status topics ✓
- JSON Path extraction (`name` from Loxone mood JSON) ✓
- setState(0/1) for visual on/off feedback ✓
- Property Inspector with 4 sections (Broker, Subscribe, Publish, Toggle) ✓
- Multiple buttons sharing same broker and subscribe topic ✓
- Live title updates on mood changes ✓

## Issues Found and Fixed During Verification

1. **Settings overwrite bug:** Subscription callback called `setSettings({...settings, lastValue})` which overwrote PI changes (e.g. publishPayload reverted from "plus" to "changeTo/next"). Fix: in-memory `lastValues` Map instead of `setSettings`.
2. **Ghost MQTT connections:** sdpi-components fires `didReceiveSettings` on every keystroke, creating connections for partial ports (1, 18, 188...). Fix: 1s debounce in `onDidReceiveSettings`.
3. **Trailing whitespace in all PI fields:** sdpi-textfield consistently adds trailing spaces. Fix: centralized `trimSettings()` called in all handlers.
4. **Stale callback after settings change:** Changing offValue/onValue in PI didn't update the running callback. Fix: `TopicRouter.updateCallback()` re-registers callback on settings change.
5. **Auto state toggle on press:** Stream Deck auto-toggles 2-state buttons on keyDown, causing flicker before MQTT response corrects it. Fix: `DisableAutomaticStates: true` in manifest.json.
6. **Subscribe not receiving messages:** `ensureSubscribed` called before client connected, and `getSettings()` in callback caused event loop issues. Fix: rely on resubscribe-on-connect + in-memory lastValues cache.
7. **Action name:** Changed from "MQTT" to "MQTT Master" in manifest.json.
8. **Loxone command:** Correct command is `plus` (not `changeTo/next`) for mood cycling.

## Key Files Modified

- `src/actions/mqtt-action.ts` — trimSettings, debounce, in-memory lastValues, updateCallback
- `src/services/connection-manager.ts` — host normalization, message logging
- `src/services/topic-router.ts` — updateCallback method
- `io.github.meintechblog.mqtt-master.sdPlugin/manifest.json` — DisableAutomaticStates, action name
- `io.github.meintechblog.mqtt-master.sdPlugin/ui/mqtt-action.html` — port default value

## Hardware Tested

- **Stream Deck MK.2** (5x3) + **Stream Deck XL** (8x4) — both connected
- **macOS 26.2** on Mac Mini (mini-von-jorg-7.local)
- **MQTT Broker:** mqtt-master.local:1883
- **Loxone Miniserver** via MQTT Bridge — LightControllerV2 "Wohnen"

---
*Plan: 02-03-deploy-and-verify*
*Completed: 2026-03-25*
