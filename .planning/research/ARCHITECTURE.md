# Architecture Patterns

**Domain:** Stream Deck Plugin with Bidirectional MQTT
**Researched:** 2026-03-25

## System Overview

```
+-------------------------------------------------------------------+
|                     Stream Deck Application                        |
|                                                                    |
|  +---------------------------+   +-----------------------------+   |
|  |    Property Inspector     |   |      Plugin Backend         |   |
|  |    (Chromium Runtime)     |   |      (Node.js 20 Runtime)   |   |
|  |                           |   |                             |   |
|  |  Broker Config UI  <------+---+----> Global Settings Store  |   |
|  |  Per-Button Config <------+---+----> Action Settings Store  |   |
|  |  Connection Status <------+---+----> sendToPropertyInspector|   |
|  |                           |   |                             |   |
|  +---------------------------+   |  +------------------------+ |   |
|                                  |  |   MqttConnectionMgr    | |   |
|                                  |  |                        | |   |
|                                  |  |  broker-a -> MqttClient| |   |
|                                  |  |  broker-b -> MqttClient| |   |
|                                  |  +----------+-------------+ |   |
|                                  |             |               |   |
|                                  |  +----------v-------------+ |   |
|                                  |  |   TopicRouter           | |   |
|                                  |  |                        | |   |
|                                  |  |  topic -> [action-ctx]  | |   |
|                                  |  |  topic -> [action-ctx]  | |   |
|                                  |  +------------------------+ |   |
|                                  +-----------------------------+   |
+-------------------------------------------------------------------+
                                         |
                                         | TCP / TLS (port 1883/8883)
                                         |
                                   +-----v-----+
                                   | MQTT Broker|
                                   | (Mosquitto)|
                                   +-----------+
```

## Recommended Architecture

The plugin follows the standard Stream Deck SDK v2 architecture: a **Node.js backend** (the plugin process) and a **Chromium-based Property Inspector** (the config UI). These are two separate runtimes that communicate via the Stream Deck WebSocket bridge.

The critical architectural decision is the **Connection Manager pattern**: a singleton service in the plugin backend that manages a pool of MQTT client connections (one per unique broker), shared across all button instances. This avoids the antipattern of per-button connections which would overwhelm brokers and leak resources.

### Core Design Principles

1. **Single connection per broker** -- All buttons targeting the same broker share one `mqtt.MqttClient` instance
2. **Topic-based routing** -- A router maps incoming MQTT messages to the specific action contexts (buttons) that subscribed to each topic
3. **Action-scoped settings** -- Each button stores its own topic, payload, QoS via Stream Deck action settings
4. **Global settings for broker config** -- Broker credentials stored in global settings (encrypted by Stream Deck, not exported in profiles)
5. **Event-driven lifecycle** -- Buttons subscribe on `willAppear`, unsubscribe on `willDisappear`

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **plugin.ts** (Entry Point) | Registers actions, initializes ConnectionManager, calls `streamDeck.connect()` | StreamDeck SDK, ConnectionManager |
| **MqttToggleAction** | Handles keyDown (publish), willAppear (subscribe), willDisappear (unsubscribe), settings changes | StreamDeck SDK, ConnectionManager, TopicRouter |
| **MqttPublishAction** | Handles keyDown (publish-only, no subscribe) | StreamDeck SDK, ConnectionManager |
| **ConnectionManager** | Maintains broker-keyed Map of MqttClient instances, handles connect/disconnect/reconnect | mqtt.js library, TopicRouter |
| **TopicRouter** | Maps topic+broker to action contexts, dispatches incoming messages | ConnectionManager, Action instances |
| **Property Inspector (HTML/JS)** | Config UI for broker settings and per-button topic/payload config | StreamDeck SDK (sdpi-components) |
| **Global Settings** | Broker connection profiles (host, port, user, pass, TLS) | Property Inspector, Plugin backend |
| **Action Settings** | Per-button config (topic, payload, QoS, display mapping) | Property Inspector, Action classes |

## Data Flow

### 1. Button Press (Publish)

```
User presses button
  -> Stream Deck app sends keyDown event to plugin
  -> MqttToggleAction.onKeyDown(ev)
  -> Read action settings: { publishTopic, publishPayload, brokerId }
  -> ConnectionManager.getClient(brokerId)
  -> mqttClient.publish(topic, payload, { qos })
```

### 2. Incoming MQTT Message (Subscribe -> Update Button)

```
MQTT broker delivers message on subscribed topic
  -> mqtt.MqttClient emits 'message' event
  -> ConnectionManager forwards to TopicRouter
  -> TopicRouter looks up all action contexts subscribed to this topic
  -> For each context:
     -> Determine new button state from payload (e.g., "ON" -> state 0, "OFF" -> state 1)
     -> streamDeck.actions.getActionById(context).setTitle(value)
     -> streamDeck.actions.getActionById(context).setState(stateIndex)
```

### 3. Button Appears on Deck (Subscribe)

```
User drags action onto Stream Deck canvas
  -> Stream Deck sends willAppear event
  -> MqttToggleAction.onWillAppear(ev)
  -> Read action settings: { subscribeTopic, brokerId }
  -> TopicRouter.register(brokerId, subscribeTopic, ev.action.id)
  -> ConnectionManager.ensureSubscribed(brokerId, subscribeTopic)
  -> If first subscriber for this topic: mqttClient.subscribe(topic)
```

### 4. Button Removed from Deck (Unsubscribe)

```
User removes action from Stream Deck canvas
  -> Stream Deck sends willDisappear event
  -> MqttToggleAction.onWillDisappear(ev)
  -> TopicRouter.unregister(brokerId, subscribeTopic, ev.action.id)
  -> If no more subscribers for this topic: mqttClient.unsubscribe(topic)
  -> If no more subscriptions for this broker: ConnectionManager.disconnect(brokerId)
```

### 5. Settings Changed in Property Inspector

```
User changes broker or topic config in PI
  -> sdpi-components calls streamDeckClient.setSettings(newSettings)
  -> Stream Deck sends didReceiveSettings event to plugin
  -> MqttToggleAction.onDidReceiveSettings(ev)
  -> Diff old vs new settings
  -> If broker changed: unsubscribe old, subscribe new
  -> If topic changed: unregister old topic, register new topic
  -> If payload changed: just store (used on next keyDown)
```

### 6. Broker Config Changed (Global Settings)

```
User updates broker config in PI
  -> streamDeckClient.setGlobalSettings(brokerProfiles)
  -> Stream Deck sends didReceiveGlobalSettings to plugin
  -> ConnectionManager.updateBrokerConfig(brokerId, newConfig)
  -> Reconnect affected clients with new credentials
  -> Re-subscribe all topics for reconnected clients
```

## Recommended Project Structure

```
stream-deck-master/
|-- com.hulki.mqtt.sdPlugin/        # Plugin distribution folder
|   |-- manifest.json               # Plugin metadata, actions, states
|   |-- bin/                        # Rollup output (plugin.js)
|   |-- imgs/                       # Plugin and action icons
|   |   |-- plugin-icon.png         # 256x256 + 512x512
|   |   |-- mqtt-toggle.png         # 20x20 + 40x40 action icon
|   |   |-- mqtt-publish.png
|   |   |-- state-on.png            # 72x72 + 144x144 state images
|   |   |-- state-off.png
|   |   |-- state-unknown.png
|   |-- ui/                         # Property Inspector HTML
|   |   |-- mqtt-toggle.html        # Per-action PI (topic, payload config)
|   |   |-- mqtt-publish.html
|   |-- logs/                       # Runtime logs (auto-created)
|
|-- src/
|   |-- plugin.ts                   # Entry point: register actions, init manager, connect
|   |-- actions/
|   |   |-- mqtt-toggle.ts          # Toggle action (publish + subscribe)
|   |   |-- mqtt-publish.ts         # Publish-only action
|   |-- services/
|   |   |-- connection-manager.ts   # Broker connection pool (singleton)
|   |   |-- topic-router.ts         # Topic -> action context routing
|   |-- types/
|   |   |-- settings.ts             # Action settings, global settings types
|   |   |-- mqtt.ts                 # MQTT-related type definitions
|   |-- util/
|       |-- payload-mapper.ts       # Map MQTT payload to button state/title
|       |-- broker-key.ts           # Generate unique key from broker config
|
|-- package.json
|-- tsconfig.json
|-- rollup.config.mjs               # Bundle src/ -> sdPlugin/bin/plugin.js
```

## manifest.json Structure

```json
{
  "$schema": "https://schemas.elgato.com/streamdeck/plugins/manifest.json",
  "UUID": "com.hulki.mqtt",
  "Name": "MQTT",
  "Author": "hulki",
  "Description": "Bidirectional MQTT for Stream Deck. Publish on press, subscribe for live status.",
  "Version": "1.0.0.0",
  "CodePath": "bin/plugin.js",
  "Icon": "imgs/plugin-icon",
  "Category": "MQTT",
  "CategoryIcon": "imgs/plugin-icon",
  "Nodejs": {
    "Version": "20",
    "Debug": "enabled"
  },
  "SDKVersion": 2,
  "Software": {
    "MinimumVersion": "6.6"
  },
  "OS": [
    { "Platform": "mac", "MinimumVersion": "13" },
    { "Platform": "windows", "MinimumVersion": "10" }
  ],
  "Actions": [
    {
      "UUID": "com.hulki.mqtt.toggle",
      "Name": "MQTT Toggle",
      "Icon": "imgs/mqtt-toggle",
      "Tooltip": "Subscribe to topic and toggle on press",
      "PropertyInspectorPath": "ui/mqtt-toggle.html",
      "Controllers": ["Keypad"],
      "States": [
        {
          "Image": "imgs/state-off",
          "Title": "OFF",
          "TitleAlignment": "bottom",
          "ShowTitle": true
        },
        {
          "Image": "imgs/state-on",
          "Title": "ON",
          "TitleAlignment": "bottom",
          "ShowTitle": true
        }
      ]
    },
    {
      "UUID": "com.hulki.mqtt.publish",
      "Name": "MQTT Publish",
      "Icon": "imgs/mqtt-publish",
      "Tooltip": "Publish message on press",
      "PropertyInspectorPath": "ui/mqtt-publish.html",
      "Controllers": ["Keypad"],
      "States": [
        {
          "Image": "imgs/state-off",
          "Title": "",
          "ShowTitle": true
        }
      ]
    }
  ]
}
```

## Patterns to Follow

### Pattern 1: Singleton Connection Manager

**What:** A single `ConnectionManager` class manages all MQTT connections, keyed by a broker identifier (hash of host+port+user).

**Why:** MQTT brokers have connection limits. Multiple buttons targeting the same broker must share one TCP connection. The `mqtt` npm package handles multiplexing subscriptions over a single connection natively.

**Example:**
```typescript
class ConnectionManager {
  private clients: Map<string, mqtt.MqttClient> = new Map();

  getOrCreate(brokerConfig: BrokerConfig): mqtt.MqttClient {
    const key = brokerKey(brokerConfig);
    if (!this.clients.has(key)) {
      const client = mqtt.connect({
        host: brokerConfig.host,
        port: brokerConfig.port,
        username: brokerConfig.username,
        password: brokerConfig.password,
        protocol: brokerConfig.tls ? "mqtts" : "mqtt",
        reconnectPeriod: 5000,
        clean: true,
      });
      client.on("message", (topic, payload) => {
        this.topicRouter.dispatch(key, topic, payload.toString());
      });
      this.clients.set(key, client);
    }
    return this.clients.get(key)!;
  }
}
```

### Pattern 2: Reference-Counted Subscriptions

**What:** Track how many action contexts are subscribed to each topic. Only call `mqttClient.subscribe()` when the first context subscribes, and `mqttClient.unsubscribe()` when the last context unsubscribes.

**Why:** Avoids duplicate subscriptions and ensures clean unsubscribe when buttons are removed.

**Example:**
```typescript
class TopicRouter {
  // broker-key -> topic -> Set<action-context-id>
  private subscriptions: Map<string, Map<string, Set<string>>> = new Map();

  register(brokerKey: string, topic: string, contextId: string): boolean {
    // ... add to set, return true if this is the first subscriber (needs mqtt.subscribe)
  }

  unregister(brokerKey: string, topic: string, contextId: string): boolean {
    // ... remove from set, return true if no subscribers remain (needs mqtt.unsubscribe)
  }

  dispatch(brokerKey: string, topic: string, payload: string): void {
    const contexts = this.subscriptions.get(brokerKey)?.get(topic);
    if (contexts) {
      for (const contextId of contexts) {
        // Update each button via Stream Deck SDK
      }
    }
  }
}
```

### Pattern 3: Action Lifecycle as Subscription Lifecycle

**What:** Bind MQTT subscriptions to the Stream Deck action lifecycle events (`willAppear` / `willDisappear`), not to settings changes alone.

**Why:** Stream Deck manages when actions are visible. A button not on the active profile should not consume MQTT subscriptions. The SDK guarantees `willAppear` fires when a button becomes active and `willDisappear` when it leaves.

### Pattern 4: Payload-to-State Mapping

**What:** A configurable mapper that translates incoming MQTT payloads to button visual states (state index, title text, optional image).

**Why:** Different users have different MQTT conventions. Some use "ON"/"OFF", others "1"/"0", others JSON payloads like `{"state":"running"}`. The mapper should be configurable per button.

**Example default rules:**
```typescript
function mapPayloadToState(payload: string, settings: ActionSettings): ButtonUpdate {
  const onValues = settings.onValue ? [settings.onValue] : ["ON", "on", "1", "true"];
  const offValues = settings.offValue ? [settings.offValue] : ["OFF", "off", "0", "false"];

  if (onValues.includes(payload)) return { state: 0, title: settings.onLabel ?? payload };
  if (offValues.includes(payload)) return { state: 1, title: settings.offLabel ?? payload };
  // Unknown value: show raw payload as title, keep current state
  return { title: payload };
}
```

### Pattern 5: Global Settings for Broker Profiles

**What:** Store broker connection profiles (host, port, credentials) in Stream Deck global settings. Each profile gets a unique ID. Action settings reference the profile ID, not the raw connection details.

**Why:**
- Security: Global settings are encrypted, action settings are plain text and exported with profiles
- DRY: Multiple buttons share the same broker -- configure once
- UX: Property Inspector shows a dropdown of configured brokers

## Anti-Patterns to Avoid

### Anti-Pattern 1: Per-Button MQTT Connections

**What:** Creating a new `mqtt.connect()` for every button instance.

**Why bad:** With 32 buttons (Stream Deck XL), this creates 32 TCP connections to potentially the same broker. Brokers have connection limits, and each connection consumes memory and file descriptors. Reconnect storms after network blip.

**Instead:** Use ConnectionManager with shared connections per broker.

### Anti-Pattern 2: Subscribing in Settings Change Handler Only

**What:** Only calling `mqttClient.subscribe()` when settings change, not on `willAppear`.

**Why bad:** When Stream Deck restarts or the user switches profiles, `willAppear` fires but `didReceiveSettings` may not fire with the expected timing. Subscriptions are lost after restart.

**Instead:** Always subscribe in `willAppear` and unsubscribe in `willDisappear`. Treat settings changes as "re-subscribe with new config."

### Anti-Pattern 3: Storing Credentials in Action Settings

**What:** Putting broker username/password in per-action settings.

**Why bad:** Action settings are stored as plain text and are included when exporting Stream Deck profiles. Users sharing profiles would leak credentials.

**Instead:** Store credentials in global settings (which are encrypted and not exported).

### Anti-Pattern 4: Blocking the Plugin Event Loop

**What:** Synchronous MQTT operations or heavy payload processing blocking the Node.js event loop.

**Why bad:** The plugin backend is a single Node.js process handling all button events. Blocking it freezes all buttons.

**Instead:** All MQTT operations are already async in mqtt.js. Keep payload mapping lightweight.

## Key Interfaces

```typescript
// Global settings: broker profiles
interface GlobalSettings {
  brokers: BrokerProfile[];
}

interface BrokerProfile {
  id: string;           // UUID
  name: string;         // User-friendly label
  host: string;
  port: number;
  username?: string;
  password?: string;
  tls: boolean;
  clientId?: string;    // Optional, auto-generated if empty
}

// Per-action settings: MQTT Toggle
interface MqttToggleSettings {
  brokerId: string;          // Reference to BrokerProfile.id
  subscribeTopic: string;    // Topic to subscribe to
  publishTopic: string;      // Topic to publish to (often same as subscribe)
  payloadOn: string;         // Payload to send for "on" state
  payloadOff: string;        // Payload to send for "off" state
  onValue?: string;          // Incoming payload that means "on" (default: "ON")
  offValue?: string;         // Incoming payload that means "off" (default: "OFF")
  qos: 0 | 1 | 2;           // MQTT QoS level
  retain: boolean;           // Publish with retain flag
  onLabel?: string;          // Custom button title for on state
  offLabel?: string;         // Custom button title for off state
}

// Per-action settings: MQTT Publish
interface MqttPublishSettings {
  brokerId: string;
  publishTopic: string;
  payload: string;
  qos: 0 | 1 | 2;
  retain: boolean;
}
```

## Scalability Considerations

| Concern | 5 buttons | 15 buttons (MK.2) | 32 buttons (XL) |
|---------|-----------|--------------------|--------------------|
| Connections | 1 per broker (shared) | 1 per broker (shared) | 1 per broker (shared) |
| Subscriptions | 5 topics max | 15 topics max | 32 topics max |
| Message throughput | No concern | No concern | High-frequency topics (>10 msg/s) could cause title update flood -- debounce |
| Memory | Negligible | Negligible | Negligible (mqtt.js is lightweight) |

**Debounce consideration:** If an MQTT topic publishes very frequently (e.g., sensor data every 100ms), updating button title on every message would waste CPU. Add optional debounce (200-500ms) for display updates, not for state changes.

## Build and Packaging Pipeline

```
Source (TypeScript)          Build (Rollup)              Package (CLI)
src/**/*.ts          ->      rollup -c             ->   streamdeck pack
                             |                          |
                             v                          v
                     sdPlugin/bin/plugin.js       com.hulki.mqtt.streamDeckPlugin
```

**Build:** Rollup bundles all TypeScript into a single `plugin.js` in the `.sdPlugin/bin/` directory. The `mqtt` npm package and all dependencies are bundled inline (no node_modules in the plugin).

**Watch mode:** `rollup -c -w --watch.onEnd="streamdeck restart com.hulki.mqtt"` -- rebuilds on file change and restarts the plugin in Stream Deck.

**Package:** `streamdeck pack com.hulki.mqtt.sdPlugin` creates a `.streamDeckPlugin` file for distribution. Excludes `.git`, `.env*`, `*.log`, `*.js.map` by default.

**Install for dev:** `streamdeck link com.hulki.mqtt.sdPlugin` symlinks the plugin directory into Stream Deck's plugin folder for live development.

## Suggested Build Order (Dependencies)

The architecture has clear dependency layers that dictate build order:

```
Phase 1: Foundation
  types/settings.ts, types/mqtt.ts
  util/broker-key.ts
  manifest.json + plugin icon assets

Phase 2: Core Services (no UI needed yet)
  services/connection-manager.ts
  services/topic-router.ts
  util/payload-mapper.ts

Phase 3: Actions (depends on services)
  actions/mqtt-toggle.ts
  actions/mqtt-publish.ts
  plugin.ts (entry point wiring)

Phase 4: Property Inspector (depends on manifest + types)
  ui/mqtt-toggle.html (sdpi-components)
  ui/mqtt-publish.html

Phase 5: Polish
  State images, icons
  Error handling, reconnect UX
  Debounce for high-frequency topics
  streamdeck pack for distribution
```

**Rationale:** Services can be tested independently with a real MQTT broker before any UI exists. Actions depend on services. Property Inspector depends on knowing the settings schema but can be built in parallel with actions. Icons and images are independent and can be created anytime.

## Sources

- [Stream Deck SDK Architecture](https://docs.elgato.com/streamdeck/sdk/introduction/plugin-environment/)
- [Stream Deck Actions Guide](https://docs.elgato.com/streamdeck/sdk/guides/actions/)
- [Stream Deck Manifest Reference](https://docs.elgato.com/streamdeck/sdk/references/manifest/)
- [Stream Deck Settings Guide](https://docs.elgato.com/streamdeck/sdk/guides/settings/)
- [Stream Deck Property Inspector UI](https://docs.elgato.com/streamdeck/sdk/guides/ui/)
- [Stream Deck Property Inspector WebSocket API](https://docs.elgato.com/streamdeck/sdk/references/websocket/ui/)
- [Stream Deck Getting Started](https://docs.elgato.com/streamdeck/sdk/introduction/getting-started/)
- [Stream Deck CLI Pack Command](https://docs.elgato.com/streamdeck/cli/commands/pack/)
- [@elgato/streamdeck npm](https://www.npmjs.com/package/@elgato/streamdeck)
- [MQTT.js GitHub](https://github.com/mqttjs/MQTT.js)
- [hobbyquaker/streamdeck-plugin-mqtt](https://github.com/hobbyquaker/streamdeck-plugin-mqtt) -- Existing bidirectional MQTT plugin (reference)
- [pherting/streamdeck-mqtt](https://github.com/pherting/streamdeck-mqtt) -- Existing MQTT plugin (reference)
