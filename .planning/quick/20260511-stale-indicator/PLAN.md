---
type: quick-task
slug: stale-indicator
date: 2026-05-11
status: in-progress
---

# Stale-data indicator on MQTT button title

## Problem

When a subscribed topic stops publishing (broker connection up but Loxone-side state push dies), the button keeps showing the last known value indefinitely. The user has no visual signal that the data is no longer fresh. Real-world incident this morning: Hallbude miniserver dropped from MQTT, the upper buttons happily kept displaying "Studio" / "Aus" / etc. — values that were potentially hours out of date — with no indication anything was wrong.

Quote from session: *"wenn der server nicht antwortet, sollte die nachricht auf der taste das irgendwie berücksichtigen."*

## Fix

Per-subscribed-button stale timer. After a configurable threshold of inactivity on the subscribed topic, the rendered title gets prefixed with a configurable marker (default `⚠ `). On next message the marker drops.

### Settings additions (`src/types/settings.ts`)

- `staleThresholdSeconds: number` (default `0` = feature disabled)
- `stalePrefix: string` (default `"⚠ "`) — used when threshold > 0 and stale

Both optional, additive — existing button configs unaffected.

### Behavior (`src/actions/mqtt-action.ts`)

- New per-context maps: `staleTimers`, `staleStates`
- `applyValueToButton`: if `staleStates[id]` is true, prepend `settings.stalePrefix` (or fallback `"⚠ "` if empty) to the rendered title
- Subscription callback: clear stale state + timer on every fresh message, then reschedule timer if threshold > 0
- `onWillAppear`: schedule a stale timer on first appear too, so a topic that never publishes (no retained message, no events) eventually marks stale rather than silently showing the cached `lastValue` from prior session forever
- `onWillDisappear` / topic change: clean up timer + state

### What this does NOT cover (out of scope)

- Broker-offline overlay across all buttons. Out of scope — already partially addressed by the offline handler not wiping titles, and broker outages also stop subscribe messages, so the per-topic stale timer catches it indirectly.
- QoS1 publish-ack timeout indicator. Different problem (publish path not subscribe path); deferred.

## Verify

- `pnpm exec tsc --noEmit` clean.
- Unit test: simulate subscribe message → assert no prefix, advance fake timers past threshold → assert prefix appears, simulate next message → assert prefix gone.
- Build → deploy → restart Stream Deck on remote → confirm `willAppear` fires for all 4 MQTT buttons with no errors.
- Real-world: needs the user to set `staleThresholdSeconds` > 0 on a button (default off keeps existing behavior). Document in SUMMARY how to enable.

## Deploy

- Build: `pnpm run build`
- Sync `bin/plugin.js` (and `ui/mqtt-action.html` if PI changed — not in this task) to remote via the established scp + rsync staging path
- `killall "Elgato Stream Deck"; sleep 2; open -a "Elgato Stream Deck"` on remote
- Tail log to confirm clean startup
