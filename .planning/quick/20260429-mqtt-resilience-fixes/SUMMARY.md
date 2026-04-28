---
quick_id: 20260429-mqtt-resilience-fixes
date: 2026-04-29
status: complete
---

# Summary: MQTT Plugin Resilience Fixes

## Diagnosis

Pulled `io.github.meintechblog.mqtt-master.0.log` from the deployed Mac (admin@mini-von-jorg-7.local). Findings:

- Plugin process was healthy (7 day uptime, no offline/reconnect events).
- All 4 buttons share `mqtt-master.local:1883`. PROD buttons (`loxone/wohnen/...`) and TEST buttons (`loxone-hallbude/buero/...`) both published successfully and received subscribe-side state updates in the historical logs.
- The persisted profile had a leading space in the PROD `publishTopic` (`" loxone/wohnen/licht/cmd    "`). `trimSettings` cleaned it in-memory but never persisted — so the dirty value reappeared on every PI open.
- The `connect` event handler in `connection-manager.ts` cleared every subscribed action's title to `""`. Buttons whose subscribe topic doesn't have a retained message (e.g. `loxone/wohnen/licht/mood/state` from this Loxone bridge) stayed blank until the next state change. Most likely root cause of "PROD buttons appear non-functional".
- `! Offline` titles were globally smeared across all subscribed buttons on every transient drop, then wiped to `""` again on reconnect. Bad UX.
- `crypto.randomUUID()` generated a fresh client ID per plugin restart — broker side noise, no stable identity.

## Changes

### `src/services/connection-manager.ts`

- New `StatusListener` interface — actions register `restoreDisplay()` so the connection manager can ask each button to re-render its cached value on (re)connect, instead of blanket-clearing titles.
- `stableClientId(key)` derives a deterministic id (`streamdeck-mqtt-<sha1[:12]>`) from `host:port`, so reconnects look like the same client.
- `connect` handler resubscribes topics, then calls each listener's `restoreDisplay()` rather than `setTitle("")`.
- `offline` handler logs only — no longer overwrites button titles. Reconnect is automatic; the next state change refreshes the display.

### `src/actions/mqtt-action.ts`

- Extracted `TRIMMABLE_KEYS` static and made `trimSettings` return whether anything changed.
- New `normalizeSettings(settings, action)` trims AND persists via `setSettings()` when something changed — so dirty profile values self-heal on first event after install.
- `getBrokerConfigFromSettings` no longer redundantly re-trims (`normalizeSettings` already did it). Simpler, single source of truth.
- Extracted `applyValueToButton(settings, action, value)` — shared rendering path used by:
  - subscription callback (live MQTT messages),
  - lastValue restore on `onWillAppear`,
  - `restoreDisplay()` on reconnect (via the new StatusListener wired into `registerActionForStatus`).
- `onWillDisappear` now calls `trimSettings` so unregister keys match what was registered.
- All `trimSettings` callsites in event handlers replaced with `normalizeSettings` so the persistence path is uniform.

### `scripts/deploy.sh`

- Fixed an scp quoting bug — modern macOS scp uses sftp and doesn't expand `~`. Now stages to `/tmp` then rsyncs into the plugin dir using a remote shell that expands `$HOME`. Switched from `npm` to `pnpm` to match the project lockfile.

## Verification

After build + deploy + force-restart of Stream Deck on the remote:

- Plugin came up with stable client id `streamdeck-mqtt-24efa9831263` (deterministic — same id every reboot).
- User pressed both TEST and PROD buttons. PROD `plus` → state callback `Nacht`; PROD toggle → `Studio` → `Aus` round-tripped cleanly to `loxone/wohnen/licht/cmd` and back.
- Profile manifest re-checked: every `publishTopic` / `subscribeTopic` / `longPressTopic` is now stored without leading or trailing whitespace. `normalizeSettings` self-healed the dirty values.
- Zero `error`/`warn`/`offline`/`crash` lines in the new log.
- Type-check (`tsc --noEmit`): clean.
- Unit tests (`vitest run`): 12/12 passed.

## Open items / not addressed

- The user's report of "Verbindung reißt einfach ab zum Mini Server" couldn't be reproduced from logs (no `offline`/`reconnect` events ever fired). If it recurs, the new code logs every connect/reconnect and no longer noisily overwrites titles, so root cause should be easier to spot. Most likely lives in the broker↔Loxone bridge, not in the plugin.
- The `4,2` button ("plus" PROD) has only `offValue: "Aus"` — toggle state visualisation works, but it's intentionally a one-shot publish button. Left as-is.
