# INFINICUS IMPLEMENTATION MANIFEST

All builds in strict execution order. Execute one at a time.

## Completed Builds

| ID | Layer | Description | Status |
|---|---|---|---|
| BUILD-01 | DT | Digital Twin — 24 blocks + dt-bundle.js | completed |
| BUILD-02 | BI | Business Intelligence — 25 blocks + bi-bundle.js | completed |
| BUILD-03 | ABA | Approved Business Action — 25 blocks + aba-bundle.js | completed |
| BUILD-04 | OM | Outcome Monitoring — 25 blocks + om-bundle.js | completed |
| BUILD-05 | CL | Continuous Learning — 25 blocks + cl-bundle.js | completed |
| BUILD-06 | ADI | AI Decision Intelligence — 25 blocks + adi-bundle.js | completed |
| BUILD-07 | SIM | Simulation layer integration cleanup | completed |
| BUILD-08 | DAL | Data Acquisition Layer root blocks | completed |
| BUILD-09 | DB-BI | Database Stage 2D — Business Intelligence schema | completed |

## Current Ready Build

None. BUILD-10 (PLATFORM) is the next build in order but lacks an
authoritative specification — author a `## BUILD-10 Specification` (or
linked document) before marking it ready.

## Pending Builds

| ID | Layer | Description | Status |
|---|---|---|---|
| BUILD-10 | PLATFORM | Platform assembly — all layers wired and validated | pending — awaiting specification |

---

## BUILD-06 Specification: ADI Layer

### Objective

Create the root-level `ai-decision-intelligence/` directory with 25 blocks
in browser-global IIFE format, produce `adi-bundle.js`, and wire it into `index.html`.

### Source Material

ES module implementations exist in:
`infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-{NN}-*/`

All 25 blocks are implemented and all 106 tests pass in Node.js.

### Output Structure

```
ai-decision-intelligence/
  INFINICUS-ADI-01-AI-Decision-Intelligence-Core-Runtime-Registry/
  INFINICUS-ADI-02-Decision-Request-Intake-Validation-Engine/
  ... (ADI-03 through ADI-24)
  INFINICUS-ADI-25-AI-Decision-Intelligence-Master-Integration-Deployment-Engine/
  adi-bundle.js
```

### Bundle Global Namespace

```js
global.INFINICUS.ADI = {
  runtime,       // ADI-01 runtime instance
  // ADI-02 through ADI-24 services attached to runtime
  // ADI-25 master integration attached last
}
```

### index.html Integration

Add before the closing `</body>` tag, in dependency order after dt-bundle.js:

```html
<script src="/ai-decision-intelligence/adi-bundle.js"></script>
```

### Validation Commands

```bash
node --check ai-decision-intelligence/adi-bundle.js
for dir in ai-decision-intelligence/INFINICUS-ADI-*/; do
  for test in "$dir/tests/"*.mjs; do
    node "$test"
  done
done
```

### Required Completion Report

`.claude/state/reports/BUILD-06-ADI-completion.md`

### Success Criteria

- 25 root-level block directories exist
- `adi-bundle.js` syntax-checks clean
- All block tests pass
- `index.html` loads adi-bundle.js
- All existing layer tests still pass (regression)

---

## BUILD-07 Specification: SIM Layer Integration Cleanup

**Authoritative specification:** [BUILD-07-SIM-SPECIFICATION.md](./BUILD-07-SIM-SPECIFICATION.md)
(frozen 2026-07-21; implemented and completed 2026-07-21 — see
`.claude/state/reports/BUILD-07-SIM-completion.md`).

### Objective (summary)

Integrate the existing INFINICUS Engine v3 Simulation capability
(`window.INFINICUS.SIMULATION.*` in root `index.html`) with the modular
architecture and the completed ADI layer through typed ports, a narrow
browser adapter, and a complete SIM-to-ADI handoff contract — replacing the
"not connected" ADI-06/ADI-16 stub adapters. BUILD-07 must not create or
rewrite the Simulation engine; established Monte Carlo behaviour (500 runs,
90-day horizon) is preserved. Simulation produces evidence; ADI evaluates it.
No recommendation or approval authority moves into SIM. No database schema or
migrations.

See the dedicated specification for the full scope, architecture boundary,
port and contract requirements, characterization/parity requirements,
validation gates, and success criteria.

---

## BUILD-08 Specification: DAL Root Blocks

**Authoritative specification:** [BUILD-08-DAL-SPECIFICATION.md](./BUILD-08-DAL-SPECIFICATION.md)
(frozen 2026-07-21; implemented and completed 2026-07-21 — see
`.claude/state/reports/BUILD-08-DAL-completion.md`).

### Objective (summary)

Assemble the 25 completed Data Acquisition browser-runtime blocks
(`infinicus-platform/layers/data-acquisition/blocks/INFINICUS-DA-01…25`,
already browser-global IIFEs, all source tests passing) into a root-level
`data-acquisition/` layer with `da-bundle.js` exposing `window.INFINICUS.DA`,
wired into `index.html` before `dt-bundle.js`, and complete the strict
versioned DAL-to-BO handoff contract (`dal-to-bo.ts`), aligned with
`da.data.published` and Stage 2B `publication_packages`. DAL means
Data Acquisition Layer (settled by the 2026-07-21 audit). No DA algorithm
changes, no database changes, no Stage 2B duplication, no CL-to-DAL
feedback, no BUILD-09.

---

## BUILD-09 Specification: DB-BI Database Stage 2D

**Authoritative specification:** [BUILD-09-DB-BI-SPECIFICATION.md](./BUILD-09-DB-BI-SPECIFICATION.md)
(frozen 2026-07-21; implemented and completed 2026-07-21 — see
`.claude/state/reports/BUILD-09-DB-BI-completion.md`).

### Objective (summary)

Implement Database Stage 2D — Business Intelligence persistence only: a new
`business_intelligence` PostgreSQL schema (migrations starting at `0037`,
frozen 0001–0036 untouched), tenant-isolated RLS-enabled-and-forced tables
for intake/lineage, analytical datasets, metrics/KPIs, analysis lifecycle,
findings, trends, forecasts, anomalies, benchmarks, risk intelligence, and
publication/registry — plus strict TypeScript repository adapters and BI
outbox events. Consumes validated `business_operations.bo_publication_packages`
via a completed `bo-to-bi.ts` handoff contract; publishes onward declarations
only to Digital Twin, Simulation, and ADI (no downstream implementation).
Requires ≥100 meaningful live PostgreSQL 16 integration tests. This is
database/repository work only — it does not touch the completed browser BI
root blocks (BUILD-02) and does not implement analytical algorithms.
