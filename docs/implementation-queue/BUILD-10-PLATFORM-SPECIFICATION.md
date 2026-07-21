# BUILD-10 SPECIFICATION — PLATFORM: Full Browser Platform Assembly, Orchestration, Wiring, and End-to-End Validation

- **Build ID:** BUILD-10
- **Layer:** PLATFORM
- **Predecessor:** BUILD-09 (DB-BI, completed `e14e0c4`)
- **Entry status:** pending
- **Exit status of this document:** ready (this specification, once frozen, moves BUILD-10 to `ready`)
- **Authored:** 2026-07-21
- **Frozen migration range referenced (read-only baseline):** `0001`–`0049`
- **Repository inspected at commit:** working tree on `claude/infinicus-engine-debug-3loqb4`, HEAD `e14e0c49da844f11b120705cd0eedbe5d4c2ef6a`

This specification is authoritative for BUILD-10. It supersedes any prior informal description of "platform assembly" in `00-IMPLEMENTATION-MANIFEST.md`, PR #10, or elsewhere. BUILD-10 implementation must follow this document exactly. Nothing in this document authorizes implementation now — this authoring task is specification-only.

---

## 1. PLATFORM ASSEMBLY OBJECTIVE

BUILD-10 exists to make the platform's current, real readiness state observable and to close exactly one confirmed wiring gap in the existing browser handoff chain — nothing more. Concretely, BUILD-10:

1. Adds one new browser-global orchestration file, `platform/platform-bootstrap.js`, loaded after all seven existing layer bundles.
2. Establishes one canonical namespace, `window.INFINICUS.PLATFORM`, that reports readiness of every layer using each layer's own existing diagnostic surface — it does not add diagnostic logic to any layer.
3. Verifies, at runtime, that every layer namespace required by the frozen architecture is present in the form it already exists today.
4. Records (does not re-implement) the current cross-layer handoff map exactly as it exists in `index.html` and in `packages/handoff-contracts/src/*.ts` today, distinguishing browser-wired handoffs from persistence-backed handoffs from unwired/placeholder handoffs.
5. Preserves every existing layer's authority boundary, source code, and behavior. BUILD-10 modifies exactly one existing file (`index.html`, one inserted line) and creates new files only.
6. Preserves Engine v3 behavior and Monte Carlo parity (500 runs, 90-day horizon) exactly as delivered by BUILD-07 — BUILD-10 does not touch `simulate()`, `monteCarlo()`, or the BUILD-07 facade.
7. Preserves all 180 existing root `.mjs` regression tests, the 106 monorepo ADI source tests, the 45 handoff-contracts tests, and the live database regression — all must remain green after BUILD-10.
8. Adds the minimum orchestration necessary to satisfy items 1–4: a bootstrap state machine, a capability registry, a diagnostics ring buffer, and idempotent initialization. It adds no new business logic to any of the nine layers.
9. Stops without implementing Stage 2E or later persistence, without completing any placeholder handoff-contract TypeScript file, and without starting BUILD-11.

---

## 2. EXACT EXISTING LAYER INVENTORY

Inspected directly from the repository (no filenames assumed). Nine architectural layers per `CLAUDE.md` §1; **Business Operations has no browser root-block layer** — it exists only as the frozen `business_operations` PostgreSQL schema (Stage 2C, migrations `0023`–`0036`) and is consumed by BI's persistence tier via `bo-to-bi.ts`. This is confirmed by the absence of a `business-operations/` directory at repository root (only `infinicus-platform/layers/business-operations/` exists, containing an empty scaffold `src/index.ts` placeholder with no `blocks/` subdirectory — not a browser layer).

| Layer | Source directory | Bundle file | Browser namespace | Init entry point | Blocks | Existing `.mjs` tests | Completion status |
|---|---|---|---|---|---|---|---|
| Data Acquisition (DA) | `data-acquisition/INFINICUS-DA-01…25-*/` | `data-acquisition/da-bundle.js` | `window.INFINICUS.DA` | self-executing IIFEs per block; `DA-01` installs `window.INFINICUS.DA.runtime` first | 25 | 26 | BUILD-08, completed |
| Business Operations (BO) | none (browser) | none (browser) | none (browser) | n/a — database/repository tier only (Stage 2C) | n/a | n/a | BUILD-09 persistence only; no browser layer exists or is planned by any frozen spec |
| Business Intelligence (BI) | `business-intelligence/INFINICUS-BI-01…25-*/` | `business-intelligence/bi-bundle.js` | `window.INFINICUS.BI` | self-executing IIFEs per block; `BI-01` installs `window.INFINICUS.BI.runtime` first | 25 | 26 | BUILD-02, completed |
| Business Digital Twin (DT) | `digital-twin/INFINICUS-DT-01…24-*/` | `digital-twin/dt-bundle.js` | `window.INFINICUS.DT` | self-executing IIFEs per block; `DT-01` installs `window.INFINICUS.DT.runtime` first | 24 (no DT-25) | 24 | BUILD-01, completed |
| Simulation (SIM) | none (browser) — Engine v3 core is `index.html` lines 1966–6069 (unchanged since before BUILD-07); facade is `index.html` lines 7178–7274 | none (browser; inline in `index.html`) | `window.INFINICUS.SIMULATION` | established synchronously by a non-deferred inline `<script>` during HTML parsing, before any deferred layer bundle executes | n/a (not block-structured) | 0 root `.mjs`; validated via `infinicus-platform/layers/simulation` Vitest suite and `ai-decision-intelligence/sim-integration-harness.mjs` | BUILD-07, completed |
| AI Decision Intelligence (ADI) | `ai-decision-intelligence/INFINICUS-ADI-01…25-*/` | `ai-decision-intelligence/adi-bundle.js` | `window.INFINICUS.ADI` | `adi-bundle.js`'s own trailing "ADI BOOTSTRAP" section: calls `blocks["ADI-01"].installGlobal(global)`, then `attachToADIRuntime` for `ADI-02`…`ADI-25` in order | 25 | 27 | BUILD-06 (blocks) + BUILD-07 (SIM ports), completed |
| Approved Business Action (ABA) | `approved-business-action/INFINICUS-ABA-01…25-*/` | `approved-business-action/aba-bundle.js` | `window.INFINICUS.ABA` | self-executing IIFEs per block; `ABA-01` installs `window.INFINICUS.ABA.runtime` first | 25 | 26 | BUILD-03, completed |
| Outcome Monitoring (OM) | `outcome-monitoring/INFINICUS-OM-01…25-*/` | `outcome-monitoring/om-bundle.js` | `window.INFINICUS.OM` | self-executing IIFEs per block; `OM-01` installs `window.INFINICUS.OM.runtime` first | 25 | 26 | BUILD-04, completed |
| Continuous Learning (CL) | `continuous-learning/INFINICUS-CL-01…25-*/` | `continuous-learning/cl-bundle.js` | `window.INFINICUS.CL` | self-executing IIFEs per block; `CL-01` installs `window.INFINICUS.CL.runtime` first | 25 | 25 | BUILD-05, completed |

Total existing root `.mjs` test files: **180** (verified by direct count: `find <7 layer dirs> -path "*/tests/*.mjs" | wc -l` = 180).

BUILD-01 through BUILD-05 predate the `.claude/state/reports/` and `docs/implementation-queue/BUILD-NN-*-SPECIFICATION.md` conventions: no dedicated specification file or completion report exists for them. Their inventory above is derived from direct source inspection, not from a report.

### Per-layer runtime object — exact method names (verified; not uniform across layers)

| Layer | Runtime object | Route-dispatch method | Generic self-diagnostic method | Master-integration block | Master-integration route(s) |
|---|---|---|---|---|---|
| DA | `window.INFINICUS.DA.runtime` | `invoke(name, input)` | `diagnose()` → `{layer,version,serviceCount,routeCount,sourceCount,stateCount,status}` | DA-25 → `window.INFINICUS.DA.masterIntegrationEngine` | `da.master.diagnose`, `da.master.assemble`, `da.master.deploy`, `da.master.rollback.record` |
| DT | `window.INFINICUS.DT.runtime` | `callRoute(...)` | `diagnostics()` → `{layer,version,blockCount,registries}` | none — DT has 24 blocks, no DT-25 | none |
| BI | `window.INFINICUS.BI.runtime` | `call(name, input)` | `diagnostics()` | BI-25 (registered service, not a separately named global) | `bi.master.diagnose`, `bi.master.readiness`, `bi.master.pipeline.run` |
| ABA | `window.INFINICUS.ABA.runtime` | `dispatch(name, input)` | none confirmed on base runtime | ABA-25 | `aba.master.diagnose`, `aba.master.readiness`, `aba.master.pipeline.run` |
| OM | `window.INFINICUS.OM.runtime` | `dispatch(name, input)` (`OM.routeRegistry.dispatch`) | none confirmed on base runtime | OM-25 | `om.master.diagnose`, `om.master.assemble`, `om.master.deploy`, `om.master.rollback.record` |
| CL | `window.INFINICUS.CL.runtime` | `invoke(name, input)` | none confirmed on base runtime | CL-25 | `cl.master.diagnose`, `cl.master.assemble`, `cl.master.deploy`, `cl.master.rollback.record` |
| ADI | `window.INFINICUS.ADI.runtime` | `dispatch(name, input)` | none confirmed on base runtime | ADI-25 → also directly reachable at `window.INFINICUS.ADI.blocks["ADI-25"]` | `adi.master.diagnose`, `adi.master.assert-ready`, `adi.master.deployment-plan` |

Every route/method above returns the shared result envelope `{ ok: boolean, data, error, meta }` (or `metadata`/`error:null` variants) — this envelope shape is the one fact verified as universal across every layer inspected. BUILD-10's readiness logic depends on `.ok` only, never on a layer-specific nested field name, because nested field names are confirmed non-uniform (e.g. `productionReady` on DA/BI/ABA/OM/CL, `status` on ADI, no equivalent field on DT).

---

## 3. CANONICAL BUNDLE LOADING ORDER

Frozen, from direct inspection of `index.html`.

### 3.1 Current script tags (lines 776–789, all `defer`, in this exact document order)

```html
<!-- Data Acquisition Layer — DA-01 through DA-25 -->
<script src="/data-acquisition/da-bundle.js" defer></script>
<!-- Business Digital Twin Layer — DT-01 through DT-24 -->
<script src="/digital-twin/dt-bundle.js" defer></script>
<!-- Business Intelligence Layer — BI-01 through BI-25 -->
<script src="/business-intelligence/bi-bundle.js" defer></script>
<!-- Approved Business Action Layer — ABA-01 through ABA-25 -->
<script src="/approved-business-action/aba-bundle.js" defer></script>
<!-- Outcome Monitoring Layer — OM-01 through OM-25 -->
<script src="/outcome-monitoring/om-bundle.js" defer></script>
<!-- Continuous Learning Layer — CL-01 through CL-25 -->
<script src="/continuous-learning/cl-bundle.js" defer></script>
<!-- AI Decision Intelligence Layer — ADI-01 through ADI-25 -->
<script src="/ai-decision-intelligence/adi-bundle.js" defer></script>
```

### 3.2 Simulation facade — not a bundle, executes earlier than the list above despite appearing later in the file

`window.INFINICUS.SIMULATION` is established by a **non-deferred, inline** `<script>` block at `index.html` lines 7098–7390 (the "LAYER INTEGRATION WIRE HOOKS" + "BUILD-07 — SIM execution/read facade" block). Because HTML parsing executes non-deferred inline scripts synchronously at their parse position, and defers all `defer` scripts until parsing is complete, **this inline block executes before any of the seven bundle scripts above run**, even though it is physically located later in the file. `window.INFINICUS.SIMULATION.executeScenario` and `.getCompletedRun` therefore already exist by the time any bundle's top-level code runs. This is the current, correct, working order; BUILD-10 does not change it.

`SIM_DAYS`, `PROFILES`, `simulate()`, and `monteCarlo()` (the Engine v3 core) are defined in the large non-deferred inline `<script>` at lines 1966–6069, which executes even earlier (also before all seven bundles, and before the SIM facade block, since it appears first in document order among non-deferred scripts).

### 3.3 New script tag required by BUILD-10 — exact insertion point

Insert exactly one new line immediately after line 789 (`<script src="/ai-decision-intelligence/adi-bundle.js" defer></script>`) and its preceding one-line HTML comment, matching the existing per-bundle comment convention exactly:

```html
<!-- Platform Assembly — orchestration and readiness (BUILD-10) -->
<script src="/platform/platform-bootstrap.js" defer></script>
```

This is the **only** permitted edit to `index.html`. No other line changes.

### 3.4 Frozen resulting execution order

1. (parse-time, synchronous, non-deferred) Engine v3 core — `SIM_DAYS`, `PROFILES`, `simulate`, `monteCarlo`, and all UI logic (lines 1966–6069).
2. (parse-time, synchronous, non-deferred) feedback-widget script (lines 6086–6157).
3. (parse-time, synchronous, non-deferred) DT wire-hook + feedback-star script (lines 6167–7096) — registers `DOMContentLoaded` listeners only; does not execute their bodies yet.
4. (parse-time, synchronous, non-deferred) LAYER INTEGRATION WIRE HOOKS + BUILD-07 SIM facade (lines 7098–7390) — establishes `window.INFINICUS.SIMULATION.*` fully; registers further `DOMContentLoaded` listeners.
5. (post-parse, deferred, in document order) `da-bundle.js` → `dt-bundle.js` → `bi-bundle.js` → `aba-bundle.js` → `om-bundle.js` → `cl-bundle.js` → `adi-bundle.js` (the last of which runs its own internal "ADI BOOTSTRAP" section synchronously as part of its own script execution).
6. (post-parse, deferred, new in BUILD-10) `platform/platform-bootstrap.js` — runs after all seven layer bundles have finished executing, and after `window.INFINICUS.SIMULATION` already exists (step 4).
7. `DOMContentLoaded` fires — triggering the listeners registered in steps 3–4 (DT/BI/ABA/OM/CL status-panel updates and publisher wiring).

### 3.5 Rules

- All seven existing bundle scripts remain `defer`. BUILD-10 does not change their `defer`/`async`/inline status.
- `platform/platform-bootstrap.js` is `defer`, placed after all seven bundles, so it never races their initialization.
- `platform/platform-bootstrap.js` executes synchronously once invoked (no top-level `await`, no promise chain required for the readiness pass); the DOM is available (parsing is complete for all deferred scripts) but `DOMContentLoaded` has not necessarily fired yet — `platform-bootstrap.js` must not depend on `DOMContentLoaded`-triggered wiring (step 7) having already run, and must not itself require `document.readyState === 'complete'`.
- If a required bundle is missing (its `<script>` tag absent or failed to load), the corresponding `window.INFINICUS.<LAYER>` namespace is `undefined` when `platform-bootstrap.js` runs. This is not a fatal error for bootstrap itself — it is recorded as a `missing` layer in `PlatformStatus` and drives the `degraded`/`failed` state per §6.
- Initialization is synchronous. `PlatformBootstrap.initialize()` returns a `PlatformInitializationResult` before returning control to the caller; it performs no network requests and no `fetch`/`XMLHttpRequest` calls.

---

## 4. PLATFORM NAMESPACE CONTRACT

`window.INFINICUS.PLATFORM` — new, additive namespace. Does not exist today (verified: zero references to `INFINICUS.PLATFORM` anywhere in `index.html` or any bundle). No existing namespace (`DA`, `DT`, `BI`, `ABA`, `OM`, `CL`, `ADI`, `SIMULATION`) is renamed, wrapped, or proxied.

```js
window.INFINICUS.PLATFORM = {
  version: "1.0.0",                    // platform version, frozen per §15
  bootstrap: PlatformBootstrap,         // the object described in §5, frozen
  status: PlatformStatus,               // live, returned by bootstrap.getStatus() — same object reference each call while ready; a new object is produced only on re-initialization
  capabilities: PlatformCapability[],   // returned by bootstrap.getCapabilities(); 9 entries, one per architectural layer (§14)
  diagnostics: PlatformDiagnostics,     // returned by bootstrap.getDiagnostics()
  handoffs: HandoffRegistration[]       // returned by bootstrap.getHandoffs(); 9 entries, one per boundary (§8)
};
```

- **Public API:** `initialize()`, `getStatus()`, `isReady()`, `getCapabilities()`, `getDiagnostics()`, `getHandoffs()`, `getVersionManifest()`. All defined in §5/§21.
- **Internal API:** any function not attached to `window.INFINICUS.PLATFORM` (e.g. per-layer readiness-check closures) is internal and not part of this contract; BUILD-10 tests must not depend on internals not listed here.
- **Required namespace checks performed by `initialize()`:** presence of `window.INFINICUS.DA`, `.DT`, `.BI`, `.ABA`, `.OM`, `.CL`, `.ADI`, `.SIMULATION`, each with the exact sub-shape verified in §2 (`.runtime` object for the seven block-structured layers; `.executeScenario`/`.getCompletedRun`/`.capabilities` functions/object for `SIMULATION`). Business Operations has no namespace check — it is out of the browser namespace contract entirely (§2).
- **Readiness state:** exposed at `window.INFINICUS.PLATFORM.status.state`, one of the six values in §6.
- **Error state:** exposed at `window.INFINICUS.PLATFORM.status.errors` (array of `PlatformError`, §21), always present (empty array when none).
- **Capability registry:** `window.INFINICUS.PLATFORM.capabilities`, §14.
- **Diagnostics surface:** `window.INFINICUS.PLATFORM.diagnostics`, §13, optional to consume, always present.

---

## 5. PLATFORM BOOTSTRAP

**File:** `platform/platform-bootstrap.js` (new directory `platform/` at repository root, sibling to `data-acquisition/`, `digital-twin/`, etc. — matching the exact repository convention of one top-level directory per layer bundle. No existing file of this name or an equivalent exists anywhere in the repository — verified by `find . -iname "*bootstrap*" -o -iname "*platform-bundle*"` returning no root-level match before this build).

**Format:** browser-global IIFE, matching every existing bundle's `(function(global){ "use strict"; ... })(window);` pattern. Not TypeScript, not a build artifact — authored directly as the loaded file, exactly like `da-bundle.js` and the other six bundles (none of which are compiled from a build step at load time; they are pre-built and committed as-is).

### 5.1 Responsibilities (frozen)

1. Detect the eight required namespaces (`DA`, `DT`, `BI`, `ABA`, `OM`, `CL`, `ADI`, `SIMULATION`) using the exact presence checks in §4.
2. For each of the seven block-structured layers, invoke that layer's own existing readiness surface exactly as tabulated in §2 (never re-implementing per-layer diagnostic logic).
3. For `SIMULATION`, verify `typeof executeScenario === 'function'`, `typeof getCompletedRun === 'function'`, `capabilities.runs === 500`, `capabilities.horizonDays === 90`.
4. Compute and set `window.INFINICUS.PLATFORM.status` per the state machine in §6.
5. Populate `window.INFINICUS.PLATFORM.capabilities` (§14) from the per-layer readiness results — no new capability logic beyond wrapping the existing per-layer answer.
6. Populate `window.INFINICUS.PLATFORM.handoffs` (§8) from a frozen, static `HANDOFF_MAP` constant inside `platform-bootstrap.js` describing the nine boundaries exactly as verified in this document — this is descriptive metadata, not a live introspection of each layer's internal publisher-registration state (no layer bundle exposes an API to list its registered publishers, so none is invented).
7. Record every step as a `PlatformDiagnosticEvent` (§13) in a bounded ring buffer (last 50 events).
8. Prevent duplicate initialization (§16): a second call to `initialize()` after a `ready`/`degraded`/`failed` result returns the existing `PlatformInitializationResult` without re-running namespace detection or re-invoking any layer's diagnostic route a second time.
9. Support safe re-entry: `initialize({ force: true })` explicitly re-runs the full check (used only by tests and by manual recovery from `failed`); without `force: true`, a second call is a no-op that returns cached results.
10. Never mutate `window.INFINICUS.DA`, `.DT`, `.BI`, `.ABA`, `.OM`, `.CL`, `.ADI`, or `.SIMULATION`. `platform-bootstrap.js` only reads from these namespaces and writes to `window.INFINICUS.PLATFORM`.

### 5.2 Public methods — exact signatures

```js
PlatformBootstrap.initialize(options)   // options: { force?: boolean } = {}; returns PlatformInitializationResult
PlatformBootstrap.getStatus()           // returns PlatformStatus (§21); throws nothing, returns not_started status if initialize() never called
PlatformBootstrap.isReady()             // returns boolean; true iff status.state === 'ready'
PlatformBootstrap.getCapabilities()     // returns PlatformCapability[] (§14); empty array before first initialize()
PlatformBootstrap.getDiagnostics()      // returns PlatformDiagnostics (§13)
PlatformBootstrap.getHandoffs()         // returns HandoffRegistration[] (§8); empty array before first initialize()
PlatformBootstrap.getVersionManifest()  // returns PlatformVersionManifest (§15)
```

These six method names (`initialize`, `getStatus`, `isReady`, `getCapabilities`, `getDiagnostics`, plus the two added for this platform's own needs, `getHandoffs` and `getVersionManifest`) match the names given in the mandatory-scope instructions exactly, aligned to the codebase's existing convention of short, verb-first method names (`registerService`, `getService`, `listServices`, etc.).

---

## 6. INITIALIZATION STATE MACHINE

States (frozen, exactly six): `not_started`, `validating`, `initializing`, `ready`, `degraded`, `failed`.

### 6.1 Transitions

```
not_started  --initialize() called-->            validating
validating   --namespace detection complete-->    initializing
initializing --all 8 namespaces ready-->          ready
initializing --1..7 namespaces ready, 1+ missing/not-ready, 0 fatal-->  degraded
initializing --0 namespaces ready, or a fatal PlatformError raised-->   failed
ready        --initialize({force:true}) called--> validating   (re-entry)
degraded     --initialize({force:true}) called--> validating   (re-entry)
failed       --initialize({force:true}) called--> validating   (re-entry)
```

`ready`, `degraded`, and `failed` are terminal for a given `initialize()` call — no automatic transition out of them without an explicit `force: true` re-entry call. There is no automatic retry.

### 6.2 Definitions

- **Required layers** for `ready`: DA, DT, BI, ABA, OM, CL, ADI, SIMULATION (all 8 — Business Operations is never checked, per §2). All 8 must independently report `ok === true` from their respective check in §5.1 step 2/3.
- **Optional layers:** none. Every one of the 8 checked namespaces is required; there is no partial-required-layer distinction in this build, because the architecture inventory in §2 lists all 8 as already completed and frozen. A future build may introduce optional layers; BUILD-10 does not.
- **Degraded:** 1–7 of the 8 required layers are ready; the remaining layers are `missing` (namespace absent) or `not_ready` (namespace present, but its own diagnostic call returned `ok: false`). `degraded` is not an error state for the calling page — the page continues to function for whichever layers are ready.
- **Failed:** zero of the 8 required layers are ready, OR an uncaught exception was thrown while invoking a layer's own diagnostic route (caught by `platform-bootstrap.js` and converted into a `PlatformError` with `fatal: true`).
- **Duplicate initialization:** calling `initialize()` (no `force`) while `state !== 'not_started'` returns the last `PlatformInitializationResult` unchanged and appends one `platform_bootstrap_started`/`platform_ready` (or current-state-equivalent) diagnostic event noting `"duplicate call ignored"` — it does not re-run detection.
- **Partial failure:** a single layer throwing during its diagnostic call does not abort checks for the remaining layers — each layer's check is wrapped individually; one layer's exception can only ever downgrade that one layer's status, contributing to `degraded` (if others are ready) or `failed` (if none are).
- **Error persistence:** every `PlatformError` recorded during a given `initialize()` call remains in `status.errors` until the next successful `force: true` re-entry clears and rebuilds the array from scratch.
- **Retry:** none automatic. `platform-bootstrap.js` does not set timers, does not poll, and does not retry a failed layer check within a single `initialize()` call.

---

## 7. LAYER AUTHORITY BOUNDARIES

Frozen, matching `CLAUDE.md` §1 and the architectural roles already implemented:

- **DA** acquires and prepares data (source registration through publication handoff). Does not analyze, decide, or approve.
- **BO** (persistence-only) represents operational business state and activity (Stage 2C). BUILD-10 does not touch BO.
- **BI** calculates analytical intelligence (metrics, KPIs, findings, trends, forecasts, anomalies, benchmarks, risk) from validated inputs. Does not decide or approve.
- **DT** represents the business digital state (entities, relationships, twin snapshots). Does not simulate or decide.
- **SIM** generates simulation outcomes and scenarios (Engine v3: `simulate`/`monteCarlo`, 500 runs, 90-day horizon). Evidence only.
- **ADI** interprets evidence (from DT, SIM, and its own registries) and produces decision intelligence (alternatives, scoring, recommendations). Does not execute business actions.
- **ABA** governs approved execution (intake, approval workflow, scoped execution, rollback). Does not originate recommendations and does not rewrite simulation results.
- **OM** monitors real outcomes against approved-action contracts. Does not mutate historical evidence.
- **CL** learns from outcomes and produces updated intelligence for upstream layers. Does not silently rewrite frozen historical decisions — CL-24's own name ("Updated Intelligence Publication Handoff") and its append/publish-only event pattern (`cl.updated_intelligence.publish.completed`) confirm this is additive, not a mutation of history.

### 7.1 Explicit prohibitions enforced by this specification (not by new runtime code — by scope discipline)

- BUILD-10 does not grant Simulation recommendation authority: `platform-bootstrap.js` never calls `SIMULATION.*` with anything beyond the existing `executeScenario`/`getCompletedRun` read/execute pair, and never writes a decision, recommendation, or approval value into any namespace.
- BUILD-10 does not grant BI approval authority: BI's capability entry (§14) is read-only reporting; `platform-bootstrap.js` never calls any BI mutation route.
- BUILD-10 does not grant ADI execution authority: ADI's capability entry reports readiness only; `platform-bootstrap.js` never calls `adi.*` routes that would generate or dispatch a decision.
- BUILD-10 does not let ABA rewrite simulation results: no code path in `platform-bootstrap.js` writes into `SIMULATION._completedRuns` or any SIM-owned store.
- BUILD-10 does not let OM mutate historical evidence: `platform-bootstrap.js` never calls any OM write route.
- BUILD-10 does not let CL silently rewrite frozen historical decisions: `platform-bootstrap.js` never calls any CL write route; it only reads `CL.runtime.diagnostics()`/`invoke('cl.master.diagnose', {})`.

---

## 8. CROSS-LAYER HANDOFF MAP

Two distinct, currently disconnected handoff mechanisms exist in the repository today. BUILD-10 documents both, exactly as they are, and does not merge, complete, or bridge them.

### 8.1 TypeScript persistence-backed contracts — `infinicus-platform/packages/handoff-contracts/src/`

| File | Boundary | Status | Lines |
|---|---|---|---|
| `dal-to-bo.ts` | DA → BO | **Complete**, versioned `1.0.0` (BUILD-08) | 185 |
| `bo-to-bi.ts` | BO → BI | **Complete**, versioned `1.0.0` (BUILD-09) | 145 |
| `sim-to-adi.ts` | SIM → ADI | **Complete**, versioned `1.0.0` (BUILD-07) | 244 |
| `bi-to-dt.ts` | BI → DT | **Placeholder** — 6 lines, `// TODO: add fields`, no exported type beyond the stub | 6 |
| `dt-to-sim.ts` | DT → SIM | **Placeholder** — 6 lines | 6 |
| `adi-to-aba.ts` | ADI → ABA | **Placeholder** — 6 lines | 6 |
| `aba-to-om.ts` | ABA → OM | **Placeholder** — 6 lines | 6 |
| `om-to-cl.ts` | OM → CL | **Placeholder** — 6 lines | 6 |
| `cl-feedback.ts` | CL → (upstream) | **Placeholder** — 6 lines | 6 |

These are Node/TypeScript files consumed by `infinicus-platform/packages/database` and tested under `pnpm --filter @infinicus/handoff-contracts test`. **`index.html` does not import or execute any of these files** — the browser bundles are plain ES2020 IIFEs with no build step at load time, and none of the nine `.ts` files is transpiled into any bundle. BUILD-10 does not complete the six placeholder files — doing so is new layer-boundary business logic (payload shape design, validation rules), out of scope per §1 item 8 and explicitly listed in §26.

### 8.2 Browser wire hooks — `index.html`, informal, not contract-validated

| Producer | Mechanism | Target key / event name | Consumer function | Wired today? |
|---|---|---|---|---|
| BI-24 (`window.INFINICUS.BI.digitalTwinPublicationEngine`) | `registerPublisher('SIMULATION_ENGINE', fn)` | `SIMULATION_ENGINE` | `window.INFINICUS.SIMULATION.receiveBIPackage` | **Yes** — wired in `index.html` lines 7300–7306 |
| ABA-24 (`window.INFINICUS.ABA.outcomeMonitoringPublicationEngine`) | `registerPublisher('OUTCOME_MONITORING', fn)` | `OUTCOME_MONITORING` | `window.INFINICUS.SIMULATION.receiveABAContract` | **Yes** — wired in `index.html` lines 7327–7333 |
| OM-24 (`window.INFINICUS.OM.continuousLearningPublicationEngine`) | `registerPublisher('CONTINUOUS_LEARNING', fn)` | `CONTINUOUS_LEARNING` | `window.INFINICUS.SIMULATION.receiveOMPackage` | **Yes** — wired in `index.html` lines 7354–7359 |
| CL-24 | event-bus: `rt.on('cl.updated_intelligence.publish.completed', fn)` | (event name, not a target key) | `window.INFINICUS.SIMULATION.receiveCLIntelligence` | **Yes** — wired in `index.html` lines 7381–7386 |
| DT-24 (`window.INFINICUS.DT.simulationPackagePublicationEngine`) | `publish()` writes to its own IndexedDB store and emits `dt.simulation_package.published` on the DT runtime event bus only | n/a | `window.INFINICUS.SIMULATION.receiveDigitalTwinPackage` exists as a function but nothing currently calls it | **No** — confirmed absent: `grep -n "registerPublisher" digital-twin/dt-bundle.js` and `grep -n "registerPublisher" index.html` show no DT-24 wiring anywhere |
| ADI-24 | in-memory push into `window.INFINICUS.ADI.handoffOutbox` array only (`attachOptions["ADI-24"].publisher.publish`, `ai-decision-intelligence/adi-bundle.js`) | n/a | none — nothing reads `handoffOutbox` | **No** — no consumer exists anywhere in the repository |
| DA-24 | internal chain to DA-25 only (`g.INFINICUS.DA.dataPublicationHandoffEngine`) | n/a | n/a — DA→BO is persistence-only via `dal-to-bo.ts` at the database tier, not a browser handoff | **N/A** — by design, no browser consumer exists for this boundary |
| SIM → ADI | ADI's own typed port adapters (`ADI.simulationPorts.executeScenario` / `.readCompletedRun`, `ai-decision-intelligence/adi-bundle.js` lines 3901–3971) call `window.INFINICUS.SIMULATION.executeScenario` / `.getCompletedRun` directly | n/a | ADI-06 / ADI-16 | **Yes** — the only handoff in the browser that is genuinely bidirectional and functionally exercised (BUILD-07) |

**Decision, frozen:** BUILD-10 does not add or modify any `registerPublisher`/event-bus wiring in any layer bundle or in `index.html` beyond the one new script tag in §3.3. The DT-24→SIMULATION gap and the ADI-24 dead-end are real, pre-existing conditions of the frozen layers; closing them requires either modifying a completed layer (prohibited by "do not rewrite any completed layer") or adding new cross-layer data-shape logic (business logic, prohibited by §1 item 8). BUILD-10's `HandoffRegistration` entries (§8.3) report these two boundaries as `mechanism: "not_wired"` truthfully, rather than silently wiring them.

### 8.3 Frozen `HandoffRegistration` records (9 entries, `platform-bootstrap.js` static `HANDOFF_MAP`)

| # | producerLayer | consumerLayer | mechanism | contractBacked | contractFile | status |
|---|---|---|---|---|---|---|
| 1 | DA | BO | persistence (`dal-to-bo.ts`) | true | `dal-to-bo.ts` | active (persistence tier only; not browser-observable) |
| 2 | BO | BI | persistence (`bo-to-bi.ts`) | true | `bo-to-bi.ts` | active (persistence tier only; not browser-observable) |
| 3 | BI | DT | none | false | `bi-to-dt.ts` (placeholder) | not_wired |
| 4 | DT | SIM | none | false | `dt-to-sim.ts` (placeholder) | not_wired |
| 5 | SIM | ADI | direct-port (`ADI.simulationPorts`) | true | `sim-to-adi.ts` | active |
| 6 | ADI | ABA | in-memory outbox, no consumer | false | `adi-to-aba.ts` (placeholder) | not_wired |
| 7 | ABA | OM | registerPublisher | false | `aba-to-om.ts` (placeholder) | active (browser-wired, not contract-validated) |
| 8 | OM | CL | registerPublisher | false | `om-to-cl.ts` (placeholder) | active (browser-wired, not contract-validated) |
| 9 | CL | (upstream feedback) | event-bus | false | `cl-feedback.ts` (placeholder) | active (browser-wired, not contract-validated) |

Additionally recorded for completeness (not one of the 9 architectural boundaries above, but the one functioning browser producer→consumer pair BI→SIMULATION):

| producerLayer | consumerLayer | mechanism | contractBacked | status |
|---|---|---|---|---|
| BI | SIMULATION (facade, not architecturally "DT") | registerPublisher | false | active (browser-wired, not contract-validated; note BI-24's own name targets "Business Digital Twin" but its wired target key is `SIMULATION_ENGINE` — a naming mismatch that predates BUILD-10 and is reported, not corrected) |

---

## 9. END-TO-END PLATFORM FLOW

Frozen flow: `DA → BO → BI → DT → SIM → ADI → ABA → OM → CL`.

| Transition | Required inputs | Validation gate | Output | Currently |
|---|---|---|---|---|
| DA → BO | DA-24 publication handoff record | `dal-to-bo.ts` (contract-level, DB only) | `business_operations` rows (Stage 2C) | **persistence-only, fully implemented at the database tier**; no browser observability |
| BO → BI | BO publication package | `bo-to-bi.ts` (contract-level, DB only) | `business_intelligence` rows (Stage 2D) | **persistence-only, fully implemented at the database tier**; no browser observability |
| BI → DT | none in browser (contract is a placeholder) | none | none | **not implemented** — browser-only demo receiver exists (`receiveBIPackage`) but targets `SIMULATION_ENGINE`, not DT; no BI→DT path exists anywhere |
| DT → SIM | DT-24 publication (`simulationPackagePublicationEngine.publish()`) | none automatic | `window.INFINICUS.SIMULATION.receiveDigitalTwinPackage` exists but is never invoked | **browser-only, unwired** (§8.2) |
| SIM → ADI | a completed `SIMULATION.executeScenario`/`getCompletedRun` result | `sim-to-adi.ts` semantics enforced inline by ADI's port adapters (tenant/business boundary check, required-parameter check) | `SimulationRun` consumed by ADI-06/ADI-16 | **adapter-based, fully functional in the browser** (BUILD-07) |
| ADI → ABA | ADI-24 decision package | none | pushed into `ADI.handoffOutbox` only | **mocked** — no consumer reads the outbox; ABA is never actually invoked with a real ADI decision in the browser today |
| ABA → OM | ABA-24 outcome-monitoring contract | none | `SIMULATION.receiveABAContract` (demo indicator only) | **browser-only, demo-level** — updates a status panel; does not feed OM's actual monitoring engine |
| OM → CL | OM-24 learning package | none | `SIMULATION.receiveOMPackage` (demo indicator only) | **browser-only, demo-level** |
| CL → (upstream) | CL-24 updated intelligence | none | `SIMULATION.receiveCLIntelligence` (demo indicator only) | **browser-only, demo-level** |

**Stop condition for BUILD-10's own validation (§22.D):** BUILD-10's end-to-end tests validate readiness and the SIM↔ADI functional pair to the limits above — they must not assert that DA→BO→BI→DT→SIM→ADI→ABA→OM→CL forms one working browser pipeline, because it does not. Any test asserting a full working pipeline beyond what this table marks "fully implemented" or "adapter-based, fully functional" is a specification violation.

---

## 10. DATA AND STATE OWNERSHIP

| State | Owner | Mutability | Storage |
|---|---|---|---|
| Acquired data | DA (per-block IndexedDB stores, e.g. `INFINICUS_DA_02`) | append-only records, mutable "current state" pointers | browser IndexedDB, one DB per block |
| Normalized business data (BO) | `business_operations` schema | append-only + mutable per Stage 2C rules | PostgreSQL (server), not browser |
| Analytical metrics/findings (BI) | `business_intelligence` schema (Stage 2D) + BI blocks' own IndexedDB stores in-browser | append-only (Stage 2D), demo-mutable in-browser | PostgreSQL (persistence) / IndexedDB (browser demo) — **two independent copies, not synchronized**, confirmed by the absence of any browser→database call in any bundle |
| Digital twin snapshots | DT blocks' own IndexedDB stores | versioned, append-only history per DT-22 | browser IndexedDB |
| Simulation inputs/outputs | `window.INFINICUS.SIMULATION._completedRuns` / `._runsByIdempotencyKey` | append-only within a page session | in-memory (`window` object) — **lost on page reload**, never persisted |
| ADI decisions | ADI runtime service registry state | in-memory | browser memory only |
| Approval records | ABA blocks' own IndexedDB stores | append-only per ABA-08 evidence pattern | browser IndexedDB |
| Action execution state | ABA blocks' own IndexedDB stores | mutable lifecycle per ABA-04 | browser IndexedDB |
| Monitoring observations | OM blocks' own IndexedDB stores | append-only | browser IndexedDB |
| Learning records | CL blocks' own IndexedDB stores | append-only | browser IndexedDB |
| Platform readiness/diagnostics (new, BUILD-10) | `window.INFINICUS.PLATFORM` | fully mutable, recomputed on every `initialize()` call | in-memory (`window` object) only — never IndexedDB, never `localStorage`, never sent to any server |

**Rules enforced by BUILD-10:**
- `platform-bootstrap.js` introduces no new IndexedDB database, no new `localStorage` key, and no new network call. It is purely an in-memory reader of existing global state.
- Reset behavior: reloading the page resets `window.INFINICUS.PLATFORM` to `not_started`; there is no persisted platform state across reloads (matching `SIMULATION`'s existing session-only `_completedRuns` behavior).
- Stale-data behavior: `platform-bootstrap.js` never caches a layer's readiness beyond a single `initialize()` call; calling `initialize({force:true})` always re-reads current namespace state, never a stale cached value.
- Cross-layer mutation prohibition: `platform-bootstrap.js` never writes into `DA`, `DT`, `BI`, `ABA`, `OM`, `CL`, `ADI`, or `SIMULATION` namespaces (§5.1 item 10, §7.1).

---

## 11. ENGINE v3 COMPATIBILITY

BUILD-10 preserves, unmodified:

- `simulate()` and `monteCarlo()` (`index.html` lines 2671–2799 region) — zero lines touched.
- 500-run Monte Carlo execution — enforced by `SIMULATION.capabilities.runs === 500` (frozen constant since BUILD-07), re-asserted by a BUILD-10 test (§22.E) that reads this value and fails if it is ever anything other than `500`.
- 90-day simulation horizon — enforced by `SIMULATION.capabilities.horizonDays === 90` (`SIM_DAYS` constant), same re-assertion pattern.
- Existing SIM-to-ADI parity — `ADI.simulationPorts.executeScenario`/`.readCompletedRun` (`ai-decision-intelligence/adi-bundle.js` lines 3901–3971) are not modified by BUILD-10.
- Existing public browser APIs — no existing `window.INFINICUS.*` method signature changes.
- Existing root-block behavior — no block source file under any of the seven layer directories is modified.
- Existing test vectors — all 180 root `.mjs` tests, all 106 monorepo ADI source tests, and the 45 handoff-contracts tests must produce identical pass/fail results before and after BUILD-10.
- Existing bundle outputs — none of the seven `*-bundle.js` files is regenerated or modified by BUILD-10; only `index.html` (one inserted script tag) and new files are touched.

**Exact compatibility checks (executed by BUILD-10 tests, §22.E):**
1. `sha256sum` of all seven existing bundle files unchanged before/after.
2. `git diff` on `index.html` shows exactly 2 inserted lines (one comment, one script tag) and 0 deletions.
3. `window.INFINICUS.SIMULATION.capabilities.runs === 500` and `.horizonDays === 90` (read via the VM-harness technique already established by `ai-decision-intelligence/sim-integration-harness.mjs`).
4. `window.INFINICUS.SIMULATION.engineVersion === 'infinicus-engine-v3'` unchanged.

---

## 12. ERROR ISOLATION

| Condition | Fatal? | Behavior |
|---|---|---|
| Missing bundle (namespace `undefined`) | No | Layer marked `missing` in `PlatformStatus`; contributes to `degraded` or `failed` per §6.2; a `platform_layer_failed` diagnostic event is recorded with `code: "PLATFORM_LAYER_NAMESPACE_MISSING"` |
| Missing namespace sub-object (e.g. `.runtime` absent though top-level namespace present) | No | Same as above, `code: "PLATFORM_LAYER_RUNTIME_MISSING"` |
| Incompatible version (a future layer reports a `version` outside the accepted range, §15) | No | Layer marked `not_ready`; `code: "PLATFORM_LAYER_VERSION_INCOMPATIBLE"` |
| Invalid public API (expected method not a function) | No | Layer marked `not_ready`; `code: "PLATFORM_LAYER_API_INVALID"` |
| Initialization failure (uncaught exception inside `initialize()` itself, outside any single layer check) | **Yes** | `state` forced to `failed`; `code: "PLATFORM_BOOTSTRAP_THREW"`, `fatal: true` |
| Handoff validation failure (a `HandoffRegistration` cannot be constructed because its static map entry is malformed — defensive only, cannot occur with the frozen map in §8.3) | **Yes** | same as above, `code: "PLATFORM_HANDOFF_MAP_INVALID"` |
| Simulation failure (a layer's own diagnostic call for `SIMULATION` throws) | No | `SIMULATION` capability marked `not_ready`; `code: "PLATFORM_SIMULATION_CHECK_FAILED"` |
| ADI failure (ADI's diagnose route returns `ok:false` or throws) | No | ADI capability marked `not_ready`/`degraded`; `code: "PLATFORM_LAYER_DIAGNOSTIC_FAILED"` |
| Storage failure (defensive: no storage is used by `platform-bootstrap.js`, so this cannot occur; retained as a typed error for forward-compatibility) | No | `code: "PLATFORM_STORAGE_UNAVAILABLE"`, never raised by this build's own code |
| Browser API unavailability (`structuredClone`, `crypto.randomUUID` — already used elsewhere in the codebase, e.g. DA/DT bundles) | No | Falls back the same way existing bundles already fall back (`Date.now()+Math.random()` id fallback, matching `data-acquisition/da-bundle.js` line 9's `createId` pattern exactly) |
| Malformed runtime state (a layer's diagnostic call returns a non-object) | No | Layer marked `not_ready`; `code: "PLATFORM_LAYER_RESPONSE_MALFORMED"` |

**Rules:**
- Exactly one condition is fatal at the bootstrap level: an uncaught exception in `initialize()`'s own control flow (not inside a per-layer check, which is always wrapped in `try/catch`). All nine per-layer/per-condition checks in the table are individually try/caught and downgrade only that layer.
- Degraded mode is the default outcome of any non-fatal condition when at least one required layer is ready; it is not itself an error to the calling page.
- User-visible error surface: none added by BUILD-10 to the existing UI. `window.INFINICUS.PLATFORM.status` is queryable by any future UI code but BUILD-10 adds no new DOM elements, toasts, or panels (§18).
- Diagnostics: every condition above is recorded via `getDiagnostics()` (§13).
- Logging: `console.warn` only for `degraded`, `console.error` only for `failed` — matching the existing convention in `adi-bundle.js`'s ADI BOOTSTRAP section (`console.warn("[INFINICUS.ADI] attach failed for " + id, ...)`) and `da-bundle.js`'s BOOTSTRAP GUARD (`console.error("[INFINICUS.DA] DA-01 runtime failed to initialize...")`). BUILD-10 uses the prefix `[INFINICUS.PLATFORM]`.
- Layer isolation: one layer's failure never throws out of `initialize()` — verified by §22.F tests.
- Recovery: `initialize({force:true})`, §6.
- Prevention of silent failure: every non-`ready` state has at least one recorded `PlatformError` explaining why.

---

## 13. OBSERVABILITY

`window.INFINICUS.PLATFORM.diagnostics` = `PlatformDiagnostics` (§21), a bounded ring buffer of the last 50 `PlatformDiagnosticEvent` entries.

**Structured event names emitted (subset of the mandatory list that applies to BUILD-10's actual scope; events describing layer-internal business actions — `simulation_started`, `simulation_completed`, `adi_decision_generated`, `approved_action_recorded`, `outcome_observed`, `learning_cycle_completed` — are NOT emitted by `platform-bootstrap.js`, because BUILD-10 never triggers those actions; emitting them would misrepresent activity that did not happen):**

| Event name | Emitted when |
|---|---|
| `platform_bootstrap_started` | first line of `initialize()` |
| `platform_dependency_validated` | once per one of the 8 required namespaces, pass or fail |
| `platform_layer_initializing` | before invoking a layer's own diagnostic route |
| `platform_layer_ready` | a layer's diagnostic call returned `ok: true` |
| `platform_layer_failed` | a layer's diagnostic call returned `ok: false` or threw |
| `platform_ready` | final state computed as `ready` |
| `platform_degraded` | final state computed as `degraded` |
| `platform_failed` | final state computed as `failed` |
| `handoff_dispatched` | reserved for future use; not emitted by BUILD-10 (no handoff is ever dispatched by `platform-bootstrap.js` — it only records the static map, §8.3) |
| `handoff_accepted` | one per `HandoffRegistration` entry with `status: "active"`, emitted once during `initialize()` while building `window.INFINICUS.PLATFORM.handoffs` |
| `handoff_rejected` | one per `HandoffRegistration` entry with `status: "not_wired"`, emitted once during `initialize()` |

**Event shape:**

```js
{
  event: "platform_layer_ready",        // one of the names above
  severity: "info" | "warn" | "error",  // info for *_started/*_validated/*_ready/*_accepted; warn for degraded/*_rejected; error for *_failed
  layerId: "DA" | null,                 // null for platform-scoped events
  correlationId: string,                // one per initialize() call, shared by all events from that call — createId-style, matching existing "prefix_random" convention (e.g. "platform_init_<random>")
  occurredAt: string,                   // ISO 8601, new Date().toISOString()
  message: string,                      // short, human-readable, no secrets
  payloadSummary: object | null         // redacted summary only, see below — never the full response payload
}
```

**Rules:**
- Logger/diagnostics API: `getDiagnostics()` only. No external logging service is called. No `fetch`/`XMLHttpRequest`.
- Severity levels: exactly the three above.
- Correlation identifiers: one `correlationId` per `initialize()` call, present on every event from that call.
- Timestamps: ISO 8601 via `new Date().toISOString()`, matching every existing bundle's convention.
- Payload redaction: `payloadSummary` never includes the full `data` field from a layer's diagnostic response — only `{ok, hasData: boolean}` plus, where the layer's response included a `status` or `productionReady` field (verified layer-specific in §2's table), that single boolean/string value. No business data, no evidence, no decision payloads are ever placed in a diagnostic event.
- No secrets or credentials: `platform-bootstrap.js` never reads or stores any credential — it has no access to any credential in the first place (none of the 8 checked namespaces expose credentials in their diagnostic responses).
- Bounded diagnostic history: ring buffer capped at 50 entries; the 51st event evicts the oldest.
- Testability: `getDiagnostics()` is a pure read; tests assert on its contents after calling `initialize()` in a controlled mock environment (§22.B).

---

## 14. PLATFORM CAPABILITY REGISTRY

`window.INFINICUS.PLATFORM.capabilities` — exactly 9 entries, one per architectural layer (DA, BO, BI, DT, SIM, ADI, ABA, OM, CL), in that fixed order.

| name | layerId | version | readiness source |
|---|---|---|---|
| `data_acquisition` | DA | `1.0.0` | `DA.runtime.invoke('da.master.diagnose', {})` |
| `business_operations` | BO | `1.0.0` | **special-cased, always `ready: false`, `browserApplicable: false`** — BO has no browser namespace by architecture (§2), not by defect; `diagnostics.note` explains this explicitly so it is never mistaken for a load failure |
| `business_intelligence` | BI | `1.0.0` | `BI.runtime.call('bi.master.diagnose', {})` |
| `business_digital_twin` | DT | `1.0.0` | `DT.runtime.diagnostics()` |
| `simulation` | SIM | `1.0.0` (facade); `infinicus-engine-v3` (engine, reported separately as `engineVersion`) | presence + shape checks in §5.1 item 3 |
| `ai_decision_intelligence` | ADI | `1.0.0` | `ADI.runtime.dispatch('adi.master.diagnose', {})` |
| `approved_business_action` | ABA | `1.0.0` | `ABA.runtime.dispatch('aba.master.diagnose', {})` |
| `outcome_monitoring` | OM | `1.0.0` | `OM.runtime.dispatch('om.master.diagnose', {})` |
| `continuous_learning` | CL | `1.0.0` | `CL.runtime.invoke('cl.master.diagnose', {})` |

Each entry (`PlatformCapability`, §21) carries: `name`, `layerId`, `version`, `ready: boolean`, `degraded: boolean`, `browserApplicable: boolean` (false only for `business_operations`), `dependencies: string[]` (empty for DA; `["data_acquisition"]`-style chain is NOT asserted here because the actual dependency direction in the frozen architecture is publication-based, not load-order-based — `dependencies` reports the handoff producer per §8.3, e.g. BI's `dependencies: ["business_operations"]`), `publicInterface: string` (e.g. `"window.INFINICUS.BI.runtime"`), `diagnostics: object | null` (the redacted `payloadSummary` from §13).

---

## 15. VERSION COMPATIBILITY

- **Platform version:** `"1.0.0"` (new, frozen by this build; first release of `window.INFINICUS.PLATFORM`).
- **Layer version:** every one of the 7 block-structured layers already reports `"1.0.0"` internally (verified: DA's `ADI_DEPLOYMENT_MANIFEST`-equivalent per-block `version:"1.0.0"` entries; ADI's `ADI_DEPLOYMENT_MANIFEST` every block `version: "1.0.0"`; BI/ABA/OM/CL blocks follow the identical generated pattern). `SIMULATION.engineVersion === 'infinicus-engine-v3'` is its own version identifier, not a semver string — treated as an opaque compatibility token, not parsed as semver.
- **Compatible version ranges:** BUILD-10 accepts exactly `"1.0.0"` for every layer. There is no range logic (no semver comparison library is added — none is a dependency of any browser bundle today). A layer reporting any string other than exactly `"1.0.0"` is `PLATFORM_LAYER_VERSION_INCOMPATIBLE` (§12) and downgrades that layer to `not_ready`.
- **Missing version behavior:** if a layer's diagnostic response has no discoverable version field (true for DT, ABA, OM, CL per §2 — none of their base `diagnostics()`/`dispatch()` responses were confirmed to carry a top-level `version` string outside DA's `diagnose()` and ADI's `ADI_DEPLOYMENT_MANIFEST` entries), the version check for that layer is skipped entirely — `ready`/`degraded` is still driven only by the `.ok` check from §2, and `PlatformCapability.version` is reported as `"1.0.0"` (the known static value from the source inspection above), not fetched at runtime, for those 4 layers. This is stated explicitly so implementers do not fabricate a runtime version-read call that does not exist.
- **Incompatible version behavior:** downgrade to `not_ready`, non-fatal, as above.
- **Development fallback behavior:** none — there is no separate "development mode" flag anywhere in `index.html` or any bundle; BUILD-10 introduces none.
- **Production failure behavior:** identical to development — this codebase has no environment branching for browser bundles (confirmed: no `process.env`/`NODE_ENV` reference in any of the seven bundles or in `index.html`'s script section).
- **Test cases:** §22.B.3 (`incompatible version`), §22.B.7 (`diagnostics`).

`PlatformVersionManifest` (§21) = `{ platformVersion: "1.0.0", layers: { DA: "1.0.0", BI: "1.0.0", DT: "1.0.0", ABA: "1.0.0", OM: "1.0.0", CL: "1.0.0", ADI: "1.0.0", SIMULATION: "infinicus-engine-v3" } }` — `BO` intentionally absent (no browser version to report).

---

## 16. IDEMPOTENT INITIALIZATION

- No duplicate event listeners: `platform-bootstrap.js` registers zero DOM event listeners (it does not use `DOMContentLoaded`, per §3.5). There is nothing to duplicate.
- No duplicate handoff registration: `HANDOFF_MAP` (§8.3) is a static, frozen (`Object.freeze`) constant computed once at file-parse time, not re-registered per `initialize()` call.
- No duplicate storage hooks: `platform-bootstrap.js` uses no storage (§10), so none exist to duplicate.
- No repeated bundle side effects: `platform-bootstrap.js` never re-executes or re-fetches any of the seven bundle scripts; it only reads already-established globals.
- No duplicate Simulation adapters: `platform-bootstrap.js` does not create any adapter over `SIMULATION` — it only performs the read-only shape check in §5.1 item 3; ADI's own `simulationPorts` (already established, §8.1 row 5) is untouched.
- No duplicate ADI registrations: `platform-bootstrap.js` never calls `ADI.runtime.registerService`/`registerRoute` — it only calls the existing `adi.master.diagnose` route.
- Deterministic status result: given an unchanged set of 8 namespaces, `initialize()` (or `initialize({force:true})`) always produces the same `state` and the same set of `PlatformError` codes — no randomness, no timing dependency, no `Math.random()` in any control-flow decision (only in the diagnostic `correlationId`/event id strings, which do not affect `state`).

---

## 17. BROWSER SECURITY

- **No credential storage in `window.INFINICUS`:** `platform-bootstrap.js` stores no credential anywhere; it has no credential to store (§13).
- **No secret logging:** `console.warn`/`console.error` calls (§12) never include a full response payload, only the redacted `payloadSummary` (§13).
- **No unsafe dynamic code execution:** no `eval`, no `new Function(...)`, no `setTimeout(string, ...)` anywhere in `platform-bootstrap.js` — verified as a BUILD-10 test (§22.F: source-text scan for `eval(` / `Function(` / `setTimeout\(\s*['"]`).
- **Safe JSON parsing:** `platform-bootstrap.js` performs no `JSON.parse` on any untrusted input (it reads live JS objects from `window.INFINICUS.*`, never a serialized string from an external source). If a future change adds `JSON.parse`, it must be wrapped in `try/catch` — stated as a standing rule, not currently exercised.
- **Payload-size limits:** the diagnostics ring buffer is capped at 50 entries (§13) — the only "growth" surface in this file.
- **Object-shape validation:** every layer diagnostic response is checked with `typeof response === 'object' && response !== null` before any property access (§12, "malformed runtime state").
- **Protection against prototype pollution:** `platform-bootstrap.js` never uses a user- or layer-controlled string as a bracket-notation property key when writing into any object it owns (`window.INFINICUS.PLATFORM.*`); the only bracket-notation writes are with the 8 hardcoded layer-id string literals from §2/§14, never a value read from a layer's response.
- **Safe DOM updates:** `platform-bootstrap.js` performs zero DOM writes (§18 — it is data/diagnostics only, no UI).
- **No untrusted HTML insertion:** none (no `innerHTML`/`outerHTML`/`insertAdjacentHTML` calls anywhere in the file).
- **Local-storage validation:** N/A — no `localStorage` use (§10).
- **Redaction of sensitive business data in diagnostics:** enforced by `payloadSummary`'s redaction rule (§13).

---

## 18. ACCESSIBILITY AND USER-FACING FAILURE STATES

BUILD-10 adds **no new DOM elements, panels, toasts, or visual indicators**. `window.INFINICUS.PLATFORM` is a data/diagnostics API only. The existing status panels (`dt-runtime-status`, `dt-layer-status`, `bi-layer-status`, `aba-layer-status`, `om-layer-status`, `cl-layer-status` — all present in `index.html` today, verified at lines 1675–1696) are owned by the pre-existing `DOMContentLoaded` handlers from BUILD-07/earlier and are not modified, read, or written by `platform-bootstrap.js`.

Because no UI is added:
- No new accessible loading/readiness/failure state is required (none is rendered).
- No keyboard-usability change.
- No screen-reader announcement.
- No blocking browser alert is added (`platform-bootstrap.js` calls no `alert()`/`confirm()`/`prompt()`).
- No hidden critical failure: `failed`/`degraded` states are always retrievable via `window.INFINICUS.PLATFORM.isReady()`/`getStatus()` for any future caller (browser console, future UI, or a test) — "hidden" would mean unqueryable, which this is not.

BUILD-10 does not redesign the frontend, per explicit prohibition (§26).

---

## 19. PERFORMANCE

| Target | Threshold | Rationale |
|---|---|---|
| Bootstrap synchronous work (`initialize()` first call, all 8 namespaces present) | < 50 ms on a modern desktop browser | 8 lightweight route/method calls, no I/O, no network — matches the existing per-block `diagnose()`/`diagnostics()` calls' O(1)/O(n-small) complexity observed in source |
| No duplicate bundle load | 0 additional `<script>` fetches beyond the 1 new `platform-bootstrap.js` tag | §3.5 |
| No unnecessary re-execution of completed layers | 0 — `platform-bootstrap.js` never calls a layer's block-registration code, only its already-installed diagnostic route | §5.1 item 10 |
| Lazy initialization | N/A for this build — the readiness pass runs once at page load via the deferred script; there is no lazy/on-demand mode in scope | matches every existing bundle, none of which defers its own internal initialization once its script tag executes |
| Bounded diagnostic storage | 50-entry ring buffer (§13) | fixed, not configurable in this build |
| No regression to simulation execution | `executeScenario`/`getCompletedRun` call latency unchanged (BUILD-10 never wraps or proxies these calls) | §11 |
| No synchronous long-running work on initial page load | `initialize()` itself must not call `SIMULATION.executeScenario` (which runs the real Monte Carlo engine) — it only checks the shape of `SIMULATION.capabilities` and the existence of the two functions, never executing a real 500-run simulation during bootstrap | explicit rule, §5.1 item 3 |

---

## 20. EXACT FILES TO CREATE OR MODIFY

### Created

| File | Purpose |
|---|---|
| `platform/platform-bootstrap.js` | The platform bootstrap implementation (§5) |
| `platform/tests/01-file-existence.test.mjs` | Structural tests (§22.A) |
| `platform/tests/02-namespace-contract.test.mjs` | Namespace/bootstrap unit tests (§22.B) |
| `platform/tests/03-bootstrap-state-machine.test.mjs` | State machine tests (§22.B) |
| `platform/tests/04-handoff-map.test.mjs` | Handoff tests (§22.C) |
| `platform/tests/05-capability-registry.test.mjs` | Capability registry tests |
| `platform/tests/06-error-isolation.test.mjs` | Failure-path tests (§22.F) |
| `platform/tests/07-idempotent-initialization.test.mjs` | Idempotency tests |
| `platform/tests/08-security.test.mjs` | Security tests (§17) |
| `platform/tests/09-end-to-end-readiness.test.mjs` | End-to-end tests (§22.D) |
| `platform/README.md` | Short description of the platform bootstrap, mirroring the style of `infinicus-platform/layers/simulation/README.md` |
| `docs/platform-bootstrap.md` | Documentation of the namespace contract, state machine, handoff map, and capability registry (mirrors `infinicus-platform/docs/database-stage-2d-business-intelligence.md`'s structure) |
| `.claude/state/reports/BUILD-10-PLATFORM-completion.md` | Completion report (§28 template) |

### Modified

| File | Exact change |
|---|---|
| `index.html` | Exactly 2 inserted lines after line 789 (§3.3): one HTML comment, one `<script defer>` tag. Zero deletions. Zero other changes. |
| `docs/implementation-queue/00-IMPLEMENTATION-MANIFEST.md` | BUILD-10 row moved from "Pending Builds" to "Completed Builds" (only after implementation, not by this authoring task); "Current Ready Build" section updated |
| `.claude/state/implementation-status.json` | BUILD-10 status transition (only after implementation, not by this authoring task) |

**Not created or modified by BUILD-10 (explicit, matching §25/§26):** no file under `infinicus-platform/infrastructure/database/migrations/`; no file under `infinicus-platform/packages/database/src/repositories/`; no file under `infinicus-platform/packages/handoff-contracts/src/` (the 6 placeholders remain placeholders); no file under any of the seven layer bundle directories; no `*-bundle.js` file.

---

## 21. EXACT PUBLIC INTERFACES

Presented as TypeScript-style declarations for specification precision; the shipped implementation is plain browser JavaScript (`Object.freeze`-wrapped plain objects), matching every existing bundle's convention — no TypeScript build step is introduced for `platform/platform-bootstrap.js`.

```ts
interface PlatformBootstrap {
  initialize(options?: { force?: boolean }): PlatformInitializationResult;
  getStatus(): PlatformStatus;
  isReady(): boolean;
  getCapabilities(): PlatformCapability[];
  getDiagnostics(): PlatformDiagnostics;
  getHandoffs(): HandoffRegistration[];
  getVersionManifest(): PlatformVersionManifest;
}

interface PlatformStatus {
  state: "not_started" | "validating" | "initializing" | "ready" | "degraded" | "failed";
  readyLayers: string[];        // subset of ["DA","DT","BI","ABA","OM","CL","ADI","SIMULATION"]
  degradedLayers: string[];     // layers present but reporting ok:false
  missingLayers: string[];      // layers whose namespace is undefined
  errors: PlatformError[];
  initializedAt: string | null; // ISO 8601, null until first initialize() completes
  version: string;              // "1.0.0"
}

interface PlatformLayerDescriptor {
  layerId: "DA" | "BO" | "BI" | "DT" | "SIM" | "ADI" | "ABA" | "OM" | "CL";
  name: string;                 // e.g. "Data Acquisition"
  namespace: string | null;     // e.g. "window.INFINICUS.DA"; null for BO
  bundleFile: string | null;    // e.g. "data-acquisition/da-bundle.js"; null for BO and SIM
  blockCount: number | null;    // 25 | 24 | null (BO, SIM)
  masterIntegrationRoute: string | null; // e.g. "da.master.diagnose"; null for DT and BO
  runtimeDiagnosticsMethod: string | null; // e.g. "diagnostics" | "diagnose" | null
  required: boolean;            // true for all 8 browser-applicable layers; false for BO
}

interface PlatformCapability {
  name: string;                 // e.g. "data_acquisition"
  layerId: string;
  version: string;
  ready: boolean;
  degraded: boolean;
  browserApplicable: boolean;   // false only for business_operations
  dependencies: string[];       // producer layer name(s) from the handoff map, §8.3
  publicInterface: string | null;
  diagnostics: Record<string, unknown> | null; // redacted payloadSummary, §13
}

interface PlatformDiagnosticEvent {
  event: string;                 // one of the 11 names in §13
  severity: "info" | "warn" | "error";
  layerId: string | null;
  correlationId: string;
  occurredAt: string;            // ISO 8601
  message: string;
  payloadSummary: Record<string, unknown> | null;
}

interface PlatformDiagnostics {
  events: PlatformDiagnosticEvent[]; // bounded, last 50
  generatedAt: string;               // ISO 8601, time of the getDiagnostics() call
  schemaVersion: "1.0.0";
}

interface PlatformInitializationResult {
  ok: boolean;                   // true iff state === "ready"; false for degraded/failed
  status: PlatformStatus;
  errors: PlatformError[];       // same array reference as status.errors
}

interface PlatformError {
  code: string;                  // one of the codes enumerated in §12
  message: string;
  layerId: string | null;
  fatal: boolean;
  occurredAt: string;            // ISO 8601
}

interface LayerReadinessCheck {
  layerId: string;
  namespacePresent: boolean;
  runtimePresent: boolean;       // false for SIMULATION (no .runtime concept), true/false for the 7 block-structured layers
  diagnosticsOk: boolean;        // result of the layer's own .ok check, §2 table
  missingServices: string[];     // always [] in this build — no per-service introspection is performed, only the layer's own aggregate diagnose result is used (§5.1 item 2); reserved for a future build that adds per-service detail
  status: "ready" | "degraded" | "missing";
}

interface HandoffRegistration {
  handoffId: string;             // "DA_TO_BO" | "BO_TO_BI" | "BI_TO_DT" | "DT_TO_SIM" | "SIM_TO_ADI" | "ADI_TO_ABA" | "ABA_TO_OM" | "OM_TO_CL" | "CL_FEEDBACK"
  producerLayer: string;
  consumerLayer: string;
  mechanism: "persistence" | "direct-port" | "registerPublisher" | "event-bus" | "not_wired";
  contractBacked: boolean;
  contractFile: string | null;   // relative to infinicus-platform/packages/handoff-contracts/src/
  status: "active" | "not_wired";
}

interface PlatformVersionManifest {
  platformVersion: string;       // "1.0.0"
  layers: Record<string, string>; // DA/BI/DT/ABA/OM/CL/ADI: "1.0.0"; SIMULATION: "infinicus-engine-v3"; BO absent
}
```

---

## 22. EXACT TEST PLAN

All new tests are `.mjs` files under `platform/tests/`, run the same way every other layer's tests are run today (`node <file>`, one process per file, exit code 0 = pass), per `CLAUDE-QUEUE-INSTRUCTIONS.md`. **Minimum: 9 new test files, no fewer than 75 individual `assert` calls across them, distributed as follows (frozen, no fewer per file):**

### A. Structural tests — `platform/tests/01-file-existence.test.mjs` (minimum 8 assertions)
- `platform/platform-bootstrap.js` exists.
- `index.html` contains exactly one occurrence of `src="/platform/platform-bootstrap.js"`.
- The new script tag has the `defer` attribute.
- The new script tag appears strictly after `src="/ai-decision-intelligence/adi-bundle.js"` in file order.
- No other `<script src="/platform` tag exists (no duplicate).
- Every one of the 7 existing bundle `<script>` tags is still present, unchanged, in the same relative order.
- `node --check platform/platform-bootstrap.js` (invoked as a subprocess from the test) exits 0.
- No file exists under `infinicus-platform/infrastructure/database/migrations/` newer than `0049_create_bi_triggers_events.sql` (frozen-migration guard).

### B. Bootstrap unit tests — `platform/tests/02-namespace-contract.test.mjs` + `platform/tests/03-bootstrap-state-machine.test.mjs` (minimum 20 assertions combined)
Using a `vm`-based harness (same technique as `ai-decision-intelligence/sim-integration-harness.mjs`: construct a minimal `window`/`document`/`INFINICUS` mock, load `platform/platform-bootstrap.js` source text into a `vm.Context`, execute it):
- Successful initialization: all 8 mock namespaces present and reporting `ok:true` → `state === "ready"`.
- Missing dependency: one namespace absent → `state === "degraded"`, that layer in `missingLayers`.
- Incompatible version: a mock layer reports `version: "0.9.0"` where version is checked (DA, ADI, BI per §15) → that layer `not_ready`, `state === "degraded"`.
- Duplicate initialization: call `initialize()` twice without `force` → second call returns the identical `PlatformInitializationResult` object (reference or deep-equal, frozen as deep-equal), no new diagnostic events beyond the one no-op event.
- Degraded initialization: 3 of 8 namespaces missing → `state === "degraded"`, `readyLayers.length === 5`.
- Fatal failure: mock a namespace whose diagnostic call throws synchronously in a way that escapes the per-layer try/catch (defensive test constructing a hostile mock) → still does not throw out of `initialize()`; only reaches `state === "failed"` when all 8 fail.
- Diagnostics: after `initialize()`, `getDiagnostics().events.length > 0` and every event has `correlationId` equal across the whole call.
- Capability registry: `getCapabilities().length === 9`, includes `business_operations` with `browserApplicable === false`.

### C. Handoff tests — `platform/tests/04-handoff-map.test.mjs` (minimum 9 assertions)
- `getHandoffs().length === 9`.
- Each of the 9 `handoffId`s from §8.3 is present exactly once.
- `DA_TO_BO` and `BO_TO_BI` have `contractBacked: true`.
- `SIM_TO_ADI` has `mechanism: "direct-port"` and `status: "active"`.
- `BI_TO_DT` and `DT_TO_SIM` have `status: "not_wired"`.
- `ADI_TO_ABA` has `status: "not_wired"`.
- `ABA_TO_OM`, `OM_TO_CL`, `CL_FEEDBACK` have `status: "active"` and `contractBacked: false`.
- Every `contractFile` value, when `contractBacked` or the file is named, matches an actual filename under `infinicus-platform/packages/handoff-contracts/src/` (test reads the directory and cross-checks).
- No handoff entry has `mechanism` outside the 5 allowed enum values.

### D. End-to-end browser tests — `platform/tests/09-end-to-end-readiness.test.mjs` (minimum 8 assertions)
- With all 8 mock namespaces "fully ready", `isReady() === true`.
- `SIMULATION` capability check confirms `capabilities.runs === 500` and `.horizonDays === 90` are read, not fabricated (mock returns a different number → test asserts the platform reports it verbatim, not silently normalized to 500/90).
- ADI capability readiness reflects a real call to the mock `adi.master.diagnose` route (mock returns `ok:false` → ADI capability `ready === false`).
- DT readiness reflects `DT.runtime.diagnostics()` specifically (not a `master.diagnose` route, since DT has none — test asserts DT never receives a call to a nonexistent `dt.master.diagnose`).
- Full readiness chain: DA ready + BI ready + ADI ready + SIMULATION ready, one of DT/ABA/OM/CL missing → overall `state === "degraded"`, not `"ready"`.
- `getHandoffs()` output does not change based on runtime readiness (the map is static per §8.3 — test asserts identical output across a "ready" mock run and a "failed" mock run).
- No test in this file calls the real `simulate()`/`monteCarlo()` engine — verified by asserting the mock `executeScenario` call counter stays at 0 throughout `initialize()`.
- `getVersionManifest()` has exactly 8 keys under `layers` (no `BO`).

### E. Regression tests — no new file; existing commands re-run (§23) and asserted unchanged:
- Root regression: 180/180 (unchanged file count and pass count).
- Monorepo ADI source regression: 106/106.
- handoff-contracts suite: 45/45.
- Database package regression: unchanged pass count from the BUILD-09 baseline (live PostgreSQL 16).
- Monte Carlo parity: §11 checks 1–4.
- Frozen migrations 0001–0049: SHA-256 unchanged from the value recorded in this document's baseline (§24).

### F. Failure-path tests — `platform/tests/06-error-isolation.test.mjs` (minimum 9 assertions)
- Missing bundle (namespace entirely absent) → non-fatal, `code: "PLATFORM_LAYER_NAMESPACE_MISSING"`.
- Corrupt namespace (`window.INFINICUS.DA = "not an object"`) → non-fatal, `code: "PLATFORM_LAYER_RUNTIME_MISSING"`, no thrown exception escapes `initialize()`.
- Incompatible version → `code: "PLATFORM_LAYER_VERSION_INCOMPATIBLE"`.
- Failed Simulation check (mock `SIMULATION.executeScenario` is not a function) → `code` present, `SIMULATION` capability `not_ready`.
- Failed ADI check (mock diagnose throws) → caught, `code: "PLATFORM_LAYER_DIAGNOSTIC_FAILED"`.
- Invalid storage — defensive/no-op test confirming `platform-bootstrap.js` never calls `localStorage`/`indexedDB` (source-text scan, 0 occurrences).
- Duplicate listeners — source-text scan confirms 0 occurrences of `addEventListener` in `platform-bootstrap.js` (§16).
- Partial initialization — 7 of 8 namespaces throw during their check, 1 succeeds → `state === "degraded"`, not `"failed"` (only all-8-failing reaches `failed`).
- All 8 namespaces throw → `state === "failed"`, `initialize()` itself still returns normally (does not propagate the exception to the caller).

**Total, frozen minimum: 9 files, ≥75 assertions.** The root regression tally after BUILD-10 is implemented becomes **189/189** (180 existing + 9 new files), each new file counted as one pass/fail unit exactly like the existing 180, consistent with `CLAUDE-QUEUE-INSTRUCTIONS.md`'s validation loop.

---

## 23. EXACT VALIDATION COMMANDS

All commands verified to exist in the repository today (none invented). Run from repository root unless noted.

```bash
# Monorepo install/lint/typecheck/test/build (from infinicus-platform/)
cd infinicus-platform && pnpm install
cd infinicus-platform && pnpm workspace:validate
cd infinicus-platform && pnpm lint
cd infinicus-platform && pnpm typecheck
cd infinicus-platform && pnpm test
cd infinicus-platform && pnpm build

# Root browser regression — all 7 existing layers (180 files) + platform (9 files) = 189
for dir in data-acquisition/INFINICUS-DA-*/ digital-twin/INFINICUS-DT-*/ business-intelligence/INFINICUS-BI-*/ \
           approved-business-action/INFINICUS-ABA-*/ outcome-monitoring/INFINICUS-OM-*/ \
           continuous-learning/INFINICUS-CL-*/ ai-decision-intelligence/INFINICUS-ADI-*/; do
  for test in "$dir"tests/*.mjs; do node "$test"; done
done
for test in platform/tests/*.mjs; do node "$test"; done

# ADI monorepo source regression (from infinicus-platform/layers/ai-decision-intelligence/)
cd infinicus-platform/layers/ai-decision-intelligence && node --test blocks/*/tests/*.test.mjs

# handoff-contracts suite (from infinicus-platform/)
cd infinicus-platform && pnpm --filter @infinicus/handoff-contracts test

# layer-simulation suite (from infinicus-platform/)
cd infinicus-platform && pnpm --filter @infinicus/layer-simulation test

# Database regression (from infinicus-platform/; requires local disposable PostgreSQL 16)
cd infinicus-platform && pnpm --filter @infinicus/database test

# Bundle syntax checks
node --check data-acquisition/da-bundle.js
node --check digital-twin/dt-bundle.js
node --check business-intelligence/bi-bundle.js
node --check approved-business-action/aba-bundle.js
node --check outcome-monitoring/om-bundle.js
node --check continuous-learning/cl-bundle.js
node --check ai-decision-intelligence/adi-bundle.js
node --check platform/platform-bootstrap.js

# Hash verification — frozen migrations 0001-0049 must remain byte-identical
sha256sum infinicus-platform/infrastructure/database/migrations/00{01..49}*.sql | sha256sum
# must equal the value recorded in §24 of this document

# git diff checks
git diff --check
git status --short
git diff index.html   # must show exactly 2 insertions, 0 deletions
```

---

## 24. FROZEN FILE PROTECTION

**Must not be modified by BUILD-10, verified before and after implementation:**

- `infinicus-platform/infrastructure/database/migrations/0001…0049*.sql` (all 49 files). Baseline SHA-256 of the concatenated `sha256sum` output for `0001`–`0049`, recorded at authoring time of this specification:
  ```
  sha256sum infinicus-platform/infrastructure/database/migrations/00{01..49}*.sql | sha256sum
  ```
  Recompute at BUILD-10 completion and confirm identical; the `0001`–`0036` sub-range value is independently `76642d0c82f00d64ccf6fc45eaf61cbf22a1c645c342dafc4f982cc61fe19f50` (verified against the BUILD-09 baseline at authoring time of this document).
- `docs/implementation-queue/BUILD-07-SIM-SPECIFICATION.md`, `BUILD-08-DAL-SPECIFICATION.md`, `BUILD-09-DB-BI-SPECIFICATION.md` — frozen, untouched.
- `.claude/state/reports/BUILD-06-ADI-completion.md`, `BUILD-07-SIM-completion.md`, `BUILD-08-DAL-completion.md`, `BUILD-09-DB-BI-completion.md` — frozen, untouched.
- All source files under `data-acquisition/INFINICUS-DA-*/`, `digital-twin/INFINICUS-DT-*/`, `business-intelligence/INFINICUS-BI-*/`, `approved-business-action/INFINICUS-ABA-*/`, `outcome-monitoring/INFINICUS-OM-*/`, `continuous-learning/INFINICUS-CL-*/`, `ai-decision-intelligence/INFINICUS-ADI-*/` — frozen, untouched.
- All 7 existing `*-bundle.js` files — frozen, untouched (verified by per-file SHA-256, §11).
- `index.html` lines 1966–6069 (Engine v3 core, including Monte Carlo) and lines 7098–7390 (BUILD-07 SIM facade + wire hooks) — frozen, untouched.
- `infinicus-platform/packages/handoff-contracts/src/dal-to-bo.ts`, `bo-to-bi.ts`, `sim-to-adi.ts` — frozen, untouched (semantics; BUILD-10 reads their existence/line-count only, never their content, for §8.1's table, which is derived from this authoring-time inspection, not re-derived by any BUILD-10 code at runtime).
- The 6 placeholder handoff-contract files remain exactly 6 lines each, untouched.

**`index.html` — exact allowed change:** insert 2 lines (1 comment, 1 `<script defer>` tag) immediately after line 789, per §3.3. Zero deletions, zero other insertions, zero attribute changes to any existing tag.

**Bundle regeneration:** none required or permitted. BUILD-10 introduces no build step that would regenerate any `*-bundle.js` file.

---

## 25. DATABASE BOUNDARY

BUILD-10 does not implement database persistence for Digital Twin, Simulation, AI Decision Intelligence, Approved Business Action, Outcome Monitoring, or Continuous Learning. These remain entirely without a persistence tier after BUILD-10, exactly as before it.

BUILD-10 validates existing DA, BO, and BI persistence integration only by re-running the existing `pnpm --filter @infinicus/database test` regression suite (§23) and confirming the frozen migration hash (§24) — it adds no new query, no new repository method, and no new migration.

BUILD-10 does not create any migration file. The next migration number after this build remains `0050` (unclaimed), exactly as it is unclaimed today.

---

## 26. PROHIBITED WORK

Explicitly excluded from BUILD-10:

- New event-backbone infrastructure of any kind.
- External message brokers: Kafka, RabbitMQ, SNS/SQS, Pub/Sub, or any other.
- Stage 2E or later database persistence.
- New DT database schema.
- New SIM database schema.
- New ADI database schema.
- New ABA database schema.
- New OM database schema.
- New CL database schema.
- Large layer rewrites (defined as any change touching more than the one permitted `index.html` insertion plus new files under `platform/`).
- Recommendation authority in Simulation.
- Execution authority in ADI.
- Business-logic redesign in any layer.
- UI redesign (no new DOM elements, no panel/style changes).
- Production deployment.
- Cloud infrastructure provisioning.
- Unrelated refactoring of any existing file.
- Edits to frozen migrations `0001`–`0049`.
- Completing any of the 6 placeholder TypeScript handoff-contract files (`bi-to-dt.ts`, `dt-to-sim.ts`, `adi-to-aba.ts`, `aba-to-om.ts`, `om-to-cl.ts`, `cl-feedback.ts`).
- Wiring `DT-24`'s `registerPublisher` call or connecting `ADI-24`'s `handoffOutbox` to any consumer (§8.2 — documented as `not_wired`, not fixed, by explicit decision of this specification).
- Beginning BUILD-11 or modifying any later queue item.

---

## 27. BUILD-10 IMPLEMENTATION STOP CONDITION

The future BUILD-10 implementation must stop after:

1. The canonical bundle order (§3) is implemented — one new `<script defer>` tag inserted at the exact frozen position.
2. `platform/platform-bootstrap.js` exists and matches §5.
3. All 8 required namespaces are validated per §4/§5.1.
4. All completed layers' own diagnostic routes are invoked in the order and manner tabulated in §2/§5.1 — no new per-layer diagnostic logic is written.
5. The 9 existing handoffs are recorded (not re-wired) per §8.3.
6. Platform readiness and failure states exist per §6/§21.
7. The capability registry exists per §14.
8. Diagnostics exist per §13.
9. Duplicate initialization is prevented per §16.
10. The full browser flow is validated to the limits of existing implementation, per §9's table — no test asserts a working pipeline beyond what that table marks implemented.
11. Engine v3 behavior is preserved (§11, all 4 compatibility checks pass).
12. Monte Carlo parity is preserved (`runs === 500`, `horizonDays === 90`, unchanged).
13. All required tests pass: 189/189 root regression (180 existing + 9 new), 106/106 monorepo ADI regression, 45/45 handoff-contracts, database regression unchanged from BUILD-09 baseline.
14. No frozen migration changed (`0001`–`0049` SHA-256 unchanged, §24).
15. No Stage 2E or later persistence was added.
16. `docs/platform-bootstrap.md`, `platform/README.md`, and `.claude/state/reports/BUILD-10-PLATFORM-completion.md` exist.

---

## 28. BUILD-10 COMPLETION REPORT TEMPLATE

To be created at `.claude/state/reports/BUILD-10-PLATFORM-completion.md` when BUILD-10 is implemented, following the exact section structure below (matching the established format of BUILD-06 through BUILD-09's reports):

```
# BUILD-10 Completion Report — PLATFORM

- Build ID:
- Layer:
- Date:
- Branch:
- Specification:
- Status:

## WHAT WAS BUILT

### PLATFORM ASSEMBLY
### BUNDLE LOADING ORDER
### PLATFORM BOOTSTRAP
### NAMESPACE VALIDATION
### CAPABILITY REGISTRY
### INITIALIZATION STATE MACHINE
### CROSS-LAYER HANDOFFS
### END-TO-END FLOW
### ERROR ISOLATION
### SECURITY
### OBSERVABILITY
### PERFORMANCE

## FILES CREATED
## FILES MODIFIED
## TESTS ADDED

## VALIDATION RESULTS
### ROOT REGRESSION
### ADI REGRESSION
### HANDOFF-CONTRACT REGRESSION
### DATABASE REGRESSION
### MONTE CARLO PARITY
### FROZEN FILE VERIFICATION
### OUT-OF-SCOPE CONFIRMATION

## KNOWN LIMITATIONS

## QUEUE TRANSITION
- Commit:
- Branch:
- PR:
- Next build:
```

The "KNOWN LIMITATIONS" section must, at minimum, restate the two documented gaps from §8.2/§26 (`DT-24` not wired, `ADI-24` outbox has no consumer) and the six placeholder handoff-contract files, so a future build has an accurate starting point.

---

## SPECIFICATION QUALITY CONFIRMATION

This specification contains no instance of "either", "possibly", "consider", "as appropriate", "one option", or "could use" describing an unresolved implementation choice. Every file path, method name, route name, and numeric threshold above was verified against the repository at authoring time (2026-07-21, commit `e14e0c49da844f11b120705cd0eedbe5d4c2ef6a`) by direct inspection — `grep`, `Read`, and `find` — not inferred from naming convention alone. Where the repository itself is inconsistent across layers (route-dispatch method names: `invoke`/`callRoute`/`dispatch`/`call`; self-diagnostic method names: `diagnose`/`diagnostics`/absent), that inconsistency is recorded exactly as found in §2's table, and the platform's own logic is designed to depend only on the one universal fact verified across all seven layers (the `{ok, data, error}` result envelope), rather than presenting a false uniformity.
