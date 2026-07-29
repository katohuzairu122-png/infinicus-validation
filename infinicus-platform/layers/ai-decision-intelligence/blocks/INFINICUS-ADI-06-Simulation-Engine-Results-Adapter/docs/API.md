# Public API

- `createSimulationResultsAdapter({ readCompletedRun, emit })` creates the adapter.
- `adapter.acquire({ decisionCase, boundary, requestedScopes, runIds }, context)` returns fragments for valid completed runs.
- `validateSimulationRun(run, boundary, decisionId)` validates run integrity.
- `mapRunToFragments(run, validation)` copies recorded results into context fragments.
- `attachToADIRuntime(runtime, options)` registers the service, route and ADI-04 provider.
