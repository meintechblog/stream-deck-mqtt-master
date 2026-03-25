# Feature Landscape: Stream Deck MQTT Plugin

**Domain:** Elgato Stream Deck Plugin for bidirectional MQTT control
**Researched:** 2026-03-25
**Overall confidence:** MEDIUM-HIGH

## Competitor Feature Analysis

### Existing Stream Deck MQTT Plugins

| Plugin | Publish | Subscribe | Dynamic Title | Dynamic Icon | Toggle | JSON Parse | QoS | TLS | SDK |
|--------|---------|-----------|---------------|--------------|--------|------------|-----|-----|-----|
| **pherting/streamdeck-mqtt (biOs)** | Yes | No | No | No | Planned | No | No | Yes | v1 (JS) |
| **hobbyquaker/streamdeck-plugin-mqtt** | Yes | Yes | Yes | Yes | Via MQTT | No | Unknown | Unknown | v1 (JS) |
| **iu2frl/StreamDeck.Plugins.MqttWs** | Yes | No | No | No | No | No | No | Yes | v1 (JS/WS) |
| **bretterer/StreamDeck-MQTT** | Partial | No | No | No | No | No | No | No | v1 (JS) |
| **LukasOchmann/streamdeck-mqtt** | Via MQTT | Via MQTT | Via MQTT | Via MQTT | No | No | No | No | Python/Custom |

**Key gap across ALL existing plugins:** No plugin combines bidirectional MQTT (publish + subscribe) with a polished Property Inspector UI on the current Stream Deck SDK v2. The only plugin with subscribe support (hobbyquaker) has 5 GitHub stars, no releases, and uses the legacy SDK. The most-used plugin (biOs/pherting, on Elgato Marketplace) is publish-only.

### Comparable IoT Stream Deck Plugins

| Plugin | Entity State Display | Dynamic Icons | Templates | Long Press | Multi-Page | Connection Status |
|--------|---------------------|---------------|-----------|------------|------------|-------------------|
| **streamdeck-homeassistant (cgiesche)** | Yes | Yes (on/off greyscale) | Jinja2 + Nunjucks | Yes (300ms) | No | Implicit |
| **home-assistant-streamdeck-yaml** | Yes | Yes (MDI, color, ring) | Jinja2 | Yes | Yes | Yes |
| **IoT Monitor** | Yes (API polling) | No | No | No | No | Error alerts |
| **Homey Integration** | Yes | No | No | No | No | No |

**What the HA plugins teach us:** The most successful IoT Stream Deck plugins (cgiesche with 500+ stars) succeed because they display live state AND let you act on it. Templates for display customization are expected by power users. Dynamic icon rendering (greyscale for off, color for on) is a strong differentiator.

### MQTT Dashboard Apps (Mobile, for feature parity reference)

IoT MQTT Panel (Android/iOS) sets the bar for what MQTT-savvy users expect from a control surface:
- JSON path extraction from payloads
- 250+ icons
- Button, Switch, LED Indicator, Gauge, Slider panel types
- Import/Export configuration
- Auto-reconnect
- SSL + Auth support

## Table Stakes

Features users expect from any MQTT Stream Deck plugin. Missing = plugin feels broken or incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **MQTT Publish on button press** | Core use case; every existing plugin does this | Low | Send configurable payload to configurable topic |
| **MQTT Subscribe with live title update** | THE differentiator vs existing plugins; core value proposition | Medium | Subscribe to topic, display received value as button title |
| **Broker connection config (host, port)** | Cannot function without it | Low | Property Inspector form fields |
| **Authentication (username/password)** | Most production brokers require it | Low | Optional fields in broker config |
| **TLS/SSL support** | Security-conscious users expect encrypted connections | Low | Toggle + optional CA cert path; `mqtt` npm package handles this |
| **Auto-reconnect on connection loss** | MQTT connections drop; users expect resilience | Low | `mqtt` npm package provides this out of the box |
| **QoS level selection (0, 1, 2)** | MQTT fundamental; advanced users will look for this | Low | Dropdown per action, default QoS 0 |
| **Toggle mode (two-state publish)** | Most common smart home pattern: on/off, open/close | Medium | Press toggles between two configurable payloads based on current subscribed state |
| **Connection status indicator** | Users need to know if broker is reachable | Low | Visual feedback on button (e.g., warning icon overlay on disconnect) |
| **Retain flag option** | Standard MQTT feature; needed for state topics | Low | Checkbox per publish action |
| **Multiple broker support** | Users may have multiple MQTT brokers (home, office, test) | Medium | Broker profiles with shared connection pooling |

## Differentiators

Features that set this plugin apart. Not expected, but create competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **JSON path value extraction** | MQTT payloads are often JSON; display `temperature` from `{"temperature": 22.5, "humidity": 60}` | Medium | Use JSONPath or dot-notation (e.g., `payload.temperature`) to extract display value from JSON payloads |
| **State-based icon rendering** | Button visually reflects device state (green = on, red = off, grey = unknown) | Medium | Map subscribed values to icon states: configurable value-to-color or value-to-image mapping |
| **Display value formatting template** | Show `22.5 C` instead of raw `22.5` | Low | Simple string template: `{{value}} C` or `{{value}}%` |
| **Long press action** | Different action on press vs hold (e.g., press = toggle light, hold = set brightness 100%) | Medium | SDK v2 supports `keyDown`/`keyUp` timing; publish different payload on hold (>500ms) |
| **Payload templates with variables** | Dynamic publish payloads: `{"brightness": {{value}}, "source": "streamdeck"}` | Medium | Useful for complex MQTT integrations; variable substitution from current state |
| **Multi-action button** | Single button publishes to multiple topics simultaneously | Low-Medium | Array of publish configs per button press |
| **Last Will and Testament (LWT)** | Plugin announces its presence/absence on MQTT network | Low | Standard MQTT feature; `mqtt` package supports it; useful for automation triggers |
| **SDK v2 with TypeScript** | Modern codebase, better maintainability, Elgato's current standard | N/A (architectural) | No existing MQTT plugin uses SDK v2; this alone is a marketplace differentiator |

## Anti-Features

Features that seem good but create complexity without proportional value. Deliberately NOT building these.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Full Jinja2/Nunjucks template engine** | Massive dependency, overkill for Stream Deck button labels; HA plugins need it because HA entities are complex | Simple `{{value}}` substitution with optional format string; covers 95% of use cases |
| **WebSocket MQTT transport** | Project explicitly uses native TCP via Node.js; WS adds complexity for no gain in a plugin context | TCP only via `mqtt` npm package; WS is for browser contexts |
| **Built-in icon library/editor** | Huge scope; Stream Deck already has icon management; maintaining 250+ icons is a maintenance burden | Let users set custom icons per state via Stream Deck's built-in icon picker; plugin controls which icon state is active |
| **MQTT Discovery (auto-detect devices)** | Home Assistant convention, not standard MQTT; couples to HA ecosystem; complex to implement generically | Users configure topics manually; they know their MQTT topology |
| **Dashboard/multi-page navigation** | Stream Deck already has profiles and pages built-in; reimplementing this in the plugin duplicates platform functionality | Use Stream Deck's native profile/page system |
| **MQTT v5 specific features** | MQTTv5 (shared subscriptions, user properties, etc.) adds complexity; most home brokers run v3.1.1 | Support MQTTv3.1.1 and v5 at protocol level (mqtt.js handles this), but don't build UI for v5-specific features |
| **Complex conditional logic (if/else on values)** | Turns a plugin into a programming environment; users should use Node-RED for logic | Simple value-to-state mapping (value X = state ON, value Y = state OFF); no expressions |
| **Certificate file upload via Property Inspector** | File handling in PI is complex; security implications | Text field for cert path on filesystem; advanced users can manage certs |
| **Stream Deck Mobile support** | Different SDK, different runtime, different UX paradigm | Focus on hardware Stream Deck only |
| **Dial/touchscreen (Stream Deck+) support** | Different interaction model; complicates v1 significantly | LCD key buttons only for v1; dials can be a v2 feature |

## Feature Dependencies

```
Broker Connection Config
  |
  +---> MQTT Publish on Press (requires connection)
  |       |
  |       +---> Toggle Mode (requires publish + knowledge of current state)
  |       |       |
  |       |       +---> State-based Icon Rendering (requires knowing current state)
  |       |
  |       +---> Long Press Action (requires publish infrastructure)
  |       |
  |       +---> Multi-Action Button (requires publish infrastructure)
  |       |
  |       +---> Retain Flag (per-publish option)
  |
  +---> MQTT Subscribe with Title Update (requires connection)
  |       |
  |       +---> JSON Path Extraction (requires incoming payloads)
  |       |       |
  |       |       +---> Display Value Template (requires extracted value)
  |       |
  |       +---> Toggle Mode (needs subscribe to know current state)
  |       |
  |       +---> State-based Icon Rendering (needs subscribe values)
  |
  +---> Connection Status Indicator (requires connection lifecycle events)
  |
  +---> Auto-Reconnect (requires connection)
  |
  +---> Authentication (connection-level config)
  |
  +---> TLS/SSL (connection-level config)

Multiple Broker Support
  |
  +---> Connection Pooling (share connections across buttons)
```

## MVP Recommendation

**Prioritize (Phase 1 -- Core bidirectional MQTT):**

1. Broker connection config (host, port, auth, TLS) -- foundation
2. MQTT Publish on button press -- basic functionality
3. MQTT Subscribe with live title update -- THE differentiator vs existing plugins
4. Toggle mode -- most common IoT use case
5. Connection status indicator -- essential UX feedback
6. Auto-reconnect -- table stakes for reliability
7. QoS selection -- low effort, important for correctness
8. Retain flag -- low effort, important for MQTT patterns

**Phase 2 -- Polish and power features:**

1. JSON path value extraction -- many MQTT payloads are JSON
2. State-based icon rendering -- visual feedback is huge UX win
3. Display value formatting template -- `{{value}} C` instead of `22.5`
4. Multiple broker support -- real-world need
5. Long press action -- power user feature

**Defer (Phase 3+):**

- Payload templates with variables -- nice but niche
- Multi-action button -- can workaround with Stream Deck multi-action
- LWT configuration -- advanced MQTT feature
- Dial/touchscreen support -- different SDK interaction model

## Feature Prioritization Matrix

| Feature | User Impact | Implementation Effort | Differentiation | Priority |
|---------|-------------|----------------------|-----------------|----------|
| Publish on press | HIGH | LOW | LOW (everyone has it) | P0 - Must |
| Subscribe + title update | HIGH | MEDIUM | HIGH (nobody does it well) | P0 - Must |
| Broker config UI | HIGH | LOW | LOW | P0 - Must |
| Auth (user/pass) | HIGH | LOW | LOW | P0 - Must |
| Toggle mode | HIGH | MEDIUM | MEDIUM | P0 - Must |
| Auto-reconnect | HIGH | LOW (built into mqtt.js) | LOW | P0 - Must |
| Connection status | MEDIUM | LOW | MEDIUM | P0 - Must |
| QoS selection | LOW | LOW | LOW | P0 - Must |
| Retain flag | LOW | LOW | LOW | P0 - Must |
| TLS/SSL | MEDIUM | LOW | LOW | P0 - Must |
| JSON path extraction | HIGH | MEDIUM | HIGH | P1 - Should |
| State-based icons | HIGH | MEDIUM | HIGH | P1 - Should |
| Display template | MEDIUM | LOW | MEDIUM | P1 - Should |
| Multiple brokers | MEDIUM | MEDIUM | MEDIUM | P1 - Should |
| Long press action | MEDIUM | MEDIUM | MEDIUM | P1 - Should |
| Payload templates | LOW | MEDIUM | LOW | P2 - Could |
| Multi-action button | LOW | LOW-MEDIUM | LOW | P2 - Could |
| LWT config | LOW | LOW | LOW | P2 - Could |

## Sources

### Stream Deck MQTT Plugins
- [pherting/streamdeck-mqtt (biOs)](https://github.com/pherting/streamdeck-mqtt) -- Most popular existing MQTT plugin, publish-only, legacy SDK
- [hobbyquaker/streamdeck-plugin-mqtt](https://github.com/hobbyquaker/streamdeck-plugin-mqtt) -- Only plugin with subscribe support, 5 stars, no releases, legacy SDK
- [iu2frl/StreamDeck.Plugins.MqttWs](https://github.com/iu2frl/StreamDeck.Plugins.MqttWs/) -- WebSocket-only MQTT, publish-only
- [bretterer/StreamDeck-MQTT](https://github.com/bretterer/StreamDeck-MQTT) -- WIP, minimal features
- [LukasOchmann/streamdeck-mqtt](https://github.com/LukasOchmann/streamdeck-mqtt) -- Python-based, custom approach, not an SD plugin

### Stream Deck IoT Plugins (Feature Reference)
- [cgiesche/streamdeck-homeassistant](https://github.com/cgiesche/streamdeck-homeassistant) -- Gold standard for IoT SD plugin UX: templates, dynamic icons, long press
- [basnijholt/home-assistant-streamdeck-yaml](https://github.com/basnijholt/home-assistant-streamdeck-yaml) -- Advanced rendering: MDI icons, ring indicators, multi-page
- [Home Assistant on Elgato Marketplace](https://marketplace.elgato.com/product/home-assistant-884c8c3e-8477-4ecb-99e0-f3101bbfa0aa)
- [IoT Monitor on Elgato Marketplace](https://marketplace.elgato.com/product/iot-monitor-608fd6f6-34dc-42d0-8e0f-536936f5e507)

### MQTT Dashboard Apps (Feature Parity Reference)
- [IoT MQTT Panel (Google Play)](https://play.google.com/store/apps/details?id=snr.lab.iotmqttpanel.prod&hl=en)
- [IoT MQTT Panel Guide](https://blog.snrlab.in/iot/iot-mqtt-panel-user-guide/)

### Community Discussions
- [Feature Request: Force Icon and Icon Color (HA plugin)](https://github.com/cgiesche/streamdeck-homeassistant/discussions/243)
- [Customization of HA plugin in Stream Deck](https://community.home-assistant.io/t/customization-of-home-assistant-plugin-in-stream-deck/835380)
