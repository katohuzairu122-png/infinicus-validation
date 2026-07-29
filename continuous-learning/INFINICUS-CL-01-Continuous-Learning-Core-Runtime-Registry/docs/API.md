# API

`window.INFINICUS.CL.runtime`

Core methods:

- `createId(prefix)`
- `clone(value)`
- `freeze(value)`
- `success(data, meta)`
- `failure(code, message, details)`
- `emit(eventName, payload)`
- `on(eventName, handler)`
- `registerService(name, service, metadata)`
- `getService(name)`
- `registerRoute(name, handler, metadata)`
- `getRoute(name)`
- `invoke(name, input)`
- `registerPolicy(input)`
- `getPolicy(policyType, policyId)`
- `registerLearningState(input)`
- `getLearningState(id)`
- `diagnose()`

Routes:

- `cl.runtime.diagnose`
- `cl.runtime.manifest`
