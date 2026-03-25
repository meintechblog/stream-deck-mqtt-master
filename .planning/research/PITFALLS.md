# Domain Pitfalls

**Domain:** Stream Deck MQTT Plugin (Elgato SDK v2 + MQTT.js + Node.js)
**Researched:** 2026-03-25

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or unusable plugins.

### Pitfall 1: MQTT Connection Singleton Mismanagement

**What goes wrong:** Each Stream Deck action instance creates its own MQTT client connection instead of sharing one per broker. With 32 buttons on an XL, each subscribed to a topic, this spawns 32 TCP connections to the same broker. Mosquitto defaults to max 1024 connections, but the real problem is the plugin process: 32 reconnect loops, 32 sets of event listeners, 32 keepalive timers eating memory.

**Why it happens:** The `SingletonAction` pattern in Stream Deck SDK v2 creates one instance per action *type*, not per button. Developers confuse this with "one connection per action" and instantiate `mqtt.connect()` inside action event handlers like `onWillAppear`.

**Consequences:** Memory leaks (documented in MQTT.js issues [#791](https://github.com/mqttjs/MQTT.js/issues/791), [#161](https://github.com/mqttjs/MQTT.js/issues/161)), broker overload, reconnect storms where all 32 clients reconnect simultaneously after a network blip, and eventual plugin crash that triggers Stream Deck's auto-restart -- which creates 32 MORE connections before the old ones time out.

**Warning signs:**
- Memory usage grows linearly with number of configured buttons
- Broker logs show multiple connections from the same client
- Reconnect events fire in clusters

**Prevention:**
- Implement a `BrokerConnectionManager` singleton that maps `host:port` to a single `MqttClient` instance
- Reference count connections: increment when a button subscribes, decrement on `onWillDisappear`, disconnect when count reaches zero
- All buttons sharing a broker share one `mqtt.connect()` call

**Detection:** Log connection count on each `onWillAppear`. If count > number of unique broker configs, something is wrong.

**Phase:** Must be solved in Phase 1 (core architecture). Retrofitting a connection manager after per-button connections are wired is a rewrite.

---

### Pitfall 2: Settings Lost on Plugin Crash/Restart

**What goes wrong:** Plugin stores runtime state (current MQTT values, connection status) only in memory. Stream Deck auto-restarts the plugin after a crash, but all in-memory state is gone. Buttons show stale titles/images until the next MQTT message arrives -- which may never come if the topic uses retained messages and the value hasn't changed since reconnect.

**Why it happens:** Developers treat the plugin process as long-lived and skip persistence. Stream Deck SDK provides `action.setSettings()` for per-action persistent storage and `streamDeck.settings.setGlobalSettings()` for plugin-level storage, but neither is used for caching last-known MQTT values.

**Consequences:** After restart, all buttons show "N/A" or default state. For toggle buttons, pressing them sends the wrong payload because the plugin doesn't know the current state. User toggles a light "on" that was already on, sending "on" again instead of "off".

**Warning signs:**
- Buttons go blank after Stream Deck software update
- Toggle buttons get "inverted" after network interruption

**Prevention:**
- Cache last-known MQTT value in action settings via `action.setSettings({ lastValue: payload })`
- On `onWillAppear`, restore from settings first, then subscribe for live updates
- For toggle actions, always read current state from MQTT (subscribe) rather than assuming local state is truth

**Detection:** Kill the plugin process manually (`kill -9`), check if buttons recover their state within 5 seconds of restart.

**Phase:** Phase 1 (core architecture). The settings persistence pattern must be established before any action logic is written.

---

### Pitfall 3: MQTT Reconnect Resubscription Failure

**What goes wrong:** After the MQTT client reconnects to the broker, subscriptions are lost and not re-established. Buttons stop updating silently -- no error, no crash, just stale data.

**Why it happens:** MQTT.js has a `resubscribe` option (default: `true`) that should handle this, but it has documented bugs. With `clean: true` (default), the broker discards the session on disconnect, so all subscriptions must be re-sent. With `clean: false`, the broker should remember subscriptions, but this has [known bugs in MQTT.js](https://github.com/mqttjs/MQTT.js/issues/1157) depending on protocol version (v3.1.1 vs v5). Additionally, if the connection manager dynamically adds subscriptions after initial connect, `resubscribe` only replays the original set.

**Consequences:** Silent data staleness. Buttons appear connected (no error state) but show outdated values. Users lose trust in the plugin.

**Warning signs:**
- Buttons work fine initially but stop updating after WiFi reconnects
- Only buttons configured before the first connection keep updating

**Prevention:**
- Use `clean: true` (default) and explicitly resubscribe all active topics on the `connect` event (not just `reconnect`)
- Maintain a `Set<string>` of active subscriptions in the connection manager
- On every `connect` event, iterate the set and `client.subscribe()` each topic
- Do NOT rely solely on MQTT.js built-in `resubscribe`

**Detection:** Integration test: connect, subscribe, disconnect broker, reconnect broker, publish a message -- verify it arrives.

**Phase:** Phase 1 (connection manager). This is a core reliability concern.

---

### Pitfall 4: Action Settings Are Plain-Text and Profile-Exported

**What goes wrong:** Developer stores MQTT broker credentials (username/password) in per-action settings. User exports their Stream Deck profile to share button layouts. The exported profile contains all broker credentials in plain text.

**Why it happens:** Per-action settings seem like the natural place for per-button configuration. The [official docs](https://docs.elgato.com/streamdeck/sdk/guides/settings/) explicitly warn: "Action settings are stored as plain-text and are included when exporting Stream Deck profiles."

**Consequences:** Credential leakage. Users unknowingly share MQTT broker access when exporting profiles.

**Warning signs:**
- Profile export files are larger than expected
- Security-conscious users report credentials in exported JSON

**Prevention:**
- Store broker credentials (host, port, username, password, TLS certs) in **global settings** (`streamDeck.settings.setGlobalSettings()`) which are "stored securely on the user's local machine"
- Per-action settings should only contain: topic names, payloads, display preferences, QoS level
- Reference brokers by an ID in action settings, resolve credentials from global settings at runtime

**Detection:** Export a profile, inspect the JSON, verify no credentials are present.

**Phase:** Phase 1 (settings architecture). Must be designed correctly from the start.

---

## Technical Debt Patterns

### Debt 1: Monolithic Action Class

**What goes wrong:** All MQTT logic (connect, subscribe, publish, message routing, state management) lives inside the `SingletonAction` subclass. As features grow (toggle mode, multi-state, dynamic images), the class becomes 500+ lines and untestable.

**Why it happens:** Stream Deck tutorials show everything in one file. The `SingletonAction` receives all events, so putting logic there is the path of least resistance.

**Prevention:**
- Separate concerns from day one:
  - `BrokerConnectionManager` -- MQTT lifecycle
  - `SubscriptionRouter` -- routes incoming messages to the right button context
  - `ButtonStateManager` -- maps MQTT values to button display state
  - `MqttPublishAction` / `MqttToggleAction` -- thin action classes that delegate

**Phase:** Phase 1 architecture decision. Refactoring a monolith action after 15 event handlers are added is painful.

### Debt 2: Hardcoded Image Generation

**What goes wrong:** Button images for different states (on/off, connected/disconnected, error) are created as static PNG files. When requirements change (different colors, text overlays, status indicators), every image must be manually recreated.

**Prevention:**
- Use dynamic SVG-to-base64 rendering for state-dependent images
- Define a small template system: background color + icon + optional text overlay
- Stream Deck `setImage()` accepts data URIs, so `data:image/svg+xml;base64,...` works

**Phase:** Phase 2 (UI polish). Start with static PNGs for MVP, migrate to dynamic generation when visual customization is needed.

---

## Integration Gotchas

### Gotcha 1: Property Inspector Lifecycle Desync

**What goes wrong:** The Property Inspector (PI) is a separate HTML page that loads/unloads when the user selects/deselects a button in the Stream Deck UI. Developers assume the PI is always running and send messages to it. Messages sent while the PI is closed are silently dropped -- no error, no queue.

**Consequences:** User opens PI, sees stale settings. Connection status shown in PI doesn't reflect reality. User changes settings in PI but the plugin never receives them because of timing.

**Prevention:**
- Never push state TO the PI proactively. Instead, have the PI PULL state on load via `streamDeck.plugin.fetch()` or by reading action settings
- Use `onDidReceiveSettings` in the plugin to react to PI changes
- Listen for PI close (`beforeunload`) to clean up any PI-specific state

**Phase:** Phase 2 (Property Inspector implementation).

### Gotcha 2: `onWillAppear` vs `onWillDisappear` Asymmetry

**What goes wrong:** `onWillAppear` fires when a button becomes visible (page switch, profile load, plugin start). `onWillDisappear` fires when it leaves. But during plugin restart, `onWillDisappear` is NOT called for buttons that were visible before the crash. The plugin restarts and gets `onWillAppear` for all currently visible buttons without ever getting `onWillDisappear` for the previous session.

**Consequences:** If you track active subscriptions by incrementing on `onWillAppear` and decrementing on `onWillDisappear`, a crash leaves stale counts. After restart, counts double.

**Prevention:**
- On plugin startup, reset all tracking state (subscription counts, active button maps)
- Treat `onWillAppear` as the source of truth: "this button exists now"
- Use a `Map<actionContext, config>` that is rebuilt entirely from `onWillAppear` events after restart

**Phase:** Phase 1 (action lifecycle). This is a fundamental design decision for the subscription tracking system.

### Gotcha 3: Multi-Device Button Context Collisions

**What goes wrong:** When both Stream Deck MK.2 and XL are connected simultaneously, each button has a unique `context` ID. But if the same action is on both devices pointing to the same MQTT topic, incoming MQTT messages must update BOTH buttons. Developers route messages by topic name to a single context, missing the second device.

**Prevention:**
- Map subscriptions as `topic -> Set<context>` (one-to-many)
- When an MQTT message arrives, iterate ALL contexts for that topic and call `setTitle`/`setImage` on each
- Test with actions on multiple pages and both devices

**Phase:** Phase 1 (subscription routing). The data structure must be many-to-many from the start.

---

## Performance Traps

### Trap 1: High-Frequency MQTT Topics Overwhelming setTitle/setImage

**What goes wrong:** User subscribes a button to a sensor topic that publishes every 100ms (e.g., power meter, CPU temperature). The plugin calls `setTitle()` on every message. Stream Deck's WebSocket connection to the plugin gets flooded with update commands. The UI lags, the plugin's event loop blocks, and eventually the WebSocket connection drops.

**Consequences:** Plugin crash, UI freeze, all buttons become unresponsive.

**Warning signs:**
- Buttons flicker rapidly
- Stream Deck app becomes sluggish
- Plugin log shows WebSocket backpressure warnings

**Prevention:**
- Throttle `setTitle()` / `setImage()` calls to max 2-4 updates per second per button
- Use a simple throttle: store latest value, update on a 250ms timer, skip intermediate values
- Never call `setTitle()` synchronously inside the MQTT `message` callback for high-frequency topics
- Document in the PI that high-frequency topics will be throttled

**Phase:** Phase 2 (robustness). MVP can skip this if test topics are low-frequency, but must be added before release.

### Trap 2: Base64 Image Encoding on Every Update

**What goes wrong:** Dynamic button images are generated and base64-encoded on every MQTT message. For 32 buttons receiving updates, that's 32 SVG renders + 32 base64 encodes per update cycle.

**Prevention:**
- Cache rendered images by their input parameters (value, state, color)
- Use a simple `Map<string, string>` where key is `${state}-${value}` and value is the base64 string
- Only re-render when the visual output would actually change

**Phase:** Phase 3 (optimization). Not a problem at low button counts, becomes critical at 32 buttons.

### Trap 3: MQTT.js QoS 1/2 Memory Growth

**What goes wrong:** Using QoS 1 or 2 with MQTT.js causes a ~4KB/second memory increase due to inflight message tracking, as [documented in issue #161](https://github.com/mqttjs/MQTT.js/issues/161). Over hours of operation, this accumulates.

**Prevention:**
- Default to QoS 0 for subscriptions (sensor data, status updates -- at-most-once is fine)
- Only use QoS 1 for publish actions where delivery confirmation matters (toggle commands)
- Never use QoS 2 unless the user explicitly enables it and understands the trade-off
- Monitor `process.memoryUsage().heapUsed` periodically; log warnings if it exceeds a threshold

**Phase:** Phase 1 (defaults). Set the right defaults early.

---

## Security Mistakes

### Mistake 1: TLS Certificate Validation Disabled by Default

**What goes wrong:** To make TLS "just work" during development, developer sets `rejectUnauthorized: false` in the MQTT client options. This ships to production, making the plugin vulnerable to MITM attacks.

**Prevention:**
- Default `rejectUnauthorized: true`
- Provide a PI checkbox for "Accept self-signed certificates" that sets it to `false`
- If the user provides a CA certificate file path, load and use it via the `ca` option
- Log a warning in the plugin when `rejectUnauthorized` is disabled

**Phase:** Phase 2 (TLS support).

### Mistake 2: MQTT Client ID Collisions

**What goes wrong:** Two instances of the plugin (e.g., on two computers sharing a broker) use the same hardcoded client ID. The broker disconnects the first client when the second connects with the same ID. Both enter a reconnect loop, kicking each other off endlessly.

**Prevention:**
- Generate a unique client ID per installation: `streamdeck-mqtt-${crypto.randomUUID()}`
- Store the generated ID in global settings so it persists across restarts but is unique per machine
- Never hardcode a client ID

**Phase:** Phase 1 (connection setup).

---

## "Looks Done But Isn't" Checklist

These items pass basic testing but fail in real-world use.

| Feature | What Seems Done | What's Actually Missing |
|---------|----------------|------------------------|
| Toggle button | Works with test topic | Fails when external source changes state -- button shows "on" but device is "off" because toggle tracked local state instead of subscribing to state feedback |
| Reconnect | MQTT.js `reconnectPeriod` auto-reconnects | Subscriptions silently lost after reconnect; buttons show stale data |
| Multi-broker | Can configure different brokers per button | No connection pooling; 10 buttons on same broker = 10 TCP connections |
| PI settings | Form saves and loads | Credentials leak in profile exports; no validation of host/port format; PI shows stale data if opened during reconnect |
| Button images | Static on/off icons work | Images don't adapt to Stream Deck model (72x72 vs 96x96); no error/disconnected state icon |
| Manifest | Plugin loads in development | Missing `SupportedInMultiActions: false`, so buttons break inside multi-action folders |
| Payload config | Can set custom publish payload | No template variables (can't send `{"state": "{{toggle_value}}", "timestamp": "{{now}}"}`) |
| Error handling | Plugin doesn't crash on broker timeout | No user-visible feedback -- button looks normal but isn't connected; no error icon |
| Profile switch | Buttons work on current profile | Profile switch triggers `onWillDisappear` + `onWillAppear` for all buttons; if this causes unsubscribe-then-resubscribe, there's a brief window where messages are dropped |
| Clean shutdown | Plugin stops when Stream Deck quits | MQTT connections not explicitly closed; TCP sockets linger in TIME_WAIT; broker shows ghost clients |

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Connection Manager | Creating per-button connections instead of per-broker pool | Design `BrokerConnectionManager` with `topic -> Set<context>` routing from day one |
| Phase 1: Settings Architecture | Storing credentials in action settings | Global settings for credentials, action settings for topic/payload only |
| Phase 1: Action Lifecycle | Assuming `onWillDisappear` always fires before restart | Reset all state on plugin startup; rebuild from `onWillAppear` events |
| Phase 2: Property Inspector | Sending state to PI that isn't listening | PI pulls state on load; plugin reacts to PI events, never pushes unsolicited |
| Phase 2: Toggle Mode | Tracking toggle state locally instead of from MQTT feedback | Separate command topic (`cmnd/`) from state topic (`stat/`); always trust MQTT state |
| Phase 2: TLS Support | Disabling certificate validation for convenience | Default to strict validation; explicit user opt-out for self-signed certs |
| Phase 3: Multi-Device | One-to-one topic-to-button mapping | One-to-many mapping from the start (topic -> Set of button contexts) |
| Phase 3: Performance | No throttling on setTitle/setImage calls | Throttle to 250ms minimum per button; queue latest value, not every value |
| Phase 4: Distribution | Including dev files, node_modules bloat | Use `.sdignore`; verify package size; test fresh install on clean machine |
| Phase 4: Marketplace | Manifest missing required fields | Validate against Elgato's manifest schema before submission; test `streamdeck pack` output |

---

## Sources

- [Stream Deck SDK - Plugin Environment](https://docs.elgato.com/streamdeck/sdk/introduction/plugin-environment/)
- [Stream Deck SDK - Settings Guide](https://docs.elgato.com/streamdeck/sdk/guides/settings/)
- [Stream Deck SDK - Distribution](https://docs.elgato.com/streamdeck/sdk/introduction/distribution/)
- [Stream Deck SDK - Actions](https://docs.elgato.com/streamdeck/sdk/guides/actions/)
- [Stream Deck SDK - Keys](https://docs.elgato.com/streamdeck/sdk/guides/keys/)
- [MQTT.js GitHub - Memory Leak #791](https://github.com/mqttjs/MQTT.js/issues/791)
- [MQTT.js GitHub - Memory Leak #161](https://github.com/mqttjs/MQTT.js/issues/161)
- [MQTT.js GitHub - Reconnect Loop #1152](https://github.com/mqttjs/MQTT.js/issues/1152)
- [MQTT.js GitHub - Resubscribe Bug #1157](https://github.com/mqttjs/MQTT.js/issues/1157)
- [MQTT.js GitHub - Post-Reconnect Publish Failure #1727](https://github.com/mqttjs/MQTT.js/issues/1727)
- [MQTT.js GitHub - Duplicate Retained Messages #545](https://github.com/mqttjs/MQTT.js/issues/545)
- [MQTT.js GitHub - Multiple Subscriptions Same Topic #1739](https://github.com/mqttjs/MQTT.js/issues/1739)
- [HiveMQ - MQTT Persistent Sessions](https://www.hivemq.com/blog/mqtt-essentials-part-7-persistent-session-queuing-messages/)
- [EMQX - Clean Start and Session Expiry](https://www.emqx.com/en/blog/mqtt5-new-feature-clean-start-and-session-expiry-interval)
