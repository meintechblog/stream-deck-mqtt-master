# Phase 3: Hardening + Deployment - Research

**Researched:** 2026-03-25
**Domain:** MQTT disconnect handling, Stream Deck subscription lifecycle, plugin packaging and deployment
**Confidence:** HIGH

## Summary

Phase 3 addresses three distinct concerns: (1) visual disconnect indication on buttons when the MQTT broker is unreachable, (2) clean subscription lifecycle management (subscribe on willAppear, unsubscribe on willDisappear), and (3) deployment tooling plus public distribution via GitHub Release.

The existing codebase is well-positioned. ConnectionManager already hooks `offline` and `error` events (just logs them). MqttAction already implements `onWillAppear`/`onWillDisappear` with TopicRouter register/unregister. The gap is propagating connection state changes to button titles (SUB-04 is partially done via TopicRouter ref counting, UI-05 is the missing visual feedback, ARCH-05 is the deployment tooling).

**Primary recommendation:** Add a connection status callback mechanism from ConnectionManager to MqttAction contexts, implement `npm run deploy` as an scp+restart script, and use `streamdeck pack` + `gh release create` for distribution.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-20:** Title change on disconnect -- button text becomes "! Offline" or similar when broker is unreachable. Simple, immediately visible. No state change needed.
- **D-21:** `npm run deploy` script -- builds + scp to Mac Mini + restarts Stream Deck. One command for dev workflow.
- **D-22:** `npm run package` -- builds `.streamDeckPlugin` installer file using `@elgato/cli` packaging. Double-click installs in Stream Deck.
- **D-23:** GitHub Release on `meintechblog/stream-deck-mqtt-master` -- upload `.streamDeckPlugin` as release asset. Users download and install. First public release.
- **D-24:** Elgato Marketplace submission deferred to v2 -- requires review process, proper icons, documentation.
- Carried forward: D-01 (Unified Action), D-08 (Dev on Mac Mini via SSH), D-13 (Broker config in Action Settings), D-14 (sdpi-components), trimSettings in all handlers, DisableAutomaticStates in manifest, In-memory lastValues cache.

### Claude's Discretion
- Disconnect detection mechanism (mqtt client offline/error events -> setTitle)
- Deploy script implementation details (ssh commands, restart approach)
- Package script configuration
- GitHub repo creation and release workflow
- README content for the GitHub repo

### Deferred Ideas (OUT OF SCOPE)
- Elgato Marketplace submission (v2 -- needs review process)
- Web UI for MQTT topic browsing with "+" expand buttons (separate project)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SUB-04 | Subscriptions werden korrekt verwaltet (Subscribe bei willAppear, Unsubscribe bei willDisappear) | Already partially implemented -- TopicRouter.register/unregister exists with ref counting. Need to verify no stale subscriptions accumulate after button removal. See "Subscription Lifecycle" section. |
| UI-05 | Button zeigt visuelles Feedback bei Broker-Disconnect (Connection Status Indicator) | Requires ConnectionManager -> MqttAction callback on offline/reconnect events. See "Disconnect Indicator Architecture" section. |
| ARCH-05 | Plugin kann lokal deployed werden auf macOS (Ziel: mini-von-jorg-7.local) | Deploy script via scp + pkill/open. Package via `streamdeck pack`. See "Deployment Tooling" section. |
</phase_requirements>

## Architecture Patterns

### Disconnect Indicator Architecture (UI-05, D-20)

**Current state:** ConnectionManager hooks `offline` and `error` events but only logs them. No mechanism exists to notify button actions of connection state changes.

**MQTT.js events relevant to disconnect detection (HIGH confidence):**

| Event | When it fires | Use for |
|-------|--------------|---------|
| `offline` | Client goes offline, no longer connected | Set button title to "! Offline" |
| `reconnect` | Client attempts reconnect | Optional: set title to "Reconnecting..." |
| `connect` | Client successfully connects | Restore original button title |
| `error` | Connection/communication error | Log only (offline covers the visual case) |
| `close` | Underlying connection closed | Fires before offline; redundant for UI |

**Recommended pattern -- ConnectionManager status callbacks:**

```typescript
// ConnectionManager maintains a set of status listeners per broker
// When offline fires: iterate all registered contexts for that broker, call setTitle("! Offline")
// When connect fires: iterate all registered contexts, restore their last known title

// Option A: ConnectionManager holds action references directly
// Option B: ConnectionManager emits events, MqttAction listens

// Recommendation: Option A -- ConnectionManager tracks action refs per broker key
// This avoids a separate event system and keeps the pattern simple
```

**Implementation approach:**
1. ConnectionManager gets a `registerActionForStatus(brokerKey, actionId, actionRef)` and `unregisterActionForStatus(brokerKey, actionId)` method
2. MqttAction calls register in `onWillAppear`, unregister in `onWillDisappear`
3. On `offline` event: iterate all registered actions for that broker, call `action.setTitle("! Offline")`
4. On `connect` event: iterate all registered actions, restore title from lastValues cache (or empty)
5. On `reconnect` event: optionally set title to "..." or leave as "! Offline"

**Key consideration:** When connection is restored (`connect` event fires), the button title must be restored. The lastValues cache in MqttAction already stores the last known MQTT value per action ID. ConnectionManager needs access to this to restore titles, OR it can simply clear the offline indicator and let the next MQTT message naturally restore the title (simpler -- retained messages will arrive immediately on reconnect).

**Recommended: Simpler approach** -- On `connect`, just re-run the existing resubscribe logic (already implemented). The retained messages from the broker will naturally restore button titles. Only need to handle the `offline` -> setTitle("! Offline") direction actively.

### Subscription Lifecycle (SUB-04)

**Current state analysis (HIGH confidence -- read from source):**

The subscription lifecycle is already correctly implemented:
- `onWillAppear`: calls `topicRouter.register()` + `connectionManager.ensureSubscribed()`
- `onWillDisappear`: calls `topicRouter.unregister()` + `connectionManager.ensureUnsubscribed()`
- TopicRouter uses reference counting: first subscriber triggers MQTT subscribe, last unsubscriber triggers MQTT unsubscribe
- `onDidReceiveSettings`: handles topic changes with old/new topic diffing

**Potential gap -- verification needed:**
- When a button is removed from the layout (not just hidden), `onWillDisappear` fires. Confirm no edge case where it does NOT fire.
- Stream Deck profiles/pages: switching pages fires willDisappear for leaving buttons and willAppear for arriving buttons. This is correct behavior.
- Multiple buttons on same topic: ref counting in TopicRouter handles this correctly.

**Verdict:** SUB-04 is functionally complete. The phase should include a verification step (manual test) confirming no stale subscriptions after button add/remove cycles. The `previousTopics` Map and `lastValues` Map in MqttAction should also be cleaned in `onWillDisappear` to prevent memory leaks over long sessions.

**Memory cleanup gap found:**
```typescript
// Current onWillDisappear cleans up:
// - topicRouter.unregister() ✓
// - connectionManager.ensureUnsubscribed() ✓
// - this.previousTopics.delete() ✓
// Missing:
// - this.lastValues.delete(ev.action.id) -- should be added
// - this.debounceTimers cleanup -- should clear pending timer
```

### Deployment Tooling (ARCH-05, D-21, D-22, D-23)

**Deploy script (`npm run deploy`):**

Target: `admin@mini-von-jorg-7.local` (passwordless SSH per memory reference)
Plugin dir: `~/Library/Application Support/com.elgato.StreamDeck/Plugins/io.github.meintechblog.mqtt-master.sdPlugin/`
Stream Deck app: `/Applications/Elgato Stream Deck.app`

```bash
# Deploy sequence:
# 1. npm run build (rollup -c)
# 2. scp the entire .sdPlugin directory to the Mac Mini plugin dir
# 3. Restart Stream Deck app on Mac Mini (pkill + open)

# Restart approach on macOS:
pkill "Elgato Stream Deck" && sleep 2 && open -a "Elgato Stream Deck"
# OR (if streamdeck CLI is installed on Mac Mini):
streamdeck restart io.github.meintechblog.mqtt-master
```

**Recommendation:** Use pkill+open approach. The `streamdeck` CLI may not be installed on the Mac Mini (it is a dev tool, not necessarily on the deployment target). The pkill+open approach works universally.

**Package script (`npm run package`):**

```bash
streamdeck pack io.github.meintechblog.mqtt-master.sdPlugin
```

**Issue:** `streamdeck` CLI is NOT installed on the dev machine (verified -- `command -v streamdeck` returns nothing). Must be installed first:

```bash
npm install -g @elgato/cli
```

**File exclusion:** Create `.sdignore` in the .sdPlugin directory to exclude dev artifacts:
```
*.js.map
*.log
logs/
```

The `streamdeck pack` command auto-excludes `.git`, `/.env*`, `*.log`, `*.js.map` by default, so a `.sdignore` may not even be needed.

**Output:** Creates `io.github.meintechblog.mqtt-master.streamDeckPlugin` file (double-click to install).

**GitHub Release (D-23):**

```bash
# Create repo (if not exists)
gh repo create meintechblog/stream-deck-mqtt-master --public --description "Bidirectional MQTT plugin for Elgato Stream Deck"

# Create release with asset
gh release create v0.1.0 \
  ./io.github.meintechblog.mqtt-master.streamDeckPlugin \
  --title "MQTT Master v0.1.0" \
  --notes "Initial public release. Bidirectional MQTT for Stream Deck."
```

### Recommended Project Structure Changes

```
package.json  (add deploy + package scripts)
scripts/
  deploy.sh   (build + scp + restart)
.sdignore     (optional, in .sdPlugin dir)
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Plugin packaging | Custom zip/archive script | `streamdeck pack` | Handles validation, DRM prep, correct format, file exclusion |
| GitHub releases | Manual upload via browser | `gh release create` with asset | Scriptable, reproducible, one command |
| MQTT disconnect detection | Custom ping/heartbeat mechanism | MQTT.js built-in `offline`/`connect` events | Already implemented in the protocol layer; the client emits these automatically based on keepalive and TCP state |

## Common Pitfalls

### Pitfall 1: Offline event fires before all buttons can be updated
**What goes wrong:** The `offline` event fires once per broker, but you need to update N buttons. If updating is async (setTitle returns a Promise), some updates might fail.
**How to avoid:** Fire-and-forget with `.catch(() => {})` for setTitle calls in the offline handler. Don't await them sequentially.

### Pitfall 2: Connect event restores wrong title
**What goes wrong:** On reconnect, you try to restore the last known MQTT value, but the retained message from the broker arrives milliseconds later and overwrites it anyway.
**How to avoid:** Don't try to restore titles on `connect`. Just clear the "! Offline" indicator by setting title to "" or the last cached value. The subscription callback will naturally overwrite with the current broker state once messages arrive. The existing resubscribe-on-connect logic already handles this.

### Pitfall 3: scp fails silently with spaces in path
**What goes wrong:** The Mac Mini plugin path contains spaces (`Application Support`). Unquoted scp paths break.
**How to avoid:** Always quote the remote path in the deploy script. Use `scp -r ... "admin@mini-von-jorg-7.local:~/Library/Application Support/..."`.

### Pitfall 4: streamdeck pack validates manifest strictly
**What goes wrong:** `streamdeck pack` runs validation before bundling. If manifest has issues (wrong Version format, missing fields), packaging fails.
**How to avoid:** Version in manifest must be 4-segment (`0.1.0.0`), not semver (`0.1.0`). Current manifest already uses correct format. Keep SDKVersion at 2 (not 3 -- SDKVersion 3 is for Marketplace DRM).

### Pitfall 5: pkill kills wrong process
**What goes wrong:** `pkill "Stream Deck"` might match other processes or the Elgato Stream Deck process has a different name than expected.
**How to avoid:** Use the exact process name. On macOS, the app name in Activity Monitor is typically "Elgato Stream Deck". Test with `pgrep -l "Elgato Stream Deck"` on the Mac Mini first.

### Pitfall 6: Memory leak from lastValues Map
**What goes wrong:** `lastValues` entries are never deleted in `onWillDisappear`. Over many button add/remove cycles in a long-running plugin, the Map grows unbounded.
**How to avoid:** Delete the entry in `onWillDisappear` (alongside the existing `previousTopics.delete`).

## Code Examples

### Disconnect indicator -- ConnectionManager status callbacks

```typescript
// Source: Pattern derived from existing ConnectionManager code + MQTT.js events

// In ConnectionManager, add:
private statusListeners = new Map<string, Map<string, { setTitle: (t: string) => Promise<void> }>>();

// In getOrCreate(), extend the existing offline handler:
client.on("offline", () => {
  logger.warn(`MQTT client offline: ${key}`);
  const listeners = this.statusListeners.get(key);
  if (listeners) {
    for (const [, actionRef] of listeners) {
      actionRef.setTitle("! Offline").catch(() => {});
    }
  }
});

// Extend the existing connect handler:
client.on("connect", () => {
  logger.info(`Connected to ${key}`);
  // Clear offline indicator -- subscription messages will restore real values
  const listeners = this.statusListeners.get(key);
  if (listeners) {
    for (const [contextId, actionRef] of listeners) {
      // Set to empty or cached value; MQTT retained messages will overwrite
      actionRef.setTitle("").catch(() => {});
    }
  }
  // ... existing resubscribe logic
});
```

### Deploy script (scripts/deploy.sh)

```bash
#!/usr/bin/env bash
set -euo pipefail

REMOTE="admin@mini-von-jorg-7.local"
PLUGIN_DIR="io.github.meintechblog.mqtt-master.sdPlugin"
REMOTE_PLUGINS="~/Library/Application Support/com.elgato.StreamDeck/Plugins"

echo "Building..."
npm run build

echo "Deploying to $REMOTE..."
scp -r "$PLUGIN_DIR" "$REMOTE:\"$REMOTE_PLUGINS/\""

echo "Restarting Stream Deck..."
ssh "$REMOTE" 'pkill "Elgato Stream Deck" || true; sleep 2; open -a "Elgato Stream Deck"'

echo "Done."
```

### Package.json script additions

```json
{
  "scripts": {
    "build": "rollup -c",
    "watch": "rollup -c -w",
    "deploy": "npm run build && bash scripts/deploy.sh",
    "package": "npm run build && streamdeck pack io.github.meintechblog.mqtt-master.sdPlugin"
  }
}
```

Note: `deploy` script should NOT call `npm run build` twice. Either inline the build in deploy.sh and call it directly, or have deploy.sh skip the build and have the npm script chain them.

### GitHub release workflow

```bash
# One-time: create repo
gh repo create meintechblog/stream-deck-mqtt-master --public \
  --description "Bidirectional MQTT plugin for Elgato Stream Deck" \
  --source . --push

# Per release:
npm run package
gh release create v0.1.0 \
  io.github.meintechblog.mqtt-master.streamDeckPlugin \
  --title "MQTT Master v0.1.0" \
  --notes "Initial release. Bidirectional MQTT for Stream Deck."
```

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `gh` CLI | GitHub release (D-23) | Yes | 2.88.1 | -- |
| `ssh` | Deploy script (D-21) | Yes | -- | -- |
| `scp` | Deploy script (D-21) | Yes | -- | -- |
| `streamdeck` CLI | Package script (D-22) | **No** | -- | Install: `npm install -g @elgato/cli` |
| `node` / `npm` | Build | Yes | (verify) | -- |
| `rollup` | Build | Yes (devDep) | ^4.60.0 | -- |

**Missing dependencies with no fallback:**
- None (all can be installed)

**Missing dependencies with fallback:**
- `streamdeck` CLI: Must be installed globally before `npm run package` works. Add as a prerequisite step in the plan.

## Open Questions

1. **Process name on Mac Mini**
   - What we know: macOS typically shows "Elgato Stream Deck" in Activity Monitor
   - What's unclear: Exact process name for pkill on the target Mac Mini (could be "Stream Deck" or "Elgato Stream Deck")
   - Recommendation: Test with `ssh admin@mini-von-jorg-7.local 'pgrep -l Stream'` during implementation

2. **streamdeck CLI on Mac Mini**
   - What we know: CLI is a dev tool, not needed on deployment target
   - What's unclear: Whether `streamdeck restart UUID` could be used as a gentler alternative to pkill+open
   - Recommendation: Use pkill+open (works without CLI). If CLI happens to be installed, it is a bonus.

3. **GitHub repo already exists?**
   - What we know: User specified `meintechblog/stream-deck-mqtt-master`
   - What's unclear: Whether the repo already exists on GitHub
   - Recommendation: Use `gh repo create --source . --push` which will fail gracefully if repo exists, then just `gh repo sync` or push.

## Project Constraints (from CLAUDE.md)

- SDK: `@elgato/streamdeck` v2 -- required, already in use
- Runtime: Node.js 20 (bundled by Stream Deck)
- Language: TypeScript
- Platform: macOS primary, Windows compatibility desirable
- MQTT: `mqtt` npm package -- already in use
- Bundler: Rollup (SDK standard) -- already configured
- PI: Plain HTML + sdpi-components -- no framework
- GSD Workflow: Must use GSD commands for edits

## Sources

### Primary (HIGH confidence)
- Source code analysis: `src/actions/mqtt-action.ts`, `src/services/connection-manager.ts`, `src/services/topic-router.ts` -- current implementation state
- [MQTT.js GitHub README](https://github.com/mqttjs/MQTT.js) -- client events: connect, offline, reconnect, error, close
- [streamdeck pack CLI docs](https://docs.elgato.com/streamdeck/cli/commands/pack/) -- pack command syntax, flags, file exclusion
- [Stream Deck SDK Distribution](https://docs.elgato.com/streamdeck/sdk/introduction/distribution/) -- packaging workflow, DRM, Marketplace

### Secondary (MEDIUM confidence)
- [gh release create manual](https://cli.github.com/manual/gh_release_create) -- GitHub CLI release creation with asset upload
- [MacScripter thread on restarting Stream Deck](https://www.macscripter.net/t/need-script-to-force-quit-and-then-restart-the-stream-deck-app-or-process/75891) -- pkill + open pattern for macOS
- Memory reference: `reference_streamdeck_mac.md` -- SSH access, plugin dir, MQTT broker details

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Disconnect indicator: HIGH -- MQTT.js events are well-documented, existing code already hooks them
- Subscription lifecycle: HIGH -- read directly from source code, TopicRouter ref counting is sound
- Deployment tooling: HIGH -- standard scp/ssh/pkill patterns, streamdeck pack is official CLI
- GitHub release: HIGH -- gh CLI is well-known, straightforward asset upload

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domain, no fast-moving dependencies)
