# Public API

- `createAccessControlEngine(options)` creates the access engine.
- `options.resolveIdentity(context)` is required for successful authorization.
- `engine.store.assignRole(scope)` assigns a registered role within a tenant/business boundary.
- `engine.store.deny(scopeWithPermission)` creates an explicit deny.
- `engine.authorize(request, context)` returns an AccessDecision.
- `engine.secureDecisionCase(decisionCase, context)` validates update access, assigns ownership when absent and returns a secured immutable case.
- `attachToADIRuntime(runtime, options)` registers ADI-03 with ADI-01.
