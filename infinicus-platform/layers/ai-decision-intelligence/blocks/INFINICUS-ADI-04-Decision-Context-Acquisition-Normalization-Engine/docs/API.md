# Public API

- `createDecisionContextEngine(options)` creates an isolated context engine.
- `engine.providers.register(descriptor, provider)` registers a provider implementing `acquire(query, context)`.
- `engine.verifyBoundary(decisionCase, accessDecision)` verifies the ADI-03 security handoff.
- `engine.acquire(input, context)` returns a DecisionContextEnvelope. It accepts an explicit AccessDecision or the secured DecisionCase's minimal `security.accessProof`.
- `attachToADIRuntime(runtime, options)` registers service `adi.decision_context` and route `adi.decision_context.acquire`.

Provider descriptors require `providerId` and a supported `sourceType`.
