# Phase 4: Type Safety + Long Press - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-25
**Phase:** 04-type-safety-long-press
**Areas discussed:** Long Press trigger behavior, Long Press PI fields

---

## Long Press Trigger Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Fire on KeyDown (instant) | Short press fires immediately, long press fires after threshold. Fast response but needs cancel logic. | |
| Fire on KeyUp (wait) | All actions fire on key release. Know exact hold duration. Simple logic. | ✓ |

**User's choice:** Fire on KeyUp — "Die Aktion soll immer erst feuern, wenn man die Taste losgelassen hat, weil dann braucht man keine krasse Logik; dann weiß man ja, wie lange die Taste gedrückt wurde."
**Notes:** User prioritized simplicity over instant response. 500ms delay on every press is acceptable.

---

## Long Press Topic

| Option | Description | Selected |
|--------|-------------|----------|
| Eigenes Topic-Feld | Long Press can send to completely different topic than Short Press | ✓ |
| publishTopic wiederverwenden | Long Press always uses same topic, different payload only | |

**User's choice:** Eigenes Topic-Feld — maximum flexibility for different MQTT targets.

---

## Claude's Discretion

- TypeScript narrowing approach (type guard vs cast)
- onKeyDown→onKeyUp refactoring strategy
- Long Press section placement in PI
- keyDownTimestamp storage approach

## Deferred Ideas

- Configurable Long Press threshold (v3+)
- Visual feedback during hold (v3+)
