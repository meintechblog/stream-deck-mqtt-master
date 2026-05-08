---
quick_id: 20260508-mqtt-keepalive-half-open-fix
date: 2026-05-08
status: complete
---

# Summary: MQTT keepalive + half-open socket detection

## Diagnosis

User reported "obere Buttons (produktiv) gehen nicht mehr". Pulled logs from remote (admin@192.168.3.103). Findings:

- Plugin process alive (5d uptime), TCP socket ESTABLISHED, broker reachable.
- Subscribe-side still received pushes (broker → plugin path healthy).
- **Pattern**: every observed reproduction the log went silent for hours, then on next user input or external publish the plugin was either fine again (after restart) or stayed silent. Log of 2026-05-08 showed PROD buttons working perfectly at 05:57 (Toggle Studio↔Aus round-tripped), then plugin idle for 11h, user reports "still doesn't work".
- External MQTT test from dev mac: PROD topic `loxone/wohnen/licht/cmd` published → miniserver answered. So at the broker level everything is fine, but the plugin's publish path can silently die on a half-open TCP socket (mac sleep / NAT eviction) without mqtt.js noticing.

## Changes

`src/services/connection-manager.ts`:

1. **`keepalive: 30`** on `mqtt.connect()` — halves dead-connection detection time vs. mqtt.js default of 60s.
2. **TCP-level keepalive** on the underlying socket via `client.stream.setKeepAlive(true, 15000)` inside the `connect` handler. mqtt.js does not enable OS-level keepalive by default, so PINGREQs can queue silently on a dead socket; OS-level dead-peer probes catch the socket death independently.
3. **Active reconnect on offline** — the `offline` handler now calls `client.reconnect()` instead of waiting for the passive 5s `reconnectPeriod`.

## Deploy + verification

- Built with `pnpm run build` (rollup) — output `io.github.meintechblog.mqtt-master.sdPlugin/bin/plugin.js` ~1.1 MB. `grep` confirmed all three changes present in the bundle.
- `scp` to `/tmp` on remote, `rsync` into the plugin dir, killed old PID 15337 — Stream Deck respawned the plugin (new PID 11784).
- Fresh log shows clean `willAppear` for all 4 buttons, `Creating MQTT client`, `Connected`, `Resubscribing 2 topics`. New socket ESTABLISHED.
- Half-open recovery cannot be tested synthetically without forcing mac sleep — shipped, asked user to monitor.

## Notes

The previous quick task (20260429-mqtt-resilience-fixes) addressed the *display* side of reconnects (don't blank titles on offline, restore from cache on reconnect). This task addresses the *transport* side (detect dead sockets faster, reconnect actively). Both layers needed.
