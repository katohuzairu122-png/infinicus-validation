# Public API

- `createDigitalTwinContextAdapter({ readSnapshot, emit })` creates the adapter.
- `adapter.acquire({ decisionCase, boundary, requestedScopes }, context)` returns validated fragments and snapshot metadata.
- `validateTwinSnapshot(snapshot, boundary)` performs deterministic validation.
- `mapSnapshotToFragments(snapshot, validation)` performs structural mapping.
- `attachToADIRuntime(runtime, options)` registers the service, route and ADI-04 provider.
