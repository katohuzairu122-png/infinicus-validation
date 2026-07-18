# Architecture

## Core Runtime Responsibilities

1. Create the `window.INFINICUS.DT` namespace.
2. Standardize success and failure envelopes.
3. Generate stable runtime identifiers.
4. Register services, routes, entities, states, schemas, adapters, events, and twins.
5. Publish and subscribe to Digital Twin events.
6. Enforce lifecycle transition rules.
7. Expose runtime diagnostics.
8. Publish the 24-block Digital Twin manifest.

## Responsibility Boundary

DT-01 provides infrastructure.

It does not create a business twin instance. DT-02 handles business identity and twin-instance registration.
