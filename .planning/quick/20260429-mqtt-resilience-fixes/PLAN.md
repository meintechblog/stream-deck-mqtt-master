---
quick_id: 20260429-mqtt-resilience-fixes
description: Fix MQTT plugin resilience bugs — lastValue restore, stable clientId, trim consistency, persist trimmed settings, no title flicker
date: 2026-04-29
status: in_progress
---

# Quick Task: MQTT Plugin Resilience Fixes

## Why

User reports that production-broker buttons (`loxone/wohnen/...`) appear dead while
test-broker buttons (`loxone-hallbude/buero/...`) work. Diagnostic of remote logs and
profile state revealed:

- Plugin process is stable (7 days uptime, no offline/reconnect events).
- All 4 buttons share the same broker `mqtt-master.local:1883`.
- PROD `publishTopic` has a leading space (saved that way by the user); `trimSettings`
  fixes it in-memory but never persists, so it reappears on every PI open.
- The `connect` event handler wipes ALL button titles to `""`. Subscribers that
  receive a retained message recover; subscribers without retained messages stay blank.
  This matches "PROD buttons appear non-functional" symptom — the loxone bridge for
  `loxone/wohnen/licht/mood/state` likely doesn't publish retained.

## Bugs to fix

1. **Connect handler wipes titles** (`connection-manager.ts:62-68`) — should
   re-display cached `lastValue` instead of empty title. Touches both reconnect and
   "! Offline" flicker UX.
2. **Random clientId per restart** (`connection-manager.ts:34`) — derive a stable
   id from broker host:port so the broker can identify the same client across
   restarts.
3. **`onWillDisappear` doesn't trim settings** (`mqtt-action.ts:259`) —
   subscribeTopic used for unregister can mismatch the trimmed register-time topic.
4. **`trimSettings` only mutates in-memory** (`mqtt-action.ts:36-46`) — should
   persist via `setSettings()` when it actually changed something, so the user sees
   clean values in the PI on reopen.
5. **Redundant trim** in `getBrokerConfigFromSettings` — `trimSettings` already
   handled host/port; remove the inline trim.
6. **"! Offline" title flickers across all buttons** on transient drops — only show
   after some grace period (or just don't overwrite the display value at all; the
   button has no real "I'm offline" affordance besides the title).

## Tasks

### Task 1: Refactor `connection-manager.ts`

- Import the action's last-value cache via a callback so connect/offline handlers
  can restore titles, not wipe them.
- Stable clientId: `streamdeck-mqtt-${sha1(host:port).slice(0,12)}`.
- Replace title-wipe-on-connect with title-restore-from-callback.
- Replace `! Offline` global title overwrite with no-op (keep last value visible);
  log only.

### Task 2: Refactor `mqtt-action.ts`

- `trimSettings` returns a boolean ("did anything change") and the caller persists
  via `ev.action.setSettings(settings)` when true.
- Add `trimSettings` call to `onWillDisappear`.
- Wire the lastValue restore callback into `connectionManager.registerActionForStatus`.
- Remove redundant inline trim in `getBrokerConfigFromSettings`.

### Task 3: Build, deploy, verify

- `npm run build`
- `bash scripts/deploy.sh` (deploy to admin@mini-von-jorg-7.local — but user is
  on `192.168.3.103`; verify which hostname is right)
- After Stream Deck restarts: re-fetch `0.log`, confirm new clientId appears,
  confirm willAppear/connect logs show no title-wipe.

## Files

- `src/services/connection-manager.ts`
- `src/actions/mqtt-action.ts`
- `scripts/deploy.sh` (verify host)
