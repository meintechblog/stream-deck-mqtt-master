---
status: partial
phase: 03-hardening-deployment
source: [03-VERIFICATION.md]
started: 2026-03-25T23:30:00Z
updated: 2026-03-25T23:30:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Disconnect indicator
expected: Stop Mosquitto on Mac Mini → all buttons show "! Offline". Restart Mosquitto → indicator clears and MQTT values restore.
result: [pending]

### 2. Subscription lifecycle
expected: Add/remove buttons in Stream Deck layout → clean subscribe/unsubscribe, no stale callbacks accumulate.
result: [pending]

### 3. Deploy workflow
expected: Run `npm run deploy` → scp succeeds with space-quoted remote path, Stream Deck restarts cleanly on Mac Mini.
result: [pending]

## Summary

total: 3
passed: 0
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps
