# Stack Research

**Domain:** Elgato Stream Deck Plugin (MQTT)
**Researched:** 2026-03-25
**Overall Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| `@elgato/streamdeck` | ^2.0.4 | Stream Deck SDK -- action definitions, event handling, settings management | Only official SDK for Node.js Stream Deck plugins. Provides TypeScript-first API with decorator-based actions (`@action`, `SingletonAction`), typed event handlers (`onKeyDown`, `onDidReceiveSettings`), global and per-action settings, and direct Property Inspector communication. Required for DRM compatibility. | HIGH |
| `mqtt` (MQTT.js) | ^5.15.0 | MQTT client for Node.js -- TCP, TLS, auto-reconnect | The standard MQTT client for Node.js. Rewritten in TypeScript since v5.0.0. Native TCP support (port 1883) without WebSocket overhead. Built-in auto-reconnect (`reconnectPeriod`), QoS 0/1/2, TLS, topic aliases, keepalive pings. 3300+ dependents on npm. No serious alternatives exist in the Node.js ecosystem. | HIGH |
| TypeScript | ~5.7 | Type safety across plugin code and MQTT integration | SDK standard. The scaffolded project includes tsconfig.json preconfigured for the plugin environment. Use whatever version `@elgato/streamdeck` ships with in its peer/dev deps -- do not force a newer version. | HIGH |
| Node.js | 20 (runtime provided by Stream Deck) | Plugin execution environment | Stream Deck app bundles Node.js 20. Specified in manifest.json `Nodejs.Version: "20"`. Do NOT install Node.js separately for the plugin runtime -- Stream Deck provides it. Node.js 24 is also supported per recent manifest docs but 20 is the safe default. | HIGH |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^3.24 | Runtime validation of settings from Property Inspector | Always. SDK docs explicitly recommend schema validation for settings because TypeScript types do not guarantee runtime values. Validate broker config (host, port, topic, QoS) before connecting. |
| `@rollup/plugin-node-resolve` | ^16.x | Resolve node_modules in Rollup bundle | Always. Required to bundle `mqtt` and its dependencies into the single output file that Stream Deck loads. |
| `@rollup/plugin-commonjs` | ^28.x | Convert CommonJS modules to ES modules for Rollup | Always. The `mqtt` package and its transitive dependencies use CommonJS internally. Without this plugin, Rollup cannot bundle them. |
| `@rollup/plugin-json` | ^6.x | Import JSON files in Rollup | If needed. Some dependencies (including mqtt internals) may import JSON files. Include preemptively to avoid build failures. |
| `@rollup/plugin-typescript` | ^12.x | Compile TypeScript in Rollup pipeline | Always. The scaffolded project uses Rollup as the bundler, and this plugin handles TS compilation within the Rollup build. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| `@elgato/cli` | ^1.7.3 (global) | Scaffold, link, pack, validate, dev-mode for plugins | Install globally: `npm install -g @elgato/cli@latest`. Key commands: `streamdeck create` (scaffold), `streamdeck link` (install locally), `streamdeck dev` (enable developer mode + remote debugger at localhost:23654), `streamdeck pack` (create .streamDeckPlugin for distribution). |
| `rollup` | ^4.x | Module bundler | SDK standard. The scaffolded project uses `rollup -c` for building. Output is a single file in `.sdPlugin/bin/`. Configured via `rollup.config.mjs`. |
| `vitest` | ^3.x | Unit testing | Not part of SDK scaffold, but recommended for testing MQTT connection logic, message parsing, and settings validation independently of Stream Deck runtime. Lightweight, TypeScript-native, fast. |

### Property Inspector (UI)

| Technology | Purpose | Notes |
|------------|---------|-------|
| HTML + sdpi-components.js | Settings UI rendered in Stream Deck sidebar | Property Inspector is a plain HTML page. Elgato provides `sdpi-components.js` (20+ web components: text fields, checkboxes, dropdowns). Communication via `SDPIComponents.streamDeckClient`. Settings flow: PI calls `setSettings()` -> plugin receives via `onDidReceiveSettings`. |
| No framework needed | Keep PI simple | Do NOT use React/Vue/Svelte for the Property Inspector. It is a small config form. Plain HTML with sdpi-components is the standard approach and avoids bundling complexity. |

## Installation

```bash
# 1. Install CLI globally (one-time)
npm install -g @elgato/cli@latest

# 2. Scaffold new plugin
streamdeck create

# 3. Add MQTT client
npm install mqtt

# 4. Add settings validation
npm install zod

# 5. Add Rollup plugins for bundling mqtt (some may already exist from scaffold)
npm install -D @rollup/plugin-node-resolve @rollup/plugin-commonjs @rollup/plugin-json

# 6. Add testing (optional but recommended)
npm install -D vitest
```

## Key Configuration Files

### manifest.json (critical fields for this project)

```json
{
  "SDKVersion": 2,
  "Nodejs": {
    "Version": "20",
    "Debug": "enabled"
  },
  "Actions": [
    {
      "UUID": "com.yourname.mqtt.toggle",
      "Name": "MQTT Toggle",
      "PropertyInspectorPath": "ui/mqtt-toggle.html",
      "States": [
        { "Image": "imgs/action-off" },
        { "Image": "imgs/action-on" }
      ]
    }
  ]
}
```

### rollup.config.mjs (extended for mqtt bundling)

```javascript
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import typescript from "@rollup/plugin-typescript";
import path from "node:path";

export default {
  input: "src/plugin.ts",
  output: {
    file: "com.yourname.mqtt.sdPlugin/bin/plugin.js",
    format: "cjs",
    sourcemap: true,
    inlineDynamicImports: true,
  },
  plugins: [
    typescript(),
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
  ],
};
```

### Settings Architecture (global vs action)

```
Global Settings (streamDeck.settings):
  - Broker connections: { host, port, tls, username, password }
  - Shared across all buttons
  - Security-sensitive (credentials) -> MUST use global settings per SDK docs

Action Settings (per-button):
  - publishTopic, publishPayload, subscribeTopic
  - QoS level, retain flag
  - Display format (what to show on button)
  - Toggle values (onValue, offValue)
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| MQTT Client | `mqtt` (MQTT.js) | `aedes` (broker), `async-mqtt` | `aedes` is a broker, not a client. `async-mqtt` is a wrapper around `mqtt` that adds Promise API -- unnecessary since mqtt v5 already has `connectAsync()`. |
| Bundler | Rollup | esbuild, webpack | Rollup is the SDK-scaffolded default. Changing bundlers adds friction and risk for no gain. The SDK team tests against Rollup output. |
| Testing | Vitest | Jest | Vitest is faster, natively supports TypeScript and ESM, and aligns with the modern JS toolchain. Jest would also work but requires more config for TypeScript. |
| PI Framework | Plain HTML + sdpi-components | React, Svelte | Massive overkill. The PI is a small config form with 5-8 fields. sdpi-components provides styled web components that match Stream Deck's design language. Adding a framework means adding a second build pipeline. |
| Settings Validation | Zod | io-ts, yup, ajv | Zod is TypeScript-first, has the best DX, smallest API surface for this use case. SDK docs explicitly mention it as recommended. |

## What NOT to Use

| Technology | Why Avoid |
|------------|-----------|
| `@elgato-stream-deck/node` (Julusian) | This is for direct USB HID communication with Stream Deck hardware. It is NOT the plugin SDK. Completely different purpose -- used for building standalone apps that control the hardware, not plugins that run inside Stream Deck. |
| `elgato-stream-deck` (old package) | Legacy/deprecated. Use `@elgato/streamdeck` (the official scoped package). |
| WebSocket MQTT (`mqtt` over `ws://`) | Unnecessary. The plugin runs in Node.js, not a browser. Native TCP (port 1883) is simpler, faster, and avoids the WebSocket overhead. Only use WebSocket if the broker does not expose a TCP port (rare). |
| `async-mqtt` | Dead wrapper. MQTT.js v5 has native `connectAsync()`. |
| Stream Deck SDK v1 (C++/Python) | Deprecated. v2 with Node.js is the current standard. DRM requires v2. |
| React/Vue/Svelte for Property Inspector | Over-engineered. Adds build complexity for a simple config form. |
| `node-mqtt-client` or other MQTT alternatives | Tiny, unmaintained packages. MQTT.js is the ecosystem standard with 5M+ weekly downloads. |

## Version Compatibility Matrix

| Component | Minimum Version | Recommended | Notes |
|-----------|----------------|-------------|-------|
| Stream Deck App | 6.9 | Latest (7.2+) | Required for SDK v2 support |
| Node.js (in manifest) | 20 | 20 | Bundled by Stream Deck. 24 also supported but 20 is stable default. |
| Node.js (dev machine) | 20 | 20+ | For building, testing, running CLI |
| `@elgato/streamdeck` | 2.0.0 | ^2.0.4 | DRM requires v2+. 2.0.4 is latest as of 2026-03-25. |
| `@elgato/cli` | 1.0.0 | ^1.7.3 | Latest as of 2026-03-25. |
| `mqtt` | 5.0.0 | ^5.15.0 | v5 = TypeScript rewrite, Node 18+/20+ |
| macOS | 10.15+ | Current | Primary dev platform per project context |
| Windows | 10+ | Current | Secondary target for cross-platform |

## Architecture Notes for Stack

The plugin runs as a **single persistent Node.js process** managed by the Stream Deck app. This process:

1. Maintains one or more MQTT connections (long-lived, auto-reconnecting)
2. Receives button press events from Stream Deck via the SDK
3. Publishes MQTT messages on button press
4. Subscribes to MQTT topics and updates button state/title on incoming messages
5. Manages settings via global (broker config) and per-action (topic/payload config) storage

The MQTT client runs in the same process -- no need for a separate service, IPC, or worker threads. The `mqtt` package handles reconnection internally.

## Sources

- [Elgato Stream Deck SDK -- Getting Started](https://docs.elgato.com/streamdeck/sdk/introduction/getting-started/) -- official scaffold docs
- [Elgato Stream Deck SDK -- Manifest Reference](https://docs.elgato.com/streamdeck/sdk/references/manifest/) -- manifest.json structure
- [Elgato Stream Deck SDK -- Settings Guide](https://docs.elgato.com/streamdeck/sdk/guides/settings/) -- global vs action settings, Zod recommendation
- [Elgato Stream Deck SDK -- Property Inspectors (UI)](https://docs.elgato.com/streamdeck/sdk/guides/ui/) -- sdpi-components, PI communication
- [Elgato Stream Deck CLI -- Introduction](https://docs.elgato.com/streamdeck/cli/intro/) -- CLI commands and workflow
- [@elgato/streamdeck on npm](https://www.npmjs.com/package/@elgato/streamdeck) -- v2.0.4, published 2026-03-19
- [@elgato/cli on npm](https://www.npmjs.com/package/@elgato/cli) -- v1.7.3, published 2026-03-17
- [MQTT.js on GitHub](https://github.com/mqttjs/MQTT.js) -- v5.x TypeScript rewrite, API reference
- [mqtt on npm](https://www.npmjs.com/package/mqtt) -- v5.15.0, published 2026-02
- [elgatosf/streamdeck on GitHub](https://github.com/elgatosf/streamdeck) -- SDK source, monorepo structure
- [Stream Deck Lambda Plugin Tutorial (2025)](https://mauricebrg.com/2025/06/streamdeck-lambda-trigger.html) -- real-world example with Node.js 24, Rollup config
