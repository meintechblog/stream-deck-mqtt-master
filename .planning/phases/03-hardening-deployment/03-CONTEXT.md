# Phase 3: Hardening + Deployment - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Add disconnect indicator on buttons, ensure clean subscription lifecycle, create deployment tooling (`npm run deploy` for dev, `npm run package` for `.streamDeckPlugin` installer), and publish as GitHub Release for public distribution.

</domain>

<decisions>
## Implementation Decisions

### Disconnect Indicator
- **D-20:** Title change on disconnect — button text becomes "⚠ Offline" or similar when broker is unreachable. Simple, immediately visible. No state change needed.

### Deployment & Distribution
- **D-21:** `npm run deploy` script — builds + scp to Mac Mini + restarts Stream Deck. One command for dev workflow.
- **D-22:** `npm run package` — builds `.streamDeckPlugin` installer file using `@elgato/cli` packaging. Double-click installs in Stream Deck.
- **D-23:** GitHub Release on `meintechblog/stream-deck-mqtt-master` — upload `.streamDeckPlugin` as release asset. Users download and install. First public release.
- **D-24:** Elgato Marketplace submission deferred to v2 — requires review process, proper icons, documentation.

### Carried Forward
- **D-01:** Unified Action
- **D-08:** Dev on Mac Mini via SSH (admin@mini-von-jorg-7.local)
- **D-13:** Broker config in Action Settings
- **D-14:** sdpi-components standard styling
- trimSettings in all handlers
- DisableAutomaticStates in manifest
- In-memory lastValues cache

### Claude's Discretion
- Disconnect detection mechanism (mqtt client offline/error events → setTitle)
- Deploy script implementation details (ssh commands, restart approach)
- Package script configuration
- GitHub repo creation and release workflow
- README content for the GitHub repo

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Plugin Code
- `src/actions/mqtt-action.ts` — MqttAction with all lifecycle handlers
- `src/services/connection-manager.ts` — ConnectionManager with offline/error events already hooked
- `io.github.meintechblog.mqtt-master.sdPlugin/manifest.json` — Current manifest
- `package.json` — Current scripts

### Project Context
- `.planning/PROJECT.md` — Project vision
- `.planning/REQUIREMENTS.md` — SUB-04, UI-05, ARCH-05

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- ConnectionManager already has `offline` and `error` event handlers — just need to propagate to buttons
- `trimSettings()` and `buildSubscriptionCallback()` patterns established
- Deploy workflow tested manually (scp + pkill + open)

### Integration Points
- ConnectionManager needs to notify MqttAction contexts on disconnect/reconnect
- package.json needs `deploy` and `package` scripts
- GitHub repo needs to be created via `gh` CLI

</code_context>

<specifics>
## Specific Ideas

- Deploy target: `admin@mini-von-jorg-7.local`
- Plugin dir: `~/Library/Application Support/com.elgato.StreamDeck/Plugins/io.github.meintechblog.mqtt-master.sdPlugin/`
- Stream Deck app: `/Applications/Elgato Stream Deck.app`
- GitHub user: `meintechblog` (gh CLI authenticated)
- Repo name: `stream-deck-mqtt-master`

</specifics>

<deferred>
## Deferred Ideas

- Elgato Marketplace submission (v2 — needs review process)
- Web UI for MQTT topic browsing with "+" expand buttons (separate project)

</deferred>

---

*Phase: 03-hardening-deployment*
*Context gathered: 2026-03-25*
