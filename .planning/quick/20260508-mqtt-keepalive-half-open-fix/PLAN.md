---
type: quick-task
slug: mqtt-keepalive-half-open-fix
date: 2026-05-08
status: in-progress
---

# MQTT keepalive + half-open socket detection

## Problem

Plugin appears to "freeze" after long idle periods (mac sleep / NAT timeout). Symptoms:
- TCP socket shows ESTABLISHED, plugin process alive
- Subscribe-side keeps receiving (broker pushes still flow)
- Publish-side silently drops — keypresses not logged, miniserver not reached
- Last reproduction: 2026-05-08 ~05:57 last log entry, then 11h silence; broker reachable from outside but plugin pubs invisible

Root cause hypothesis: half-open TCP socket survives mac sleep / NAT-table loss. mqtt.js default keepalive (60s) plus default no TCP-level keepalive means the dead connection isn't detected on the publish path.

## Fix

`src/services/connection-manager.ts`:
1. Set explicit `keepalive: 30` on `mqtt.connect()` — halves dead-connection detection time.
2. After connect, enable TCP-level keepalive on the underlying socket (`client.stream.setKeepAlive(true, 15000)`) — OS-level dead-peer probes catch socket death even if MQTT pings get queued.
3. On `offline` event, actively call `client.reconnect()` instead of waiting for the passive 5s reconnectPeriod — faster recovery.

## Deploy

- Build: `pnpm rollup -c`
- Copy `io.github.meintechblog.mqtt-master.sdPlugin/bin/plugin.js` to remote Mac via the established deploy path (sibling phase used `scp` via `/tmp` staging — reuse).
- Kill plugin process on remote so Stream Deck respawns.

## Verification

- Live tail remote log → confirm new `Connected to ...` line shows `keepalive` indication or our own log mentioning TCP keepalive set.
- Cannot test the half-open recovery synthetically; ship + monitor.
