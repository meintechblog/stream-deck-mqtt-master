# Phase 1: Core MQTT Plugin - Research

**Researched:** 2026-03-25
**Domain:** Stream Deck SDK v2 + MQTT.js + Node.js Plugin Development
**Confidence:** HIGH

## Summary

Phase 1 delivers a working Stream Deck plugin with bidirectional MQTT: a single unified "MQTT" action type that can publish on button press and subscribe to live title updates. The plugin uses `@elgato/streamdeck` SDK v2 (Node.js), `mqtt` npm package (MQTT.js v5), and Rollup for bundling. The architecture centers on a ConnectionManager singleton (one TCP connection per broker) and a TopicRouter (topic-to-button-context mapping with reference counting).

The prior research in `.planning/research/` provides HIGH confidence on all stack choices, architecture patterns, and pitfalls. The key adaptation for Phase 1 is the user decision D-01 (unified action) which differs from the ARCHITECTURE.md research (which suggested separate toggle/publish actions). This means ONE action class handles all modes via configuration, with only the Property Inspector and settings determining behavior.

**Primary recommendation:** Scaffold with `streamdeck create`, add `mqtt` + `zod` dependencies, implement ConnectionManager and TopicRouter as services, create a single `MqttAction` class, and a minimal PI HTML form. Test against Mosquitto at 192.168.3.8:1883.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Unified Action -- one "MQTT" action type that handles Publish, Subscribe, and Toggle via configuration. No separate action types.
- **D-02:** 2 Button States -- State 0 (off/default) and State 1 (on/active). Covers toggle and status display use cases.
- **D-03:** Plugin name: **MQTT Master**
- **D-04:** Plugin UUID: `io.github.meintechblog.mqtt-master` (reverse-DNS based on GitHub user)
- **D-05:** GitHub repo: `meintechblog/stream-deck-mqtt-master` (to be created)
- **D-06:** Phase 1 includes a minimal Property Inspector (basic HTML form for Host/Port/Topic/Payload). Functional but unstyled. Phase 2 polishes the UI.
- **D-07:** Single broker support in Phase 1. ConnectionManager architecture should be ready for multi-broker, but UI only supports one broker config. Multi-broker comes in Phase 2+.
- **D-08:** Development and testing directly on remote Mac Mini (`ssh admin@mini-von-jorg-7.local`). Stream Deck app runs there, plugin sideloaded into `~/Library/Application Support/com.elgato.StreamDeck/Plugins/`.
- **D-09:** Use `streamdeck create` CLI scaffolding for project initialization.

### Claude's Discretion
- ConnectionManager internal architecture (singleton pattern, connection pooling data structures)
- TopicRouter implementation (topic-to-context mapping, subscription reference counting)
- Rollup bundling configuration for `mqtt` npm package
- Error handling and logging patterns
- TypeScript strict mode and configuration details

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONN-01 | Plugin connects to MQTT broker via TCP (Host + Port configurable) | `mqtt.connect({ host, port, protocol: "mqtt" })` -- MQTT.js native TCP support |
| CONN-02 | Optional username/password authentication | `mqtt.connect({ username, password })` -- built-in MQTT.js option |
| CONN-03 | TLS/SSL encrypted connections | `mqtt.connect({ protocol: "mqtts", rejectUnauthorized })` -- MQTT.js TLS support |
| CONN-04 | Auto-reconnect after connection loss | `mqtt.connect({ reconnectPeriod: 5000 })` + explicit resubscription on `connect` event |
| CONN-05 | Multiple buttons share single broker connection (Connection Pooling) | ConnectionManager singleton with `Map<brokerKey, MqttClient>` |
| CONN-06 | Broker credentials stored securely in Global Settings | `streamDeck.settings.setGlobalSettings()` -- encrypted, not exported in profiles |
| PUB-01 | Button press publishes configurable payload to configurable topic | `client.publish(topic, payload, { qos, retain })` in `onKeyDown` handler |
| PUB-02 | QoS level (0, 1, 2) configurable per button | Action settings `qos` field, passed to publish options |
| PUB-03 | Retain flag configurable per publish action | Action settings `retain` boolean, passed to publish options |
| SUB-01 | Button subscribes to configurable MQTT topic | `client.subscribe(topic)` via TopicRouter on `onWillAppear` |
| SUB-02 | Button title updates live with received MQTT value | `ev.action.setTitle(payload)` in TopicRouter dispatch callback |
| ARCH-01 | Plugin runs as persistent Node.js process with stable MQTT connection | SDK v2 Node.js runtime with `streamDeck.connect()` -- persistent by design |
| ARCH-02 | ConnectionManager implements Singleton with per-broker pooling | Single instance, `Map<string, MqttClient>`, broker key from host+port hash |
| ARCH-03 | TopicRouter routes incoming messages to correct buttons (1:N) | `Map<string, Map<string, Set<string>>>` -- broker -> topic -> action contexts |
| ARCH-04 | Compatible with Stream Deck MK.2 (15 keys) and XL (32 keys) | `Controllers: ["Keypad"]` in manifest, no hardware-specific code needed |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@elgato/streamdeck` | 2.0.4 | Stream Deck SDK -- action definitions, events, settings | Only official SDK for Node.js plugins. TypeScript-first. Verified 2026-03-25 on npm. |
| `mqtt` (MQTT.js) | 5.15.1 | MQTT client -- TCP, TLS, auto-reconnect, QoS | Standard Node.js MQTT client. TypeScript rewrite since v5. Verified 2026-03-25 on npm. |
| TypeScript | ~5.7 | Type safety | SDK scaffold includes it. Use whatever version SDK ships with. |
| Node.js | 20 | Plugin runtime | Bundled by Stream Deck app. Specified in manifest.json `Nodejs.Version: "20"`. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | 4.3.6 | Runtime validation of settings | Always. SDK docs recommend schema validation for settings. |
| `@rollup/plugin-node-resolve` | ^16.x | Resolve node_modules in Rollup | Always. Required to bundle `mqtt` into single output file. |
| `@rollup/plugin-commonjs` | ^28.x | Convert CJS to ESM for Rollup | Always. `mqtt` has CJS transitive dependencies. |
| `@rollup/plugin-json` | ^6.x | Import JSON files in Rollup | Preemptive. Some mqtt internals may import JSON. |
| `@rollup/plugin-typescript` | ^12.x | TS compilation in Rollup pipeline | Always. SDK scaffold uses Rollup for build. |

### Development Tools
| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `@elgato/cli` | 1.7.3 | Scaffold, link, pack, dev-mode | Install globally: `npm install -g @elgato/cli`. Verified on npm 2026-03-25. |
| `rollup` | ^4.60 | Module bundler | SDK scaffold default. `rollup -c` for build. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `mqtt` | `MQTT.ts` | Smaller but niche, no ecosystem, no community. Not recommended. |
| Rollup | esbuild | Faster but SDK tests against Rollup output. Risk of incompatibility. |
| Zod | yup/ajv | Zod has best TS DX, recommended by SDK docs. |
| Plain HTML PI | React/Svelte | Massive overkill for 5-field config form. Extra build pipeline. |

**Installation (on Mac Mini):**
```bash
# 1. Install CLI globally
npm install -g @elgato/cli@latest

# 2. Scaffold plugin
streamdeck create
# Enter: MQTT Master, io.github.meintechblog.mqtt-master

# 3. Add MQTT + validation
cd io.github.meintechblog.mqtt-master
npm install mqtt zod

# 4. Add Rollup plugins for bundling mqtt (some may exist from scaffold)
npm install -D @rollup/plugin-node-resolve @rollup/plugin-commonjs @rollup/plugin-json
```

## Architecture Patterns

### Recommended Project Structure

**Important:** User decision D-01 requires a UNIFIED action. The ARCHITECTURE.md research suggested separate `mqtt-toggle.ts` and `mqtt-publish.ts` -- this is overridden. One action class, one PI page.

```
io.github.meintechblog.mqtt-master/
|-- io.github.meintechblog.mqtt-master.sdPlugin/   # Plugin distribution folder
|   |-- manifest.json               # Plugin metadata, single action definition
|   |-- bin/                        # Rollup output (plugin.js)
|   |-- imgs/                       # Plugin and action icons
|   |   |-- plugin-icon.png         # 256x256 + 512x512
|   |   |-- mqtt-action.png         # 20x20 + 40x40 action icon
|   |   |-- state-off.png           # 72x72 + 144x144 state 0 image
|   |   |-- state-on.png            # 72x72 + 144x144 state 1 image
|   |-- ui/                         # Property Inspector HTML
|   |   |-- mqtt-action.html        # Minimal config form (broker + topic + payload)
|   |-- logs/                       # Runtime logs (auto-created)
|
|-- src/
|   |-- plugin.ts                   # Entry point: register action, init, connect
|   |-- actions/
|   |   |-- mqtt-action.ts          # Unified MQTT action (publish + subscribe)
|   |-- services/
|   |   |-- connection-manager.ts   # Broker connection pool (singleton)
|   |   |-- topic-router.ts         # Topic -> action context routing
|   |-- types/
|   |   |-- settings.ts             # Zod schemas + types for action/global settings
|   |-- util/
|       |-- broker-key.ts           # Generate unique key from broker config
|       |-- logger.ts               # Structured logging wrapper
|
|-- package.json
|-- tsconfig.json
|-- rollup.config.mjs
```

### Pattern 1: Unified Action with Mode Configuration

**What:** A single `MqttAction` class extending `SingletonAction` handles all MQTT modes (publish-only, subscribe-only, both). The mode is determined by which settings fields are populated.

**When to use:** Always -- this is locked decision D-01.

**Example:**
```typescript
// Source: Stream Deck SDK Actions docs + user decision D-01
import streamDeck, { action, SingletonAction, type KeyDownEvent, type WillAppearEvent, type WillDisappearEvent } from "@elgato/streamdeck";

@action({ UUID: "io.github.meintechblog.mqtt-master.mqtt" })
export class MqttAction extends SingletonAction<MqttActionSettings> {

  override async onWillAppear(ev: WillAppearEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    if (settings.subscribeTopic) {
      topicRouter.register(brokerKey, settings.subscribeTopic, ev.action.id);
      connectionManager.ensureSubscribed(brokerKey, settings.subscribeTopic);
    }
    // Restore last known value from cached settings
    if (settings.lastValue) {
      await ev.action.setTitle(settings.lastValue);
    }
  }

  override async onKeyDown(ev: KeyDownEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    if (settings.publishTopic && settings.publishPayload) {
      const client = connectionManager.getOrCreate(brokerConfig);
      client.publish(settings.publishTopic, settings.publishPayload, {
        qos: settings.qos ?? 0,
        retain: settings.retain ?? false,
      });
    }
  }

  override async onWillDisappear(ev: WillDisappearEvent<MqttActionSettings>): Promise<void> {
    const settings = ev.payload.settings;
    if (settings.subscribeTopic) {
      topicRouter.unregister(brokerKey, settings.subscribeTopic, ev.action.id);
    }
  }
}
```

### Pattern 2: ConnectionManager Singleton

**What:** Single instance managing all MQTT connections, keyed by broker config hash. Explicitly resubscribes on every `connect` event (not just `reconnect`).

**When to use:** Always -- ARCH-02.

**Critical detail:** Do NOT rely on MQTT.js built-in `resubscribe`. Maintain your own `Set<string>` of active topics and resubscribe them on every `connect` event. This handles both initial connect and reconnect scenarios reliably.

**Example:**
```typescript
// Source: ARCHITECTURE.md research + PITFALLS.md
class ConnectionManager {
  private clients: Map<string, mqtt.MqttClient> = new Map();
  private activeTopics: Map<string, Set<string>> = new Map(); // broker -> topics

  getOrCreate(config: BrokerConfig): mqtt.MqttClient {
    const key = brokerKey(config);
    if (!this.clients.has(key)) {
      const client = mqtt.connect({
        host: config.host,
        port: config.port,
        username: config.username || undefined,
        password: config.password || undefined,
        protocol: config.tls ? "mqtts" : "mqtt",
        reconnectPeriod: 5000,
        clean: true,
        clientId: `streamdeck-mqtt-${crypto.randomUUID()}`,
      });

      // Resubscribe ALL topics on every connect (handles reconnect too)
      client.on("connect", () => {
        const topics = this.activeTopics.get(key);
        if (topics && topics.size > 0) {
          client.subscribe([...topics]);
        }
      });

      client.on("message", (topic, payload) => {
        topicRouter.dispatch(key, topic, payload.toString());
      });

      this.clients.set(key, client);
      this.activeTopics.set(key, new Set());
    }
    return this.clients.get(key)!;
  }

  ensureSubscribed(key: string, topic: string): void {
    const topics = this.activeTopics.get(key);
    if (topics && !topics.has(topic)) {
      topics.add(topic);
      const client = this.clients.get(key);
      if (client?.connected) {
        client.subscribe(topic);
      }
      // If not connected yet, will be subscribed on 'connect' event
    }
  }
}
```

### Pattern 3: TopicRouter with Reference Counting

**What:** Maps `brokerKey -> topic -> Set<actionContextId>`. Dispatches incoming messages to all subscribed button contexts. Only calls `mqtt.subscribe()` for the first subscriber, `mqtt.unsubscribe()` when the last leaves.

**Example:**
```typescript
// Source: ARCHITECTURE.md research
class TopicRouter {
  // brokerKey -> topic -> Set<contextId>
  private subscriptions = new Map<string, Map<string, Set<string>>>();

  register(brokerKey: string, topic: string, contextId: string): boolean {
    if (!this.subscriptions.has(brokerKey)) {
      this.subscriptions.set(brokerKey, new Map());
    }
    const brokerTopics = this.subscriptions.get(brokerKey)!;
    if (!brokerTopics.has(topic)) {
      brokerTopics.set(topic, new Set());
    }
    const contexts = brokerTopics.get(topic)!;
    const isFirst = contexts.size === 0;
    contexts.add(contextId);
    return isFirst; // caller should mqtt.subscribe if true
  }

  unregister(brokerKey: string, topic: string, contextId: string): boolean {
    const contexts = this.subscriptions.get(brokerKey)?.get(topic);
    if (!contexts) return false;
    contexts.delete(contextId);
    return contexts.size === 0; // caller should mqtt.unsubscribe if true
  }

  dispatch(brokerKey: string, topic: string, payload: string): void {
    const contexts = this.subscriptions.get(brokerKey)?.get(topic);
    if (contexts) {
      for (const contextId of contexts) {
        // Update each button -- caller provides the update callback
      }
    }
  }
}
```

### Pattern 4: Global Settings for Broker Config (CONN-06)

**What:** Store broker credentials in global settings (encrypted, not exported). Action settings only hold topic/payload/QoS.

**Example:**
```typescript
// Source: Stream Deck SDK Settings docs
// Global settings -- secure, not exported
interface GlobalSettings {
  broker: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    tls: boolean;
    clientId: string; // auto-generated UUID, persisted
  };
}

// Action settings -- per button, plain text, exported in profiles
interface MqttActionSettings {
  subscribeTopic?: string;
  publishTopic?: string;
  publishPayload?: string;
  qos: 0 | 1 | 2;
  retain: boolean;
  lastValue?: string; // cached for restart recovery
}
```

### Pattern 5: Minimal Property Inspector (D-06)

**What:** Plain HTML with `sdpi-components.js` web components. No framework. Basic form fields for broker host/port and topic/payload.

**Example:**
```html
<!-- Source: Stream Deck SDK UI docs -->
<!doctype html>
<html>
<head lang="en">
    <meta charset="utf-8" />
    <script src="sdpi-components.js"></script>
</head>
<body>
    <sdpi-item label="MQTT Topic">
        <sdpi-textfield setting="subscribeTopic" placeholder="home/sensor/temperature"></sdpi-textfield>
    </sdpi-item>
    <sdpi-item label="Publish Topic">
        <sdpi-textfield setting="publishTopic" placeholder="home/light/toggle"></sdpi-textfield>
    </sdpi-item>
    <sdpi-item label="Payload">
        <sdpi-textfield setting="publishPayload" placeholder="ON"></sdpi-textfield>
    </sdpi-item>
    <sdpi-item label="QoS">
        <sdpi-select setting="qos">
            <option value="0">0 - At most once</option>
            <option value="1">1 - At least once</option>
            <option value="2">2 - Exactly once</option>
        </sdpi-select>
    </sdpi-item>
    <sdpi-item label="Retain">
        <sdpi-checkbox setting="retain"></sdpi-checkbox>
    </sdpi-item>
</body>
</html>
```

**Note:** Broker host/port config needs separate handling since it goes into global settings, not action settings. For Phase 1 (single broker, D-07), the PI can use `SDPIComponents.streamDeckClient` to read/write global settings for broker config alongside per-action settings for topic/payload.

### manifest.json Template (adapted for D-01, D-03, D-04)

```json
{
  "$schema": "https://schemas.elgato.com/streamdeck/plugins/manifest.json",
  "UUID": "io.github.meintechblog.mqtt-master",
  "Name": "MQTT Master",
  "Author": "meintechblog",
  "Description": "Bidirectional MQTT for Stream Deck. Publish on press, subscribe for live status.",
  "Version": "0.1.0.0",
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
      "UUID": "io.github.meintechblog.mqtt-master.mqtt",
      "Name": "MQTT",
      "Icon": "imgs/mqtt-action",
      "Tooltip": "Publish and subscribe to MQTT topics",
      "PropertyInspectorPath": "ui/mqtt-action.html",
      "SupportedInMultiActions": false,
      "Controllers": ["Keypad"],
      "States": [
        {
          "Image": "imgs/state-off",
          "Title": "MQTT",
          "TitleAlignment": "bottom",
          "ShowTitle": true
        },
        {
          "Image": "imgs/state-on",
          "Title": "MQTT",
          "TitleAlignment": "bottom",
          "ShowTitle": true
        }
      ]
    }
  ]
}
```

### Anti-Patterns to Avoid
- **Per-button MQTT connections:** Creates N TCP connections instead of 1. Use ConnectionManager.
- **Subscribing only in didReceiveSettings:** Misses `willAppear` after restart. Always subscribe in `willAppear`.
- **Credentials in action settings:** Exported in profiles. Always use global settings for credentials.
- **Blocking event loop:** All MQTT ops are async. Keep payload mapping lightweight.
- **Relying on MQTT.js `resubscribe`:** Has known bugs. Maintain own topic set, resubscribe on `connect`.
- **Hardcoded client ID:** Causes reconnect loops when two instances share a broker. Use `crypto.randomUUID()`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MQTT client | Custom TCP/WebSocket handler | `mqtt` npm package | Handles QoS, keepalive, reconnect, TLS, topic wildcards. Thousands of edge cases. |
| Settings validation | Manual type checks | `zod` schemas | SDK explicitly recommends. Runtime types != compile types. |
| PI web components | Custom HTML/CSS form widgets | `sdpi-components.js` | Matches Stream Deck design language. Auto data-binding with settings. |
| Plugin scaffolding | Manual manifest + rollup config | `streamdeck create` CLI | Generates correct structure, manifest schema, rollup config. Tested by Elgato. |
| UUID generation | Math.random or timestamp | `crypto.randomUUID()` | Proper UUIDs, available in Node.js 20, no dependency. |

**Key insight:** Stream Deck plugin development has a very specific ecosystem. The SDK, CLI, and sdpi-components are tightly coupled. Deviating from the standard scaffold creates integration risk for zero benefit.

## Common Pitfalls

### Pitfall 1: MQTT Reconnect Loses Subscriptions
**What goes wrong:** After broker restart or network blip, MQTT.js reconnects but subscriptions silently disappear. Buttons show stale data.
**Why it happens:** MQTT.js `resubscribe` has documented bugs (GitHub #1157). With `clean: true`, broker discards session on disconnect.
**How to avoid:** Maintain own `Set<string>` of active topics in ConnectionManager. On every `connect` event (not just `reconnect`), iterate and resubscribe all.
**Warning signs:** Buttons work initially but stop updating after WiFi reconnect or broker restart.

### Pitfall 2: willAppear/willDisappear Asymmetry on Plugin Restart
**What goes wrong:** Plugin crashes, Stream Deck restarts it. `willDisappear` was never called for old session. `willAppear` fires for all visible buttons. Subscription reference counts double.
**Why it happens:** Plugin crash is not a clean shutdown. SDK does not fire `willDisappear` for crashed plugin.
**How to avoid:** On plugin startup, reset ALL tracking state. Treat `willAppear` as the source of truth -- rebuild subscription map entirely from `willAppear` events.
**Warning signs:** Subscription counts grow over time. Topics never unsubscribe.

### Pitfall 3: Credentials in Action Settings
**What goes wrong:** Broker password stored per-button. User exports profile, shares it. Credentials leak.
**Why it happens:** Action settings seem like the natural place for all per-button config.
**How to avoid:** Global settings for credentials (encrypted, not exported). Action settings reference broker by ID only.
**Warning signs:** Profile export files contain broker passwords.

### Pitfall 4: Client ID Collision
**What goes wrong:** Two Stream Deck instances (two computers) share the same hardcoded MQTT client ID. Broker kicks one off, both enter reconnect loop.
**Why it happens:** Developer uses a static client ID string.
**How to avoid:** Generate `streamdeck-mqtt-${crypto.randomUUID()}` on first launch. Store in global settings for persistence.
**Warning signs:** Both clients constantly disconnect and reconnect.

### Pitfall 5: QoS 1/2 Memory Growth
**What goes wrong:** Using QoS 1 or 2 for subscriptions causes ~4KB/second memory increase due to inflight tracking (MQTT.js issue #161).
**Why it happens:** MQTT.js maintains inflight message queues for guaranteed delivery.
**How to avoid:** Default QoS to 0 for subscriptions. Only use QoS 1 for publish where delivery confirmation matters.
**Warning signs:** `process.memoryUsage().heapUsed` grows linearly over hours.

## Code Examples

### Entry Point (plugin.ts)
```typescript
// Source: Stream Deck SDK Getting Started docs
import streamDeck from "@elgato/streamdeck";
import { MqttAction } from "./actions/mqtt-action";

// Register actions BEFORE connecting
streamDeck.actions.registerAction(new MqttAction());

// Connect to Stream Deck
streamDeck.connect();
```

### Reading Global Settings
```typescript
// Source: Stream Deck SDK Settings docs
const globalSettings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
const broker = globalSettings.broker;
if (broker?.host) {
  connectionManager.getOrCreate(broker);
}
```

### Setting Button Title from MQTT Message
```typescript
// Source: Stream Deck SDK Actions docs
// Inside TopicRouter dispatch:
const action = streamDeck.actions.getActionById(contextId);
if (action) {
  await action.setTitle(payload);
  // Cache for restart recovery
  const currentSettings = await action.getSettings<MqttActionSettings>();
  await action.setSettings({ ...currentSettings, lastValue: payload });
}
```

### Rollup Config Extension for MQTT Bundling
```javascript
// Source: STACK.md research + Lambda plugin tutorial
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";

export default {
  input: "src/plugin.ts",
  output: {
    file: "io.github.meintechblog.mqtt-master.sdPlugin/bin/plugin.js",
    format: "cjs",
    sourcemap: true,
  },
  plugins: [
    typescript(),
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
  ],
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Stream Deck SDK v1 (C++/Python) | SDK v2 (Node.js/TypeScript) | 2023 | DRM requires v2. v1 deprecated. |
| `async-mqtt` wrapper | `mqtt` v5 native `connectAsync()` | 2023 (MQTT.js v5) | No wrapper needed. |
| Manual PI communication | `sdpi-components.js` web components | 2024 | Auto data-binding, design consistency. |
| `clean: false` persistent sessions | `clean: true` + explicit resubscribe | Ongoing recommendation | More reliable across MQTT.js versions. |

**Deprecated/outdated:**
- `@elgato-stream-deck/node` (Julusian): Direct USB HID access, NOT the plugin SDK
- `elgato-stream-deck` (old unscoped package): Replaced by `@elgato/streamdeck`
- `async-mqtt`: Dead wrapper, MQTT.js v5 has native async

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build + dev tooling | Yes | 22.22.0 (local) / 20 (SD runtime) | -- |
| npm | Package installation | Yes | 10.9.4 | -- |
| `@elgato/cli` | Scaffolding, linking, packing | No (not installed globally) | -- | `npm install -g @elgato/cli@latest` |
| Stream Deck app | Plugin runtime | Yes (on Mac Mini) | Assumed installed | -- |
| Mosquitto broker | MQTT testing | Yes (192.168.3.8:1883) | -- | -- |
| `mosquitto_sub`/`mosquitto_pub` | CLI testing | Unknown on Mac Mini | -- | `brew install mosquitto` for CLI tools |

**Missing dependencies with no fallback:**
- None -- all blockers can be resolved with `npm install`

**Missing dependencies with fallback:**
- `@elgato/cli` not installed globally -- install with `npm install -g @elgato/cli@latest` on Mac Mini
- `mosquitto_sub`/`mosquitto_pub` status unknown on Mac Mini -- can install via `brew install mosquitto` for CLI tools (broker itself runs on 192.168.3.8)

## Open Questions

1. **sdpi-components.js delivery mechanism**
   - What we know: The scaffolded project should include it, or it comes from the SDK
   - What's unclear: Whether `streamdeck create` bundles it automatically or if it needs manual download
   - Recommendation: Run `streamdeck create` and check if `sdpi-components.js` is in the generated `ui/` folder. If not, download from Elgato's CDN or SDK repo.

2. **Global settings PI access pattern for broker config**
   - What we know: `sdpi-components` auto-bind to action settings via `setting` attribute. Global settings need `SDPIComponents.streamDeckClient.getGlobalSettings()`.
   - What's unclear: Whether sdpi-components has built-in global settings binding or if custom JS is needed in the PI
   - Recommendation: For Phase 1 (single broker, D-07), implement minimal custom JS in the PI to read/write global settings for broker host/port. Keep it simple.

3. **Rollup output format (CJS vs ESM)**
   - What we know: SDK scaffold uses Rollup. Node.js 20 supports both CJS and ESM.
   - What's unclear: Whether Stream Deck's Node.js runtime expects CJS or ESM from the bundled plugin.js
   - Recommendation: Use `format: "cjs"` (CommonJS) as the safe default. The Lambda tutorial example uses CJS.

## Sources

### Primary (HIGH confidence)
- [Stream Deck SDK - Actions Guide](https://docs.elgato.com/streamdeck/sdk/guides/actions/) -- action decorator, SingletonAction, event handlers
- [Stream Deck SDK - Settings Guide](https://docs.elgato.com/streamdeck/sdk/guides/settings/) -- global vs action settings, security, Zod recommendation
- [Stream Deck SDK - UI Guide](https://docs.elgato.com/streamdeck/sdk/guides/ui/) -- sdpi-components, PI HTML structure
- [Stream Deck SDK - Getting Started](https://docs.elgato.com/streamdeck/sdk/introduction/getting-started/) -- `streamdeck create` scaffold
- [@elgato/streamdeck on npm](https://www.npmjs.com/package/@elgato/streamdeck) -- v2.0.4, verified 2026-03-25
- [@elgato/cli on npm](https://www.npmjs.com/package/@elgato/cli) -- v1.7.3, verified 2026-03-25
- [mqtt on npm](https://www.npmjs.com/package/mqtt) -- v5.15.1, verified 2026-03-25
- [MQTT.js GitHub](https://github.com/mqttjs/MQTT.js) -- v5 TypeScript API

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- project-specific architecture research (verified against SDK docs)
- `.planning/research/PITFALLS.md` -- project-specific pitfall research (verified against MQTT.js issues)
- `.planning/research/STACK.md` -- project-specific stack research (versions verified against npm)
- [Stream Deck Lambda Plugin Tutorial](https://mauricebrg.com/2025/06/streamdeck-lambda-trigger.html) -- real-world SDK v2 example with Rollup config

### Tertiary (LOW confidence)
- None -- all findings verified against primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified on npm, versions confirmed current
- Architecture: HIGH -- patterns from SDK docs + prior research + verified against official guides
- Pitfalls: HIGH -- documented MQTT.js GitHub issues + SDK behavior confirmed in official docs

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable ecosystem, no major changes expected)
