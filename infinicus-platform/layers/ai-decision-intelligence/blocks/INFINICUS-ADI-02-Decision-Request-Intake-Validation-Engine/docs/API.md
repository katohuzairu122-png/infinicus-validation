# Public API

## `createDecisionRequestIntakeEngine(options)`

Options:

- `authorize(subject)` required async authorization adapter. Intake fails closed when it is absent.
- `duplicateStore` tenant-safe idempotency store.
- `createId(prefix)` ID provider, normally ADI-01.
- `emit(topic, payload, context)` event publisher, normally ADI-01.
- `now()` deterministic clock.

Returns an engine with `submit(input, context)`.

## `attachToADIRuntime(runtime, options)`

Registers service `adi.decision_request_intake` and route `adi.decision_request.submit` with ADI-01.
