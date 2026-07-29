# Public API

- `createADIRuntime(options)` creates an isolated runtime.
- `installGlobal(target)` installs it at `INFINICUS.ADI.runtime` without overwriting an existing runtime.
- `registerService/getService/listServices` manage block services.
- `registerRoute/dispatch/listRoutes` expose governed commands.
- `subscribe/emit/listEvents` manage domain events and bounded event history.
- `registerCapability`, `registerDecisionType`, `registerPolicy`, `registerModel`, `registerPrompt`, `registerDataSource` and `registerHandoffContract` populate registries.
- `lifecycle.transition(entity, nextState, reason)` enforces the decision lifecycle.
- `diagnose()` returns runtime health.
