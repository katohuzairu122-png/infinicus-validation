# Platform Bootstrap — BUILD-10

## Status

**IMPLEMENTED** (2026-07-21)

Specification: `docs/implementation-queue/BUILD-10-PLATFORM-SPECIFICATION.md`
(SHA-256 `878ff02a4f3865fb2a06ffc33b71d7c614ec65e810f92926a0cd27f0abc081c7`).

## Overview

`platform/platform-bootstrap.js` is a new, additive browser-global script
loaded via `<script defer>` immediately after `ai-decision-intelligence/adi-bundle.js`
in `index.html`. It establishes `window.INFINICUS.PLATFORM`, reporting the
readiness of the platform's eight browser-applicable layers using each
layer's own existing diagnostic surface. It creates no business logic, wires
no new handoff, and modifies no completed layer.

This is orchestration/reporting only — it is not a ninth architectural layer
and does not implement any Business Operations browser namespace (Business
Operations has no browser layer; it is persistence-only, Stage 2C).

## Bundle Loading Order

```
data-acquisition/da-bundle.js          (defer)
digital-twin/dt-bundle.js              (defer)
business-intelligence/bi-bundle.js     (defer)
approved-business-action/aba-bundle.js (defer)
outcome-monitoring/om-bundle.js        (defer)
continuous-learning/cl-bundle.js       (defer)
ai-decision-intelligence/adi-bundle.js (defer)
platform/platform-bootstrap.js         (defer)   ← new, BUILD-10
```

`window.INFINICUS.SIMULATION` (the Engine v3 facade, BUILD-07) is established
by a non-deferred inline script that executes during HTML parsing, before any
`defer`red script — including all eight scripts above. By the time
`platform-bootstrap.js` runs, `SIMULATION` is already fully populated.

## Namespace Contract

```js
window.INFINICUS.PLATFORM = {
  version: "1.0.0",
  bootstrap: {
    initialize(options),      // { force?: boolean } -> PlatformInitializationResult
    getStatus(),               // -> PlatformStatus
    isReady(),                 // -> boolean
    getCapabilities(),         // -> PlatformCapability[9]
    getDiagnostics(),          // -> PlatformDiagnostics (<=50 bounded events)
    getHandoffs(),              // -> HandoffRegistration[9]
    getVersionManifest()        // -> PlatformVersionManifest
  },
  status,        // live snapshot, same shape as getStatus()
  capabilities,  // live snapshot, same shape as getCapabilities()
  diagnostics,   // live snapshot, same shape as getDiagnostics()
  handoffs       // live snapshot, same shape as getHandoffs()
};
```

Existing namespaces (`DA`, `DT`, `BI`, `ABA`, `OM`, `CL`, `ADI`,
`SIMULATION`) are read-only inputs to this file — none is renamed, wrapped,
or mutated.

## Initialization State Machine

```
not_started -> validating -> initializing -> ready | degraded | failed
```

- **ready** — all 8 required namespaces report `ok:true` from their own
  diagnostic surface.
- **degraded** — 1–7 ready, the rest missing or reporting `ok:false`.
- **failed** — 0 ready, or an uncaught exception escaped `initialize()`
  itself (the only fatal condition; every per-layer check is individually
  try/caught and can only downgrade that one layer).
- Runs once automatically at script-load time; a second `initialize()` call
  without `{ force: true }` is a no-op returning the cached result
  (idempotent); `{ force: true }` re-runs the full detection pass.

## Per-Layer Readiness Source (verified, non-uniform across the codebase)

| Layer | Readiness call | Notes |
|---|---|---|
| DA | `DA.runtime.invoke('da.master.diagnose', {})` | |
| DT | `DT.runtime.diagnostics()` | DT has 24 blocks, no DT-25 — no master route exists |
| BI | `BI.runtime.call('bi.master.diagnose', {})` | |
| ABA | `ABA.runtime.dispatch('aba.master.diagnose', {})` | |
| OM | `OM.runtime.dispatch('om.master.diagnose', {})` | |
| CL | `CL.runtime.invoke('cl.master.diagnose', {})` | |
| ADI | `ADI.runtime.dispatch('adi.master.diagnose', {})` | |
| SIMULATION | shape check: `executeScenario`/`getCompletedRun` are functions, `capabilities.runs===500`, `capabilities.horizonDays===90` | never invokes the real engine during bootstrap |

Every check depends only on the universal `{ ok }` result envelope — never
on a layer-specific nested field name (confirmed non-uniform: `productionReady`
on DA/BI/ABA/OM/CL, `status` on ADI, neither on DT).

## Capability Registry

9 entries, fixed order: `data_acquisition`, `business_operations`,
`business_intelligence`, `business_digital_twin`, `simulation`,
`ai_decision_intelligence`, `approved_business_action`, `outcome_monitoring`,
`continuous_learning`. `business_operations` is always
`browserApplicable: false, ready: false` with an explanatory note — this is
architecture, not a load failure.

## Cross-Layer Handoff Map (static, frozen — never live-wired by this file)

| handoffId | producer → consumer | mechanism | contractBacked | status |
|---|---|---|---|---|
| DA_TO_BO | DA → BO | persistence (`dal-to-bo.ts`) | true | active |
| BO_TO_BI | BO → BI | persistence (`bo-to-bi.ts`) | true | active |
| BI_TO_DT | BI → DT | none | false | **not_wired** |
| DT_TO_SIM | DT → SIM | none | false | **not_wired** |
| SIM_TO_ADI | SIM → ADI | direct-port (`ADI.simulationPorts`) | true | active |
| ADI_TO_ABA | ADI → ABA | none | false | **not_wired** |
| ABA_TO_OM | ABA → OM | registerPublisher | false | active |
| OM_TO_CL | OM → CL | registerPublisher | false | active |
| CL_FEEDBACK | CL → (upstream) | event-bus | false | active |

`BI_TO_DT`/`DT_TO_SIM`/`ADI_TO_ABA` are reported `not_wired` honestly — this
build does not wire `DT-24` to `SIMULATION` or `ADI-24` to `ABA`; both are
confirmed, pre-existing gaps in the frozen layers, left unmodified.

## Error Model

Every per-layer check is wrapped individually; only an uncaught exception in
`initialize()`'s own control flow (outside any per-layer check) is fatal.
Error codes: `PLATFORM_LAYER_NAMESPACE_MISSING`, `PLATFORM_LAYER_RUNTIME_MISSING`,
`PLATFORM_LAYER_VERSION_INCOMPATIBLE`, `PLATFORM_LAYER_API_INVALID`,
`PLATFORM_LAYER_RESPONSE_MALFORMED`, `PLATFORM_LAYER_DIAGNOSTIC_FAILED`,
`PLATFORM_BOOTSTRAP_THREW`.

## Observability

Bounded ring buffer, last 50 `PlatformDiagnosticEvent` entries, each
`{event, severity, layerId, correlationId, occurredAt, message, payloadSummary}`.
`payloadSummary` is a redacted `{ok, hasData, status?, productionReady?}`
shape only — never a layer's full response, never business data, never a
credential.

## Security

No `eval`, no `new Function`, no string-based `setTimeout`, no
`innerHTML`/`outerHTML`/`insertAdjacentHTML`, no `localStorage`/`IndexedDB`,
no `fetch`/`XMLHttpRequest`. Verified by `platform/tests/08-security.test.mjs`.

## Tests

9 files under `platform/tests/`, 127 `assert` calls (minimum required: 9
files / 75 assertions), run via `node <file>` per the existing repository
convention (`CLAUDE-QUEUE-INSTRUCTIONS.md`). A shared VM-extraction harness
(`platform/tests/_harness.mjs`) loads the real `platform-bootstrap.js` source
into an isolated `vm.Context` with mocked layer namespaces — the same
technique established by `ai-decision-intelligence/sim-integration-harness.mjs`
(BUILD-07) — so tests exercise the actual shipped code.

## Known Limitations

- Business Operations has no browser layer (persistence-only, Stage 2C).
- `DT-24` → `SIMULATION` is not wired.
- `ADI-24` → `ABA` is not wired.
- Six of nine TypeScript handoff-contract files remain 6-line placeholders
  (`bi-to-dt.ts`, `dt-to-sim.ts`, `adi-to-aba.ts`, `aba-to-om.ts`,
  `om-to-cl.ts`, `cl-feedback.ts`).
- The complete nine-layer browser pipeline
  (DA→BO→BI→DT→SIM→ADI→ABA→OM→CL) is not operational; only readiness,
  existing browser wiring, and the functional SIM↔ADI pair are validated.
- Database persistence stops at Stage 2D (migrations `0001`–`0049`); no
  Stage 2E or later persistence exists.
