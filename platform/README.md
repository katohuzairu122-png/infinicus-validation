# Platform Assembly

## Implementation

BUILD-10 (spec: `docs/implementation-queue/BUILD-10-PLATFORM-SPECIFICATION.md`)
adds a single browser-global orchestration file that reads the readiness of
the eight browser-applicable INFINICUS layers and reports it through one new
additive namespace. It does not rewrite, wrap, or wire any completed layer.

### File

```
platform/
├── platform-bootstrap.js   ← loaded via <script defer> after the ADI bundle
├── tests/                  ← 9 files, node:assert/strict, run with `node <file>`
│   ├── _harness.mjs        ← shared VM-extraction harness (same technique as
│   │                          ai-decision-intelligence/sim-integration-harness.mjs)
│   ├── 01-file-existence.test.mjs
│   ├── 02-namespace-contract.test.mjs
│   ├── 03-bootstrap-state-machine.test.mjs
│   ├── 04-handoff-map.test.mjs
│   ├── 05-capability-registry.test.mjs
│   ├── 06-error-isolation.test.mjs
│   ├── 07-idempotent-initialization.test.mjs
│   ├── 08-security.test.mjs
│   └── 09-end-to-end-readiness.test.mjs
└── README.md
```

### Namespace

`window.INFINICUS.PLATFORM` (additive — `DA`/`DT`/`BI`/`ABA`/`OM`/`CL`/`ADI`/
`SIMULATION` are untouched).

### What it does

- Runs once automatically when the deferred script executes (after all seven
  layer bundles have finished executing), and again on any explicit
  `initialize({ force: true })` call.
- Checks the 8 browser-applicable layer namespaces (`DA`, `DT`, `BI`, `ABA`,
  `OM`, `CL`, `ADI`, `SIMULATION`) using each layer's own existing diagnostic
  route/method — `da.master.diagnose`, `DT.runtime.diagnostics()`,
  `bi.master.diagnose`, `aba.master.diagnose`, `om.master.diagnose`,
  `cl.master.diagnose`, `adi.master.diagnose`, and a shape check on
  `SIMULATION.executeScenario`/`.getCompletedRun`/`.capabilities`.
- Computes one of six states: `not_started`, `validating`, `initializing`,
  `ready`, `degraded`, `failed`.
- Reports a 9-entry capability registry (one per architectural layer,
  including Business Operations — which is always `browserApplicable: false`
  since it has no browser layer).
- Reports a static, frozen 9-entry handoff map describing the repository's
  actual current wiring — it never wires, fixes, or upgrades a handoff.
- Records bounded (50-event), redacted diagnostics.

### What it does not do

- Does not call, wrap, or modify any layer's `registerService`/`registerRoute`.
- Does not wire `DT-24` to `SIMULATION` or `ADI-24` to `ABA` — both remain
  reported as `not_wired`, exactly as found (see `docs/platform-bootstrap.md`).
- Does not complete any of the six placeholder handoff-contract TypeScript
  files.
- Does not invoke `SIMULATION.executeScenario` during bootstrap — no
  Monte Carlo run is ever triggered by page load.
- Does not use `eval`, `localStorage`, `IndexedDB`, or any network call.

### Tests

```bash
for test in platform/tests/*.test.mjs; do node "$test"; done
```

See `docs/platform-bootstrap.md` for the full namespace contract, state
machine, capability registry, and handoff map.
