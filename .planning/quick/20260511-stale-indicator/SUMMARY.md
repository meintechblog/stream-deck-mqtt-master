---
quick_id: 20260511-stale-indicator
date: 2026-05-11
status: complete
---

# Summary: Stale-data indicator on MQTT button title

## Diagnosis (today's incident)

User reported "die beiden oberen Tasten gehen nicht mehr". Long live-tail revealed:

- All four MQTT buttons fire keypresses correctly and publish to their configured topic.
- Upper buttons publish to `loxone-hallbude/buero/licht/cmd` (user mental model: PROD), lower to `loxone/wohnen/licht/cmd` (user: TEST).
- The Hallbude MQTT bridge was alive at the broker (publishing `loxone-hallbude/bridge/status = online`) but the Loxone-side push had died — only `bridge/status` came through on `loxone-hallbude/#`, vs ~148 topics on `loxone/#`.
- Buttons subscribed to the Hallbude topic kept showing the stale "Studio" / "Aus" / etc. value indefinitely with no visual signal that the data was no longer fresh.

User feedback: *"wenn der server nicht antwortet, sollte die nachricht auf der taste das irgendwie berücksichtigen."*

## Changes

`src/util/stale-tracker.ts` (new) — pure timer + flag class, no SDK deps. `arm`, `markFresh`, `isStale`, `clear`. Tested via `src/util/stale-tracker.test.ts` (7 cases, fake timers).

`src/types/settings.ts` — two new optional fields:
- `staleThresholdSeconds: number` (default `0` = feature disabled)
- `stalePrefix: string` (default `"⚠ "`)

`src/actions/mqtt-action.ts`:
- One `StaleTracker` instance owned by the action class.
- `applyValueToButton` consults `staleTracker.isStale(id)` and prepends `settings.stalePrefix` when true. Falls back to `"⚠ "` if the user blanked the prefix.
- Subscription callback: `markFresh(id)` before re-rendering, then `scheduleStaleTimer` to (re)arm. Every fresh message resets the watch.
- `onWillAppear`: arms the stale watch on first appear too. So a topic that never publishes (no retained, no events ever) eventually flags rather than silently showing a `lastValue` cached from a prior session.
- `onWillDisappear`, topic-change branch in `handleSettingsChange`: cleanup / re-arm.

## Why opt-in (default 0)

Existing button configs are untouched by this change. Users have to set `staleThresholdSeconds` to a positive value (in the per-button settings JSON or via PI in a future task) to enable. This avoids surprising existing users with prefixed titles on buttons whose subscribe topic only updates on change (and may legitimately be quiet for hours).

## Verify

- `pnpm exec tsc --noEmit` — clean (exit 0).
- `pnpm exec vitest run` — 19/19 tests pass (12 existing + 7 new for `StaleTracker`).
- Build: `pnpm run build` — bundle 1.1 MB, all stale-related symbols (`StaleTracker`, `staleThresholdSeconds`, `staleTracker`, `markFresh`) grep-confirmed in the output (12 hits).
- Deploy: scp + in-place swap on remote, backup `plugin.js.bak.20260511-052905` kept.
- Restart: `killall "Stream Deck"` (note: process name is "Stream Deck" not "Elgato Stream Deck") → `open -a "Elgato Stream Deck"` → fresh PID, log shows clean `willAppear x4` + `Connected` + both PROD and TEST topics returning their retained mood/state.
- Default-off behavior preserved: no `Stale: ...` log lines in the post-deploy log because no button has the threshold set.

## Real-world enable (deferred to user)

To enable on a button without a PI roundtrip, edit the profile JSON on the remote Mac:
```
~/Library/Application Support/com.elgato.StreamDeck/ProfilesV3/01152F0A-DC3E-46EF-A2F0-6AFB53CF7C90.sdProfile/Profiles/575E0860-B3B4-4107-A476-0792AAC0EE9F/manifest.json
```
Add `"staleThresholdSeconds": 300` (or whatever) inside the action's `Settings` block, then restart Stream Deck. PI integration deferred — the field is in the schema but no UI input was added in this task.

## Out of scope (explicit deferrals)

- Property Inspector field for the new settings — schema is ready but PI HTML untouched.
- Broker-offline overlay across all subscribed buttons — partly redundant with per-topic stale (broker outage stops messages, so the timer catches it indirectly).
- QoS1 publish-with-ack timeout indicator — different problem (publish path, not subscribe), separate quick task if needed.
