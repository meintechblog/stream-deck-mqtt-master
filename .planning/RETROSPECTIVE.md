# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-25
**Phases:** 3 | **Plans:** 8 | **Sessions:** ~4

### What Was Built
- Bidirectional MQTT Stream Deck plugin with publish-on-press and subscribe-with-live-titles
- Full Property Inspector with 16 sdpi-component fields across 4 sections (broker, publish, subscribe, toggle)
- Toggle mode with JSON path extraction, display templates, and visual setState feedback
- Disconnect indicator ("! Offline") with full subscription lifecycle cleanup
- Deploy tooling (`npm run deploy`, `npm run package`) and GitHub Release v0.1.0

### What Worked
- 3-phase coarse roadmap was right-sized — each phase was buildable in a single session
- ConnectionManager singleton with per-broker pooling avoided connection management complexity
- Unified Action pattern (one action for all modes) kept code simple and user experience clean
- sdpi-components for PI avoided framework overhead — plain HTML was sufficient
- Research phases caught important patterns (CJS output, clean:true for reconnect, path quoting for scp)

### What Was Inefficient
- Phase 1 and 2 completion checkpoints (deploy to Mac Mini) were identical in structure — could have been a shared script from the start
- tsc --noEmit errors from Phase 2 (setState on union type) were carried forward instead of fixed — tech debt accumulated
- `streamdeck create` CLI was unavailable locally, requiring manual scaffold — should have installed globally first

### Patterns Established
- `trimSettings()` called in every handler for defensive settings access
- `DisableAutomaticStates: true` in manifest to prevent SDK from toggling button state
- `buildSubscriptionCallback()` shared helper for deduplicating subscription logic
- In-memory `lastValues` cache per action context for comparison-based updates
- `statusListeners` map pattern for cross-component event notification

### Key Lessons
1. Manual scaffold works fine for SDK v2 — the CLI generates boilerplate that's easy to replicate
2. Per-broker connection pooling is critical — without it, 15+ buttons would open 15+ TCP connections
3. Settings validation with Zod should be added in v2 — raw settings access is fragile
4. Deploy script should build internally to avoid double-building on every deploy

### Cost Observations
- Model mix: ~70% opus (execution), ~30% sonnet (verification)
- Sessions: ~4 (init/planning, phase 1+2 execution, phase 3 execution, milestone completion)
- Notable: Entire MVP from zero to shipped GitHub Release in a single day

---

## Milestone: v2.0 — Power Features + Polish

**Shipped:** 2026-03-26
**Phases:** 3 | **Plans:** 3 | **Sessions:** ~1

### What Was Built
- Long Press: onKeyDown→onKeyUp refactor, 500ms threshold, separate topic+payload
- PI Redesign: Dark theme CSS, 5 accordion sections, advanced field toggles
- TypeScript fixes: isKey() type guards on all setState calls, zero tsc errors
- Phase 6 (Display Templates) skipped — already implemented in v1.0

### What Worked
- Discuss-phase caught the KeyUp-first trigger model — saved a refactor later
- User testing Loxone during discuss-phase resolved the state-check question definitively
- Phase 6 skip saved a full plan-execute-verify cycle for zero-value work
- PI research found the exact CSS custom properties to override — no trial and error

### What Was Inefficient
- Display Templates were planned as a v2 phase despite being in v1.0 already (D-17) — requirements review should have caught this
- Multi-Action was scoped into v2 during new-milestone then immediately removed — should have been filtered earlier

### Patterns Established
- `isKey()` type guard pattern for KeyAction-only plugins
- `keyDownTimestamps` Map for press duration measurement
- `<details>`/`<summary>` for PI accordion (no JS needed)
- Advanced toggle via nested `<details class="advanced">`

### Key Lessons
1. Check existing codebase before defining requirements — avoids planning already-shipped features
2. KeyUp-first for all publish actions is simpler than KeyDown with cancel logic
3. PI theming via CSS custom property overrides is the right approach for sdpi-components

### Cost Observations
- Model mix: ~70% opus (execution), ~30% sonnet (verification)
- Sessions: ~1 (entire v2.0 in one session)
- Notable: Phase 6 skip saved ~50% of expected v2.0 cost

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | ~4 | 3 | Initial process — established patterns |
| v2.0 | ~1 | 3 | Phase skip for pre-existing features, KeyUp-first pattern |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 12 (resolveJsonPath) | Low | 0 (mqtt, zod pending) |
| v2.0 | 12 (unchanged) | Low | 0 |

### Top Lessons (Verified Across Milestones)

1. Right-sized phases (1-3 plans each) enable single-session execution
2. Research phases pay for themselves by catching integration pitfalls early
3. Check existing codebase before defining requirements — avoids planning shipped features
