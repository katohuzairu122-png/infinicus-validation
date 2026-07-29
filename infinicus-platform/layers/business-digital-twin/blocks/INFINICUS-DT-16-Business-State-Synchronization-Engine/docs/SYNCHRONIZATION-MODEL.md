# Synchronization Controls

- source priority
- minimum confidence
- maximum age
- numeric conflict tolerance
- simulated-state rejection
- idempotency
- versioning
- supersession
- manual conflict review

# Selection Order

1. reject stale or disallowed state,
2. prefer higher-priority source,
3. prefer higher confidence,
4. prefer newer observation,
5. retain current state when no better candidate exists.
