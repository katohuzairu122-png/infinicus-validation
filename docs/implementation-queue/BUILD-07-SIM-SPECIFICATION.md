# BUILD-07 Specification — SIM: Simulation Layer Integration Cleanup

- **Build ID:** BUILD-07
- **Layer:** SIM (Simulation)
- **Status:** ready (specification frozen 2026-07-21; implementation not started)
- **Depends on:** BUILD-06 (ADI) — completed
- **Authorized by:** repository owner scope decision, 2026-07-21

---

## 1. Objective

Integrate the existing INFINICUS Engine v3 Simulation capability with the
modular INFINICUS architecture and the completed ADI layer through typed
ports, adapters and the SIM-to-ADI handoff contract.

BUILD-07 must NOT create or rewrite the Simulation engine. The authoritative
Simulation implementation remains Engine v3 in the root `index.html`, exposed
through `window.INFINICUS.SIMULATION.*`. Its established Monte Carlo
behaviour — including the existing 500-run and 90-day behaviour — must be
preserved unless repository evidence proves those values are configurable
rather than fixed defaults.

Replace the current disconnected integration seams so that:

1. ADI-16 can request an authorized Simulation scenario execution through a
   Simulation application port.
2. ADI-06 can retrieve a completed Simulation run through a read port.
3. A completed Simulation result transfers to ADI through a complete,
   validated SIM-to-ADI handoff contract.
4. Existing Engine v3 Simulation behaviour remains unchanged.

## 2. Current-State Baseline (verified 2026-07-21)

The implementer must re-verify this baseline before editing.

| Seam | Current state |
|---|---|
| `window.INFINICUS.SIMULATION` namespace (`index.html` ~line 7045+) | Exposes ONLY inbound receive hooks — `receiveDigitalTwinPackage`, `receiveBIPackage`, `receiveABAContract`, `receiveOMPackage`, `receiveCLIntelligence` — plus `_last*` caches. **No execution entry point and no completed-run read API exist on the namespace.** The engine runs via page-level functions. |
| `infinicus-platform/packages/handoff-contracts/src/sim-to-adi.ts` | Placeholder: `{ correlationId: string; // TODO: add fields }` |
| `infinicus-platform/layers/simulation/src/index.ts` | `export const LAYER_ID = 'SIM'` only — no public API |
| ADI browser bootstrap (`ai-decision-intelligence/adi-bundle.js`, `/* ===== ADI BOOTSTRAP ===== */` footer section) | ADI-06 attached with `readCompletedRun: async () => null`; ADI-16 attached with `executeScenario: async () => { throw new Error("Simulation engine adapter is not connected."); }` |
| ADI adapter call-time contracts | ADI-06 `readCompletedRun(query, context)` must return a run object validated by `validateSimulationRun(run, boundary, decisionId)` (requires tenant/business boundary fields, completed status). ADI-16 `executeScenario({ alternative, decisionId, tenantId, businessId, simulationPolicy, comparisonMetrics })` must return `{ runId, status: "completed", tenantId, businessId, outputs, ... }`. |
| Architecture manifest (`infinicus-platform/docs/architecture-manifest.md`) | Layer 5 SIM, handoff out `sim-to-adi`, event prefix `simulation.*`, canonical completion event `simulation.completed` |
| Root SIM tests | None exist at the repository root for the SIM integration seams |

## 3. Architecture Boundary (mandatory)

Dependency direction:

```
ADI application logic
  → Simulation ports
    → Engine v3 browser adapter
      → window.INFINICUS.SIMULATION.*
```

Completed evidence return path:

```
Engine v3 result
  → Simulation result mapper
    → SIM-to-ADI handoff contract
      → ADI evidence intake
```

- ADI must not directly call arbitrary global functions; all access goes
  through injected typed ports.
- Simulation must NOT generate recommendations, approvals, approved actions,
  final business decisions, ADI scoring policy, or human-review decisions.
  Simulation produces scenarios, projected outcomes, uncertainty measures,
  risks, sensitivities and traceable evidence. ADI evaluates that evidence.

## 4. In-Scope Work

1. Complete the Simulation layer's public TypeScript API
   (`infinicus-platform/layers/simulation/`).
2. Define typed Simulation execution and completed-run read ports.
3. Implement a browser adapter around `window.INFINICUS.SIMULATION.*`
   behind a narrow injected global-interface boundary.
4. Replace the explicit "not connected" ADI-06/ADI-16 stub adapters in the
   supported browser bootstrap path (the ADI bundle bootstrap footer).
5. Complete the placeholder SIM-to-ADI handoff contract.
6. Add validation and mapping between Engine v3 results and the handoff
   contract.
7. Preserve correlation, tenant, business and Simulation-run identity.
8. Preserve input and result lineage.
9. Deterministic typed errors when the Engine v3 namespace or a required
   operation is unavailable.
10. Characterization, contract, adapter and integration tests.
11. Only the smallest necessary root `index.html` wiring change: because the
    namespace currently has no execution or read entry point, BUILD-07 MAY
    add a narrow namespaced facade (e.g. `INFINICUS.SIMULATION.executeScenario`
    / `INFINICUS.SIMULATION.getCompletedRun`) that delegates to existing
    engine functions without altering the Monte Carlo mathematics or existing
    UI flows.
12. Update architecture and integration documentation.

## 5. Out of Scope

BUILD-07 must NOT: rewrite the Monte Carlo mathematics; redesign Engine v3;
extract the entire root engine; change established Simulation outputs; add a
new database schema; add migrations; implement Database Stage 2F; implement a
remote Simulation service; introduce queues or distributed workers; implement
ADI scoring or recommendation logic; implement ABA, OM or CL work; begin
BUILD-08; perform broad TypeScript conversion; introduce a new frontend
framework; make unrelated UI changes.

## 6. Required Simulation Ports

Repository-aligned equivalents of (reuse existing canonical names/types where
they already exist — do not create duplicate identities merely to match these
illustrative names):

**ExecuteSimulationScenarioPort**
- accepts a validated Simulation execution request
- returns an accepted, running or completed Simulation run reference
- preserves correlation, tenant and business identity
- prevents accidental duplicate execution through the established idempotency
  mechanism

**ReadCompletedSimulationRunPort**
- retrieves a completed run by canonical identity
- rejects incomplete, failed, cancelled or cross-tenant runs
- returns typed Simulation evidence suitable for the SIM-to-ADI mapper

## 7. SIM-to-ADI Handoff Contract Requirements

Replace the placeholder in
`infinicus-platform/packages/handoff-contracts/src/sim-to-adi.ts` with a
strict, versioned contract following the CLAUDE.md §8 `LayerHandoff<TPayload>`
envelope conventions. The payload must represent, directly or through
canonical referenced types:

schema/contract version · handoff identity · correlation identity · tenant
identity · business identity · Simulation run identity · scenario identity
(when applicable) · engine/version reference · completed status · completion
timestamp · input snapshot or lineage reference · assumptions/parameters
version · horizon · iteration/run count · seed (when supported) · normalized
outcome metrics · uncertainty/percentile evidence · risk evidence ·
sensitivity evidence (when produced) · limitations/warnings · provenance ·
integrity/traceability metadata required by existing contracts.

Contract rules:

- Accepts only completed Simulation runs.
- Serializable; no DOM references, functions or global objects.
- Preserves enough provenance for ADI to explain its evidence.
- Contains no ADI recommendation or approval.
- Reuses existing shared identifiers and timestamp types.
- Runtime validation follows existing repository conventions (Zod per
  CLAUDE.md §4 where runtime validation is required).
- Rejection returns explicit reasons.
- Duplicate deliveries are idempotent where the existing handoff system
  supports acknowledgements or replay.

## 8. Engine v3 Adapter Requirements

The browser adapter must:

- access Engine v3 through a narrow injected global-interface boundary (no
  scattered `window` access in application code)
- verify the required namespace and operations exist before use
- translate typed requests into the existing Engine v3 invocation shape
- translate Engine v3 results into canonical Simulation results
- preserve established defaults and behaviour
- return deterministic typed errors
- support test doubles without a real browser
- not modify Monte Carlo calculations
- not silently fabricate unavailable metrics
- not interpret Simulation results as recommendations

## 9. ADI Integration Requirements

ADI-06 and ADI-16 consume Simulation only through injected typed ports.

- Remove the explicit "not connected" stubs from the supported browser
  bootstrap path; retain clear failure behaviour when no adapter is
  configured.
- No direct dependency from ADI domain logic to `window` or the DOM.
- No circular dependency between ADI and Simulation.
- No weakening of ADI input validation (ADI-06 `validateSimulationRun` and
  ADI-16 orchestration checks remain authoritative).
- Preserve correlation and evidence lineage.
- Tests must prove: ADI-16 can request a scenario; ADI-06 can read a
  completed run; incomplete/invalid runs are rejected; cross-tenant access is
  rejected when tenant context applies.

## 10. Characterization and Parity Requirements

Before changing wiring, capture the observable Engine v3 interface used by
BUILD-07 (namespace inventory as of freeze is in §2). Tests must demonstrate,
where supported by the existing API:

- the adapter calls the same Engine v3 operation
- request values pass without semantic alteration
- existing 500-run and 90-day behaviour is preserved
- the same seed reproduces results when Engine v3 supports seeding
- completed results map without silently changing numeric values
- percentile and probability values retain their original scale
- currency and unit metadata are not silently converted
- missing optional evidence remains explicitly absent
- adapter failures do not produce fake successful runs

These tests prove integration and behavioural parity — not statistical
validity of the Monte Carlo model.

## 11. Expected File Areas

Focused changes only; implementer must discover exact paths before editing:

- `infinicus-platform/layers/simulation/` (public API, ports, adapter, mapper)
- `infinicus-platform/packages/handoff-contracts/` (`sim-to-adi.ts`)
- ADI bootstrap/adapter composition (`ai-decision-intelligence/adi-bundle.js`
  bootstrap footer; keep block src files and bundle consistent)
- relevant shared types only when canonical types are missing
- root `index.html` — minimal composition/wiring only (§4.11)
- focused tests (monorepo Vitest for TS; root assert-based `.mjs` per layer
  conventions for browser-path tests)
- architecture and integration documentation
- Claude queue/report state after successful implementation

## 12. Validation Gates

BUILD-07 cannot be completed unless all applicable gates pass:

1. SIM-to-ADI contract type tests
2. SIM-to-ADI runtime-validation tests
3. Simulation port tests
4. Engine v3 browser-adapter tests
5. Completed-run mapping tests
6. ADI-06 integration tests
7. ADI-16 integration tests
8. Incomplete-run rejection tests
9. Missing-engine error tests
10. Identity and lineage preservation tests
11. Cross-tenant rejection tests where tenant context applies
12. Idempotency tests where supported
13. Engine v3 characterization/parity tests
14. Existing ADI regression tests (root: 25 block tests + bundle)
15. Existing Simulation regression behaviour (no Engine v3 output change)
16. Full repository tests
17. Typecheck
18. Lint
19. Build

The implementer must discover the actual commands from `package.json` and
workspace configuration (`pnpm lint` / `pnpm typecheck` / `pnpm build` at the
monorepo root; per-package Vitest filters; root-layer `node tests/*.mjs`).
No command may be fabricated.

## 13. Success Criteria

BUILD-07 is complete only when:

- Simulation has a typed public integration boundary.
- Engine v3 is reached through a narrow tested adapter.
- ADI-16 can request Simulation execution through the typed port.
- ADI-06 can retrieve a completed Simulation run through the typed port.
- The SIM-to-ADI handoff placeholder is replaced by a strict contract.
- Completed Simulation evidence can be mapped and delivered to ADI.
- Incomplete or invalid results are rejected.
- Identity, lineage and provenance are preserved.
- Existing Engine v3 behaviour is unchanged.
- All §12 gates pass (tests, typecheck, lint, build).
- No database migration is added.
- BUILD-08 is not started.
- The BUILD-07 completion report is written
  (`.claude/state/reports/BUILD-07-SIM-completion.md`).
- Queue and manifest state are updated only after validation.
