# Phase 5: PI Redesign - Research

**Researched:** 2026-03-26
**Domain:** Property Inspector CSS/HTML styling, sdpi-components theming, HTML accordion patterns
**Confidence:** HIGH

## Summary

The Property Inspector redesign is a pure CSS/HTML task with no functional changes. The current PI uses sdpi-components v3 which already ships with a dark theme (`--window-bg-color: #2d2d2d`), but the default font color (`--font-color: #969696`) is the primary readability problem -- medium gray on dark gray provides insufficient contrast. The fix is straightforward: override CSS custom properties to boost text contrast to white (#ffffff) and add blue accents (#0078D7).

The accordion pattern uses native `<details>`/`<summary>` HTML elements, which are fully supported in the Stream Deck's embedded Chromium browser. No JavaScript is needed. The "Advanced" toggle per section can reuse the same `<details>/<summary>` pattern nested inside each section, or use a simple CSS class toggle with a minimal inline script.

**Primary recommendation:** Override sdpi-components CSS custom properties at the `:root` level in a custom CSS file, wrap existing sections in `<details>`/`<summary>` elements, and add nested advanced-field wrappers.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-32:** Stream Deck native dark theme -- dark gray (#2D2D2D) background, white text, blue accents (#0078D7)
- **D-33:** Custom CSS file linked from PI HTML. Override sdpi-components defaults where needed
- **D-34:** Collapsible accordion sections -- 5 sections (Broker, Subscribe, Publish, Toggle, Long Press) expandable/collapsible
- **D-35:** Broker section open by default. All others collapsed on load
- **D-36:** Section headers styled as clickable bars with expand/collapse indicator
- **D-37:** Pure CSS/HTML accordion (no framework). Use `<details>`/`<summary>` or checkbox hack
- **D-38:** Advanced toggle per section -- less-used fields hidden behind "Show Advanced" link
- **D-39:** Advanced fields per section: Broker (Username, Password, TLS), Subscribe (JSON Path, Display Template), Publish (QoS, Retain), Toggle (all visible), Long Press (all visible)
- **D-01:** Unified Action (carried forward)
- **D-14:** sdpi-components web components still used for form fields
- **D-30:** Long Press section exists (from Phase 4)

### Claude's Discretion
- Exact CSS values (font sizes, padding, border-radius, transitions)
- Accordion animation approach (CSS transition vs instant toggle)
- Advanced toggle visual design (link, small button, or icon)
- Section header icon choices
- Whether to use `<details>/<summary>` or CSS checkbox hack for accordion

### Deferred Ideas (OUT OF SCOPE)
- None
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PI-01 | PI hat lesbaren, hellen Text auf dunklem Hintergrund (passend zum Stream Deck Dark Theme) | Override `--font-color` from #969696 to #ffffff, override `--input-font-color` to #ffffff. All sdpi-components inherit these CSS custom properties. |
| PI-02 | Sections sind visuell klar getrennt (Broker, Publish, Subscribe, Toggle, Long Press) | Wrap each section in `<details>`/`<summary>` with styled headers. Remove `<hr>` separators. |
| PI-03 | PI nutzt Custom CSS ueber sdpi-components hinaus fuer modernes Erscheinungsbild | Create `mqtt-action.css` with custom properties overrides, accordion styling, advanced toggle, and section header bar styles. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sdpi-components | v3 (CDN) | Form field web components | Already in use, provides setting= auto-binding, must keep |
| HTML `<details>`/`<summary>` | Native | Accordion sections | Zero dependencies, native browser support, semantic HTML, no JS needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None | -- | -- | No additional dependencies needed for this phase |

No `npm install` needed. This phase is purely HTML + CSS changes to the PI file.

## Architecture Patterns

### Recommended File Structure
```
io.github.meintechblog.mqtt-master.sdPlugin/
  ui/
    mqtt-action.html     # Restructured with <details>/<summary> sections
    mqtt-action.css      # NEW: Custom theme overrides and accordion styling
```

### Pattern 1: CSS Custom Property Override
**What:** Override sdpi-components defaults at `:root` level
**When to use:** Always -- this is the primary mechanism for theming sdpi-components

**sdpi-components v3 default CSS custom properties (extracted from source):**
```css
/* sdpi-components defaults (DO NOT MODIFY -- these are in the library) */
--window-bg-color: #2d2d2d;     /* Already matches D-32 */
--font-color: #969696;           /* THE PROBLEM -- too low contrast */
--input-bg-color: #3d3d3d;      /* Fine */
--input-font-color: #d8d8d8;    /* Slightly too dim */
--font-size: 9pt;
--input-height: 30px;
--spacer: 4px;
--font-family: "Segoe UI", Arial, Roboto, Helvetica, sans-serif;
```

**Override in mqtt-action.css:**
```css
:root {
  --font-color: #ffffff;
  --input-font-color: #ffffff;
  --input-bg-color: #3d3d3d;
  --window-bg-color: #2d2d2d;
}
```

### Pattern 2: Native HTML Accordion with `<details>`/`<summary>`
**What:** Each section wrapped in `<details>` with a styled `<summary>` header
**When to use:** For all 5 sections (Broker, Subscribe, Publish, Toggle, Long Press)

```html
<details open>
  <summary>Broker</summary>
  <div class="section-content">
    <sdpi-item label="Host">
      <sdpi-textfield setting="brokerHost" placeholder="192.168.3.8"></sdpi-textfield>
    </sdpi-item>
    <!-- ... basic fields ... -->
    <details class="advanced">
      <summary class="advanced-toggle">Show Advanced</summary>
      <div class="advanced-content">
        <!-- Username, Password, TLS -->
      </div>
    </details>
  </div>
</details>

<details>
  <summary>Subscribe</summary>
  <!-- ... collapsed by default ... -->
</details>
```

Key points:
- `open` attribute on Broker section only (D-35)
- Nested `<details>` for advanced fields within sections that need it
- No `name` attribute needed (sections should be independently expandable, not exclusive)

### Pattern 3: Section Header Styling
**What:** Style `<summary>` elements as clickable bars with indicators
**When to use:** All section headers

```css
details > summary {
  background: #383838;
  color: #ffffff;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-weight: 600;
  font-size: 11pt;
  list-style: none;         /* Remove default marker */
  display: flex;
  align-items: center;
  gap: 8px;
  user-select: none;
}

/* Remove webkit marker (Safari/older Chromium) */
details > summary::-webkit-details-marker {
  display: none;
}

/* Expand/collapse indicator via ::before pseudo-element */
details > summary::before {
  content: "\25B6";  /* Right-pointing triangle */
  font-size: 8px;
  transition: transform 0.2s ease;
}

details[open] > summary::before {
  transform: rotate(90deg);  /* Points down when open */
}
```

### Pattern 4: Advanced Toggle (Nested)
**What:** Smaller, subtler toggle for advanced fields within a section
**When to use:** Broker, Subscribe, Publish sections (D-39)

```css
details.advanced > summary.advanced-toggle {
  background: transparent;
  color: #0078D7;
  font-size: 8pt;
  font-weight: normal;
  padding: 4px 0;
  border: none;
}

details.advanced > summary.advanced-toggle::before {
  content: "+";
  font-size: 10px;
  margin-right: 4px;
}

details.advanced[open] > summary.advanced-toggle::before {
  content: "\2212";  /* minus sign */
}
```

### Anti-Patterns to Avoid
- **CSS checkbox hack for accordion:** More complex, less semantic, harder to maintain than `<details>`/`<summary>`. No advantage here.
- **JavaScript accordion:** Unnecessary complexity when native HTML elements work perfectly.
- **Overriding sdpi-components shadow DOM internals:** The web components expose CSS custom properties specifically for theming. Do not try to pierce shadow DOM with `::part()` or deep selectors.
- **Removing or replacing sdpi-components:** They handle the settings auto-binding. Replacing them would break the PI-to-plugin communication.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accordion behavior | Custom JS toggle | `<details>`/`<summary>` | Native, accessible, zero JS, keyboard support built-in |
| Form field components | Custom inputs | sdpi-components | Auto-bind to Stream Deck settings, match SDK expectations |
| Dark theme from scratch | Full CSS reset | Override CSS custom properties | sdpi-components already has a dark base; only contrast needs fixing |

## Common Pitfalls

### Pitfall 1: CSS Custom Properties Not Cascading into Shadow DOM
**What goes wrong:** Setting `--font-color` on `body` does not affect text inside sdpi-components if they don't inherit the property.
**Why it happens:** Web components with Shadow DOM can isolate styles. sdpi-components v3 is designed to inherit CSS custom properties, but the inheritance chain matters.
**How to avoid:** Set overrides on `:root` (highest specificity for inheritance). If a specific component does not pick up the override, target the component tag directly: `sdpi-textfield { --font-color: #ffffff; }`.
**Warning signs:** Some fields still show gray text after adding the CSS file.

### Pitfall 2: CSS File Load Order
**What goes wrong:** Custom CSS loads after sdpi-components script but component styles are already applied.
**Why it happens:** sdpi-components injects styles when the script loads. If custom CSS is in `<head>` before the script, it may be overridden.
**How to avoid:** Place the CSS `<link>` AFTER the sdpi-components `<script>` tag in `<head>`, or use `:root` with sufficient specificity. CSS custom properties on `:root` will be picked up regardless of order since they cascade.
**Warning signs:** Styles flicker or don't apply on first load.

### Pitfall 3: `<summary>` Default Marker Inconsistency
**What goes wrong:** The default disclosure triangle renders differently across browsers/platforms.
**Why it happens:** Safari uses `::-webkit-details-marker`, Chrome/Firefox use `::marker` or `list-style`.
**How to avoid:** Hide both: `summary { list-style: none; }` AND `summary::-webkit-details-marker { display: none; }`. Then add custom indicator via `::before` pseudo-element.
**Warning signs:** Double arrows or unexpected markers on macOS.

### Pitfall 4: sdpi-components Inside `<details>` May Not Initialize
**What goes wrong:** Web components inside a collapsed `<details>` element might not render correctly when first opened.
**Why it happens:** Some browsers defer rendering of content inside closed `<details>` elements. Web components may not initialize properly if they rely on being visible.
**How to avoid:** sdpi-components v3 uses MutationObserver and connectedCallback which fire regardless of visibility. Test to confirm. If issues arise, add a `toggle` event listener that forces a reflow: `details.addEventListener('toggle', () => { /* requestAnimationFrame */ })`.
**Warning signs:** Empty or unstyled fields when opening a previously closed section for the first time.

### Pitfall 5: Settings Auto-Binding Breaks If HTML Structure Changes
**What goes wrong:** sdpi-components stop syncing settings to the plugin.
**Why it happens:** Moving or wrapping `<sdpi-item>` elements incorrectly. The `setting=` attribute on the inner component is what matters, not the wrapper structure.
**How to avoid:** Keep `<sdpi-item>` and its child component intact. Only add wrapper `<div>` and `<details>` around them. Do not change `setting=` attribute values.
**Warning signs:** Settings no longer save when changed in PI.

## Code Examples

### Complete CSS File Structure (mqtt-action.css)
```css
/* === Theme Overrides === */
:root {
  --font-color: #ffffff;
  --input-font-color: #ffffff;
  /* Keep existing: --window-bg-color: #2d2d2d (already correct) */
  /* Keep existing: --input-bg-color: #3d3d3d (already fine) */
}

body {
  margin: 0;
  padding: 4px;
}

/* === Section Accordion === */
details {
  margin-bottom: 4px;
}

details > summary { /* section header bar styling */ }
details[open] > summary { /* open state */ }
details > summary::before { /* collapse indicator */ }
details[open] > summary::before { /* expand indicator */ }

/* === Section Content === */
.section-content {
  padding: 4px 0;
}

/* === Advanced Toggle === */
details.advanced > summary.advanced-toggle { /* subtle blue link */ }

/* === Accent Color === */
/* Use #0078D7 for: advanced toggle text, focus rings, active states */
```

### Complete HTML Structure (mqtt-action.html)
```html
<!doctype html>
<html>
<head lang="en">
  <meta charset="utf-8" />
  <script src="https://sdpi-components.dev/releases/v3/sdpi-components.js"></script>
  <link rel="stylesheet" href="mqtt-action.css" />
</head>
<body>
  <!-- Section 1: Broker (open by default) -->
  <details open>
    <summary>Broker</summary>
    <div class="section-content">
      <!-- Basic fields: Host, Port -->
      <sdpi-item label="Host">
        <sdpi-textfield setting="brokerHost" placeholder="192.168.3.8"></sdpi-textfield>
      </sdpi-item>
      <sdpi-item label="Port">
        <sdpi-textfield setting="brokerPort" placeholder="1883" value="1883"></sdpi-textfield>
      </sdpi-item>
      <!-- Advanced: Username, Password, TLS -->
      <details class="advanced">
        <summary class="advanced-toggle">Advanced</summary>
        <div class="advanced-content">
          <sdpi-item label="Username">
            <sdpi-textfield setting="brokerUsername" placeholder="optional"></sdpi-textfield>
          </sdpi-item>
          <sdpi-item label="Password">
            <sdpi-password setting="brokerPassword" placeholder="optional"></sdpi-password>
          </sdpi-item>
          <sdpi-item label="TLS">
            <sdpi-checkbox setting="brokerTls"></sdpi-checkbox>
          </sdpi-item>
        </div>
      </details>
    </div>
  </details>

  <!-- Section 2: Subscribe (collapsed) -->
  <details>
    <summary>Subscribe</summary>
    <div class="section-content">
      <sdpi-item label="Topic">
        <sdpi-textfield setting="subscribeTopic" placeholder="stat/light/POWER"></sdpi-textfield>
      </sdpi-item>
      <details class="advanced">
        <summary class="advanced-toggle">Advanced</summary>
        <div class="advanced-content">
          <sdpi-item label="JSON Path">
            <sdpi-textfield setting="jsonPath" placeholder="temperature"></sdpi-textfield>
          </sdpi-item>
          <sdpi-item label="Display">
            <sdpi-textfield setting="displayTemplate" placeholder="{{value}} C"></sdpi-textfield>
          </sdpi-item>
        </div>
      </details>
    </div>
  </details>

  <!-- Section 3: Publish (collapsed) -->
  <details>
    <summary>Publish</summary>
    <div class="section-content">
      <sdpi-item label="Topic">
        <sdpi-textfield setting="publishTopic" placeholder="cmnd/light/POWER"></sdpi-textfield>
      </sdpi-item>
      <sdpi-item label="Payload">
        <sdpi-textfield setting="publishPayload" placeholder="TOGGLE"></sdpi-textfield>
      </sdpi-item>
      <details class="advanced">
        <summary class="advanced-toggle">Advanced</summary>
        <div class="advanced-content">
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
        </div>
      </details>
    </div>
  </details>

  <!-- Section 4: Toggle (collapsed, no advanced) -->
  <details>
    <summary>Toggle</summary>
    <div class="section-content">
      <sdpi-item label="On Payload">
        <sdpi-textfield setting="onPayload" placeholder="ON"></sdpi-textfield>
      </sdpi-item>
      <sdpi-item label="Off Payload">
        <sdpi-textfield setting="offPayload" placeholder="OFF"></sdpi-textfield>
      </sdpi-item>
      <sdpi-item label="On Value">
        <sdpi-textfield setting="onValue" placeholder="ON"></sdpi-textfield>
      </sdpi-item>
      <sdpi-item label="Off Value">
        <sdpi-textfield setting="offValue" placeholder="OFF"></sdpi-textfield>
      </sdpi-item>
    </div>
  </details>

  <!-- Section 5: Long Press (collapsed, no advanced) -->
  <details>
    <summary>Long Press</summary>
    <div class="section-content">
      <sdpi-item label="Topic">
        <sdpi-textfield setting="longPressTopic" placeholder="cmnd/light/OFF"></sdpi-textfield>
      </sdpi-item>
      <sdpi-item label="Payload">
        <sdpi-textfield setting="longPressPayload" placeholder="changeTo/off"></sdpi-textfield>
      </sdpi-item>
    </div>
  </details>
</body>
</html>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| CSS checkbox hack for accordion | `<details>`/`<summary>` native | Baseline since ~2020, improved in 2025 | No JS needed, accessible by default |
| `::marker` for disclosure triangle | `::marker` + `::before` combo | 2024-2025 (Interop 2025) | Cross-browser consistent custom indicators |
| Exclusive accordion via JS | `name` attribute on `<details>` | Firefox 130 (2025), Chrome 120+ | Native exclusive accordion (not needed here but available) |

## Open Questions

1. **sdpi-components inside collapsed `<details>` initialization**
   - What we know: Web components use `connectedCallback` which fires when added to DOM, regardless of visibility. sdpi-components v3 should work fine.
   - What's unclear: Whether Stream Deck's embedded Chromium has any quirks with this pattern.
   - Recommendation: Test after implementation. If fields don't render in collapsed sections, add a one-line `toggle` event handler as fallback.

2. **CSS custom property inheritance depth**
   - What we know: `:root` level overrides cascade into shadow DOM of sdpi-components for the documented properties.
   - What's unclear: Whether ALL text elements inside sdpi-components respect `--font-color` (labels, placeholders, select options).
   - Recommendation: After setting `:root` overrides, visually inspect each component type. Add targeted overrides if needed (e.g., `sdpi-select { color: #ffffff; }`).

## Sources

### Primary (HIGH confidence)
- sdpi-components v3 source (CDN) -- extracted CSS custom properties: `--font-color: #969696`, `--window-bg-color: #2d2d2d`, `--input-bg-color: #3d3d3d`, `--input-font-color: #d8d8d8`
- [Elgato SDK PI Guide](https://docs.elgato.com/streamdeck/sdk/guides/ui/) -- PI structure, sdpi-components usage
- [MDN: Exclusive Accordions with details](https://developer.mozilla.org/en-US/blog/html-details-exclusive-accordions/) -- native accordion patterns, `name` attribute
- [CSS-Tricks: Details/Summary Accordion](https://css-tricks.com/quick-reminder-that-details-summary-is-the-easiest-way-ever-to-make-an-accordion/) -- styling patterns

### Secondary (MEDIUM confidence)
- [GeekyEggo/sdpi-components GitHub](https://github.com/GeekyEggo/sdpi-components) -- component library source
- [Builder.io: Animated CSS Accordions](https://www.builder.io/blog/animated-css-accordions/) -- `::details-content` pseudo-element for animations

### Tertiary (LOW confidence)
- Stream Deck embedded browser Chromium version (assumed modern, untested for `::details-content`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- sdpi-components CSS properties extracted directly from source, `<details>/<summary>` is native HTML
- Architecture: HIGH -- straightforward CSS override + HTML restructure, no dependencies
- Pitfalls: MEDIUM -- shadow DOM cascade and collapsed-section initialization are theoretically sound but untested in Stream Deck's specific Chromium build

**Research date:** 2026-03-26
**Valid until:** 2026-06-26 (stable domain, HTML/CSS standards)
