# Phase 2: Toggle + Settings UI - Research

**Researched:** 2026-03-25
**Domain:** Stream Deck Property Inspector (sdpi-components), MQTT toggle state management, JSON path extraction
**Confidence:** HIGH

## Summary

Phase 2 extends the working Phase 1 plugin with three capabilities: (1) a full Property Inspector UI using sdpi-components for all configuration, (2) toggle mode that publishes alternating payloads based on subscribed MQTT state, and (3) JSON path extraction for complex payloads with display templates. The existing codebase (MqttAction, ConnectionManager, TopicRouter) is well-structured and needs extension, not refactoring.

The PI uses Elgato's `sdpi-components` v3 web component library with `setting="fieldName"` auto-binding -- no JavaScript needed for settings persistence. Toggle logic reads current state from the subscribed topic (never local), determines which payload to publish, and calls `setState(0/1)` for visual feedback. JSON path extraction is a simple dot-notation helper (no external dependency needed).

**Primary recommendation:** Extend MqttActionSettings with toggle/JSON fields, expand the PI HTML with four sections (Broker, Subscribe, Publish, Toggle), add a `resolveJsonPath()` utility and toggle logic to `onKeyDown`, and wire `setState()` into the subscription callback.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-10: Separate Topics for command and status -- Publish-Topic for commands (e.g. `cmnd/light/POWER`), Subscribe-Topic for state feedback (e.g. `stat/light/POWER`). Matches Tasmota/Shelly IoT patterns.
- D-11: Freely configurable on/off values -- User enters On-Payload, Off-Payload, On-Value (match string from subscribe), Off-Value. Supports any pattern: ON/OFF, 1/0, true/false, custom strings.
- D-12: Toggle state derived from subscribed topic (TOGL-02) -- never tracked locally. Current MQTT value determines button state.
- D-13: Broker config stays in Action Settings (same as Phase 1). No migration to Global Settings -- simplicity over CONN-06 security for this use case (user's broker has no auth).
- D-14: sdpi-components standard styling -- uses Elgato's web components library for native Stream Deck look and feel. No custom CSS.
- D-15: PI sections: Broker (host, port, user, pass, TLS toggle), Subscribe (topic, JSON path, display template), Publish (topic, payload, QoS, retain), Toggle (on-payload, off-payload, on-value, off-value).
- D-17: Display value formatting via simple template -- textfield with `{{value}}` placeholder (e.g. `{{value}} °C` -> `22.5 °C`). No full template engine.
- D-18: Use SDK `setState(0/1)` for toggle state display -- leverages manifest.json's 2-state icon system. State 0 = off (default), State 1 = on (active).

### Claude's Discretion
- D-16: JSON path implementation approach (dot-notation vs jsonpath-plus)
- D-19: Default icon design (MQTT logo variants vs generic toggle indicators)
- PI field grouping and section ordering within sdpi-components
- Toggle logic implementation (how onKeyDown decides which payload to send)
- Error states in PI (invalid JSON path, connection failed indicators)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TOGL-01 | Toggle mode switches between two configurable payloads based on current MQTT state | Toggle logic in onKeyDown: compare lastValue against onValue/offValue, publish opposite payload. Settings schema with onPayload/offPayload/onValue/offValue fields. |
| TOGL-02 | Toggle state derived from subscribed topic, never tracked locally | Callback from topicRouter stores raw payload in lastValue. State determination always reads lastValue, never a local boolean. |
| TOGL-03 | Button state (icon) changes visually based on received MQTT value | `setState(0)` for off (matches offValue), `setState(1)` for on (matches onValue). Wired into subscription callback alongside setTitle. |
| SUB-03 | User can specify JSON path to extract value from JSON payload | `resolveJsonPath()` utility with dot-notation access (e.g. `temperature` from `{"temperature": 22.5}`). Applied in subscription callback before setTitle/setState. |
| UI-01 | Property Inspector: Broker connection config (Host, Port, Auth, TLS) | sdpi-textfield for host/port, sdpi-textfield for username, sdpi-password for password, sdpi-checkbox for TLS. All with `setting="fieldName"` auto-binding. |
| UI-02 | Property Inspector: Publish settings (Topic, Payload, QoS, Retain) | sdpi-textfield for topic/payload, sdpi-select for QoS, sdpi-checkbox for retain. Already partially exists in current PI. |
| UI-03 | Property Inspector: Subscribe settings (Topic, JSON Path) | sdpi-textfield for subscribeTopic, sdpi-textfield for jsonPath, sdpi-textfield for displayTemplate. |
| UI-04 | Property Inspector: Toggle config (On-Payload, Off-Payload, On-Value, Off-Value) | Four sdpi-textfield fields with descriptive placeholders. Section appears after Publish section. |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@elgato/streamdeck` | ^2.0.4 | SDK -- `setState()`, `setTitle()`, action events | Only official SDK. setState(0/1) drives toggle visuals. |
| `mqtt` | ^5.15.0 | MQTT client for publish/subscribe | Already in use from Phase 1. |
| `zod` | ^3.24 | Settings schema validation | Already in use. Extend schema with toggle fields. |
| sdpi-components.js | v3 (CDN) | Property Inspector web components | Loaded via `<script src="https://sdpi-components.dev/releases/v3/sdpi-components.js">`. Already in PI HTML. |

### No New Dependencies Required

JSON path extraction does NOT need a library. A 5-line dot-notation resolver covers the use cases (see Code Examples below). Display template is a simple `string.replace("{{value}}", extractedValue)`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled dot-notation | `jsonpath-plus` npm | Adds ~50KB bundled dependency for a feature that needs only `obj.foo.bar` access. Overkill per D-16 simplicity priority. |
| Hand-rolled dot-notation | `lodash.get` | Adds dependency. The 5-line implementation covers all realistic MQTT JSON payloads. |
| sdpi-components v3 | v4 (mentioned in some docs) | v3 is already working in the project. No reason to upgrade mid-phase. |

## Architecture Patterns

### Settings Schema Extension

The `MqttActionSettings` interface needs these new fields:

```typescript
// New fields for Phase 2 (extend existing schema)
{
  // Broker auth (D-13: stays in action settings)
  brokerUsername: string;      // optional
  brokerPassword: string;      // optional
  brokerTls: boolean;          // default false

  // Subscribe enhancements (SUB-03, D-17)
  jsonPath: string;            // optional, dot-notation e.g. "temperature" or "data.value"
  displayTemplate: string;     // optional, e.g. "{{value}} °C"

  // Toggle fields (TOGL-01, D-11)
  onPayload: string;           // what to publish for "turn on" (e.g. "ON")
  offPayload: string;          // what to publish for "turn off" (e.g. "OFF")
  onValue: string;             // subscribe value that means "on" (e.g. "ON")
  offValue: string;            // subscribe value that means "off" (e.g. "OFF")
}
```

### Pattern 1: Toggle State from MQTT (D-12)

**What:** Never store a local `isOn` boolean. Always derive toggle state from the last received MQTT value.

**When to use:** Every toggle interaction.

**How it works:**
1. Subscription callback receives payload
2. Apply JSON path extraction if configured
3. Compare extracted value against `onValue` / `offValue`
4. Call `setState(1)` if matches onValue, `setState(0)` if matches offValue
5. Store raw extracted value in `lastValue` (for restart recovery)
6. On `onKeyDown`: read `lastValue`, determine current state, publish opposite payload

```typescript
// In subscription callback
const extracted = settings.jsonPath
  ? resolveJsonPath(rawPayload, settings.jsonPath)
  : rawPayload;

const displayValue = settings.displayTemplate
  ? settings.displayTemplate.replace("{{value}}", extracted)
  : extracted;

actionRef.setTitle(displayValue);

// Toggle state visual (TOGL-03)
if (settings.onValue && extracted === settings.onValue) {
  actionRef.setState(1);
} else if (settings.offValue && extracted === settings.offValue) {
  actionRef.setState(0);
}

// Cache for restart recovery
actionRef.setSettings({ ...settings, lastValue: extracted });
```

### Pattern 2: Toggle Publish Logic (TOGL-01)

**What:** `onKeyDown` determines which payload to send based on current MQTT state.

```typescript
// In onKeyDown
const currentValue = settings.lastValue;
let payload: string;

if (settings.onPayload && settings.offPayload) {
  // Toggle mode: send opposite of current state
  payload = (currentValue === settings.onValue)
    ? settings.offPayload   // currently on -> send off command
    : settings.onPayload;   // currently off (or unknown) -> send on command
} else {
  // Non-toggle mode: send fixed payload (Phase 1 behavior)
  payload = settings.publishPayload ?? "";
}
```

**Key insight:** When toggle fields (onPayload, offPayload, onValue, offValue) are all populated, the button operates in toggle mode. When they are empty, it falls back to Phase 1's simple publish behavior. No separate "mode" setting needed -- the presence of toggle fields IS the mode.

### Pattern 3: JSON Path Extraction (SUB-03)

**What:** Simple dot-notation property access on parsed JSON payloads.

```typescript
function resolveJsonPath(payload: string, path: string): string {
  try {
    let obj = JSON.parse(payload);
    for (const key of path.split(".")) {
      if (obj == null) return payload; // fallback to raw
      obj = obj[key];
    }
    return obj != null ? String(obj) : payload;
  } catch {
    return payload; // not JSON or invalid path -> show raw
  }
}
```

**Handles:** `"temperature"` on `{"temperature": 22.5}` -> `"22.5"`. `"data.value"` on `{"data": {"value": 42}}` -> `"42"`. Graceful fallback to raw payload on parse error or missing path.

**Does NOT handle:** Array indexing (`data[0].value`), wildcards, or recursive descent. These are out of scope per D-16 simplicity priority.

### Pattern 4: Display Template (D-17)

**What:** Simple `{{value}}` substitution, nothing more.

```typescript
function applyDisplayTemplate(template: string, value: string): string {
  return template.replace("{{value}}", value);
}
```

### Pattern 5: PI Section Layout (D-15)

```html
<h2>Broker</h2>
  Host, Port, Username, Password, TLS toggle

<h2>Subscribe</h2>
  Topic, JSON Path, Display Template

<h2>Publish</h2>
  Topic, Payload, QoS, Retain

<h2>Toggle</h2>
  On-Payload, Off-Payload, On-Value, Off-Value
```

### Anti-Patterns to Avoid
- **Local toggle state tracking:** Never use a boolean `isOn` in the action class. Always read from `lastValue` which came from MQTT (D-12).
- **Separate "toggle mode" dropdown:** The presence of toggle fields (onPayload + offPayload) implicitly enables toggle mode. No extra UI toggle needed.
- **Custom CSS in PI:** D-14 says sdpi-components only. No custom stylesheets.
- **Calling setSettings on every MQTT message:** Only call `setSettings` when `lastValue` actually changes. Otherwise the PI flickers and settings writes flood the SDK.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PI styling | Custom CSS / HTML form elements | sdpi-components web components | Native Stream Deck look, auto-binding, zero JS needed (D-14) |
| Settings persistence | Manual WebSocket messages | `setting="fieldName"` attribute on sdpi-components | Auto-syncs PI fields to action settings without code |
| Button state visuals | Canvas rendering / SVG generation | `setState(0/1)` with manifest States array | SDK handles icon switching. Users can replace icons in SD UI (D-18) |
| JSON parsing library | jsonpath-plus or lodash.get | 5-line dot-notation resolver | Zero dependencies, covers MQTT JSON payloads (D-16) |
| Template engine | Nunjucks/Handlebars | `string.replace("{{value}}", val)` | One placeholder is all that's needed (D-17) |

**Key insight:** Phase 2 needs ZERO new npm dependencies. Everything is achieved by extending existing code and using built-in sdpi-components features.

## Common Pitfalls

### Pitfall 1: sdpi-components setting names must match TypeScript schema exactly
**What goes wrong:** PI uses `setting="broker_host"` but TypeScript schema has `brokerHost`. Settings silently fail to persist or load.
**Why it happens:** sdpi-components auto-binding maps the `setting` attribute value directly to a property name in the settings object.
**How to avoid:** Use identical camelCase names in both PI HTML and the Zod schema. Test each field individually.
**Warning signs:** Fields appear empty when reopening the PI.

### Pitfall 2: setState() only works with multi-state actions
**What goes wrong:** `setState(1)` throws or silently fails if the manifest only defines one state.
**Why it happens:** The current manifest already has 2 states defined, so this is pre-solved. But if someone removes a state, toggle breaks.
**How to avoid:** Verify manifest has exactly 2 States entries for the MQTT action. The current manifest already does this correctly.
**Warning signs:** Button icon never changes on toggle.

### Pitfall 3: setSettings in subscription callback creates feedback loop
**What goes wrong:** Calling `ev.action.setSettings()` in the subscription callback triggers `onDidReceiveSettings`, which re-registers the subscription, which triggers the callback again.
**Why it happens:** The SDK fires `onDidReceiveSettings` whenever settings change, including programmatic changes via `setSettings()`.
**How to avoid:** In `onDidReceiveSettings`, only re-register subscriptions when the `subscribeTopic` actually changed (already implemented in Phase 1 via `previousTopics` map). For `lastValue` changes, skip re-registration.
**Warning signs:** CPU spikes, rapid log entries, button title flickering.

### Pitfall 4: Password field in action settings is visible in profile exports
**What goes wrong:** Per D-13, broker config stays in action settings. If user enters a password, it exports with the profile.
**Why it happens:** Action settings are plain-text and profile-exported by design.
**How to avoid:** This is a known tradeoff accepted in D-13 (user's broker has no auth). Document it as a limitation. The `sdpi-password` component masks input visually but does NOT encrypt storage.
**Warning signs:** N/A -- accepted risk per user decision.

### Pitfall 5: Toggle on unknown state defaults to "turn on"
**What goes wrong:** Button has no `lastValue` yet (first appearance, no retained message). User presses it. What payload should be sent?
**Why it happens:** Before the first MQTT message arrives, state is unknown.
**How to avoid:** Default to sending `onPayload` when state is unknown. This matches user expectation: "I pressed the button to turn something on." Log a warning that state was unknown.
**Warning signs:** First press after adding a button does nothing visible (if device was already on and receives duplicate "on" command).

## Code Examples

### Complete PI HTML Structure (D-15)

```html
<!doctype html>
<html>
<head lang="en">
  <meta charset="utf-8" />
  <script src="https://sdpi-components.dev/releases/v3/sdpi-components.js"></script>
</head>
<body>
  <h2>Broker</h2>
  <sdpi-item label="Host">
    <sdpi-textfield setting="brokerHost" placeholder="192.168.3.8"></sdpi-textfield>
  </sdpi-item>
  <sdpi-item label="Port">
    <sdpi-textfield setting="brokerPort" placeholder="1883"></sdpi-textfield>
  </sdpi-item>
  <sdpi-item label="Username">
    <sdpi-textfield setting="brokerUsername" placeholder="optional"></sdpi-textfield>
  </sdpi-item>
  <sdpi-item label="Password">
    <sdpi-password setting="brokerPassword" placeholder="optional"></sdpi-password>
  </sdpi-item>
  <sdpi-item label="TLS">
    <sdpi-checkbox setting="brokerTls"></sdpi-checkbox>
  </sdpi-item>

  <hr />
  <h2>Subscribe</h2>
  <sdpi-item label="Topic">
    <sdpi-textfield setting="subscribeTopic" placeholder="stat/light/POWER"></sdpi-textfield>
  </sdpi-item>
  <sdpi-item label="JSON Path">
    <sdpi-textfield setting="jsonPath" placeholder="temperature"></sdpi-textfield>
  </sdpi-item>
  <sdpi-item label="Display">
    <sdpi-textfield setting="displayTemplate" placeholder="{{value}} °C"></sdpi-textfield>
  </sdpi-item>

  <hr />
  <h2>Publish</h2>
  <sdpi-item label="Topic">
    <sdpi-textfield setting="publishTopic" placeholder="cmnd/light/POWER"></sdpi-textfield>
  </sdpi-item>
  <sdpi-item label="Payload">
    <sdpi-textfield setting="publishPayload" placeholder="TOGGLE"></sdpi-textfield>
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

  <hr />
  <h2>Toggle</h2>
  <sdpi-item label="On-Payload">
    <sdpi-textfield setting="onPayload" placeholder="ON"></sdpi-textfield>
  </sdpi-item>
  <sdpi-item label="Off-Payload">
    <sdpi-textfield setting="offPayload" placeholder="OFF"></sdpi-textfield>
  </sdpi-item>
  <sdpi-item label="On-Value">
    <sdpi-textfield setting="onValue" placeholder="ON"></sdpi-textfield>
  </sdpi-item>
  <sdpi-item label="Off-Value">
    <sdpi-textfield setting="offValue" placeholder="OFF"></sdpi-textfield>
  </sdpi-item>
</body>
</html>
```

### Extended Zod Settings Schema

```typescript
export const MqttActionSettingsSchema = z.object({
  // Broker (D-13: action settings)
  brokerHost: z.string().optional(),
  brokerPort: z.string().optional(),
  brokerUsername: z.string().optional(),
  brokerPassword: z.string().optional(),
  brokerTls: z.boolean().default(false),

  // Subscribe
  subscribeTopic: z.string().optional(),
  jsonPath: z.string().optional(),          // SUB-03
  displayTemplate: z.string().optional(),   // D-17

  // Publish
  publishTopic: z.string().optional(),
  publishPayload: z.string().optional(),
  qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0),
  retain: z.boolean().default(false),

  // Toggle (TOGL-01, D-11)
  onPayload: z.string().optional(),
  offPayload: z.string().optional(),
  onValue: z.string().optional(),
  offValue: z.string().optional(),

  // Runtime cache
  lastValue: z.string().optional(),
});
```

### resolveJsonPath Utility

```typescript
/**
 * Extract a value from a JSON payload using dot-notation path.
 * Returns raw payload on parse error or missing path (graceful fallback).
 */
export function resolveJsonPath(payload: string, path: string): string {
  try {
    let obj: unknown = JSON.parse(payload);
    for (const key of path.split(".")) {
      if (obj == null || typeof obj !== "object") return payload;
      obj = (obj as Record<string, unknown>)[key];
    }
    return obj != null ? String(obj) : payload;
  } catch {
    return payload;
  }
}
```

### Toggle-Aware onKeyDown

```typescript
override async onKeyDown(ev: KeyDownEvent<MqttActionSettings>): Promise<void> {
  const settings = ev.payload.settings;
  const config = this.getBrokerConfigFromSettings(settings);
  if (!config) return;

  const isToggleMode = settings.onPayload && settings.offPayload
    && settings.onValue && settings.offValue;

  let payload: string | undefined;
  let topic: string | undefined;

  if (isToggleMode) {
    // Toggle mode: publish opposite of current state
    const currentValue = settings.lastValue;
    payload = (currentValue === settings.onValue)
      ? settings.offPayload
      : settings.onPayload; // unknown state defaults to "turn on"
    topic = settings.publishTopic;
  } else {
    // Simple publish mode (Phase 1 behavior)
    payload = settings.publishPayload;
    topic = settings.publishTopic;
  }

  if (topic && payload) {
    const client = connectionManager.getOrCreate(config);
    client.publish(topic, payload, {
      qos: settings.qos ?? 0,
      retain: settings.retain ?? false,
    });
  }
}
```

### Toggle-Aware Subscription Callback

```typescript
const callback = (rawPayload: string) => {
  // 1. JSON path extraction (SUB-03)
  const extracted = settings.jsonPath
    ? resolveJsonPath(rawPayload, settings.jsonPath)
    : rawPayload;

  // 2. Display template (D-17)
  const displayValue = settings.displayTemplate
    ? settings.displayTemplate.replace("{{value}}", extracted)
    : extracted;

  // 3. Update title
  actionRef.setTitle(displayValue);

  // 4. Toggle state visual (TOGL-03, D-18)
  if (settings.onValue && extracted === settings.onValue) {
    actionRef.setState(1);
  } else if (settings.offValue && extracted === settings.offValue) {
    actionRef.setState(0);
  }

  // 5. Cache for restart recovery (only if changed)
  if (extracted !== settings.lastValue) {
    actionRef.setSettings({ ...settings, lastValue: extracted });
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual PI JS with `window.connectElgatoStreamDeckSocket` | sdpi-components with `setting` auto-binding | 2023 (SDK v2) | Zero JS needed for settings persistence |
| Custom icon rendering per state | `setState(0/1)` with manifest States array | SDK v2 | Declarative, users can customize icons in SD UI |
| Per-button MQTT connections | ConnectionManager singleton (Phase 1) | Already implemented | No change needed for Phase 2 |

## Open Questions

1. **Default state icons**
   - What we know: Manifest already has `state-off.png` and `state-on.png` defined. Files exist in imgs/
   - What's unclear: Whether current icons are visually distinctive enough for toggle UX
   - Recommendation: Use existing icons for Phase 2. Improving icons is a polish task, not a blocker. Users can replace them in Stream Deck UI.

2. **BrokerConfig needs auth fields passed through**
   - What we know: `getBrokerConfigFromSettings()` currently only reads host/port, not username/password/tls
   - What's unclear: N/A -- this is a known gap
   - Recommendation: Extend `getBrokerConfigFromSettings()` to read brokerUsername, brokerPassword, brokerTls from settings. BrokerConfig interface already has these fields.

3. **setSettings feedback loop risk**
   - What we know: Phase 1 already handles topic change detection via `previousTopics` map
   - What's unclear: Whether caching `lastValue` via `setSettings` creates excessive `onDidReceiveSettings` calls
   - Recommendation: Add an early return in `onDidReceiveSettings` when only `lastValue` changed (no topic change). Compare relevant fields, not the entire settings object.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies identified). Phase 2 is purely code/config changes extending existing infrastructure. No new tools, services, or runtimes needed.

## Sources

### Primary (HIGH confidence)
- [sdpi-components documentation](https://sdpi-components.dev/docs/components) -- component catalog, setting attribute behavior
- [sdpi-components textfield](https://sdpi-components.dev/docs/components/textfield) -- setting, global, placeholder attributes
- [sdpi-components password](https://sdpi-components.dev/docs/components/password) -- password field with setting/global attributes
- [sdpi-components checkbox](https://sdpi-components.dev/docs/components/checkbox) -- boolean auto-binding with default attribute
- [Stream Deck SDK Keys Guide](https://docs.elgato.com/streamdeck/sdk/guides/keys) -- setState(0/1) documentation
- Existing codebase: `src/actions/mqtt-action.ts`, `src/types/settings.ts`, `src/services/connection-manager.ts`, `src/services/topic-router.ts`

### Secondary (MEDIUM confidence)
- `.planning/research/ARCHITECTURE.md` -- PI lifecycle, settings flow patterns
- `.planning/research/PITFALLS.md` -- setTitle throttling, settings feedback loops
- `.planning/research/FEATURES.md` -- competitor analysis, toggle patterns

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, extending existing code
- Architecture: HIGH -- patterns directly from existing codebase + SDK docs
- Pitfalls: HIGH -- documented in prior research + verified against current code

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable domain, no fast-moving dependencies)
