# Phase 5: PI Redesign - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Restyle the Property Inspector with custom CSS for a readable dark theme matching the native Stream Deck aesthetic, collapsible accordion sections, and Advanced toggle for power-user fields. No functional changes to settings logic — purely visual/UX.

</domain>

<decisions>
## Implementation Decisions

### Visual Style
- **D-32:** Stream Deck native dark theme — dark gray (#2D2D2D) background, white text, blue accents (#0078D7). Match the Stream Deck app's own settings panels for seamless integration.
- **D-33:** Custom CSS file linked from PI HTML. Override sdpi-components defaults where needed (especially text color contrast).

### Section Design
- **D-34:** Collapsible accordion sections — each of the 5 sections (Broker, Subscribe, Publish, Toggle, Long Press) is expandable/collapsible via click on the section header.
- **D-35:** Broker section open by default. All others collapsed on load.
- **D-36:** Section headers styled as clickable bars with expand/collapse indicator (▶/▼ or similar).
- **D-37:** Pure CSS/HTML accordion (no framework). Use `<details>`/`<summary>` or checkbox hack. Keep it dependency-free.

### Field Layout
- **D-38:** Advanced toggle per section — less-used fields hidden behind "Show Advanced" link within each section.
- **D-39:** Advanced fields per section:
  - Broker: Username, Password, TLS (basic: Host, Port)
  - Subscribe: JSON Path, Display Template (basic: Topic)
  - Publish: QoS, Retain (basic: Topic, Payload)
  - Toggle: all fields always visible (all 4 are equally important)
  - Long Press: all fields always visible (only 2 fields)

### Carried Forward
- **D-01:** Unified Action
- **D-14:** sdpi-components web components (still used for form fields, but wrapped in new layout)
- **D-30:** Long Press section exists (from Phase 4)
- All existing sdpi-textfield, sdpi-select, sdpi-checkbox, sdpi-password components remain

### Claude's Discretion
- Exact CSS values (font sizes, padding, border-radius, transitions)
- Accordion animation approach (CSS transition vs instant toggle)
- Advanced toggle visual design (link, small button, or icon)
- Section header icon choices
- Whether to use `<details>/<summary>` or CSS checkbox hack for accordion

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Plugin Code
- `io.github.meintechblog.mqtt-master.sdPlugin/ui/mqtt-action.html` — Current PI HTML (80 lines, no CSS, 5 sections with sdpi-components)
- `src/types/settings.ts` — MqttActionSettings schema (all field names for setting= attributes)

### Project Context
- `.planning/PROJECT.md` — Project vision, v2.0 milestone goals
- `.planning/REQUIREMENTS.md` — PI-01, PI-02, PI-03

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- sdpi-components v3 (loaded via CDN) — provides `<sdpi-item>`, `<sdpi-textfield>`, `<sdpi-select>`, `<sdpi-checkbox>`, `<sdpi-password>` web components
- Existing HTML structure with `<h2>` section headers and `<hr>` separators — can be refactored to accordion

### Established Patterns
- PI is a single HTML file with no external CSS
- sdpi-components handle form↔settings binding automatically via `setting=` attributes
- No JavaScript in PI beyond the sdpi-components script

### Integration Points
- New CSS file needs to be created and linked from PI HTML `<head>`
- HTML structure needs refactoring: wrap sections in `<details>`/`<summary>` or equivalent
- Advanced fields need wrapper elements for show/hide toggle
- sdpi-components styling can be overridden via CSS custom properties or direct selectors

</code_context>

<specifics>
## Specific Ideas

- User explicitly complained about black text on dark gray background — text contrast is the #1 priority
- "Augenkrebs" (eye cancer) was the exact feedback — legibility must be dramatically improved
- Stream Deck native look is the target — not a custom brand identity

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-pi-redesign*
*Context gathered: 2026-03-25*
