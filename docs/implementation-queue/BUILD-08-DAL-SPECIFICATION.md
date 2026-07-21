# BUILD-08 Specification — DAL: Data Acquisition Layer Root Blocks

- **Build ID:** BUILD-08
- **Layer:** DAL (Data Acquisition Layer — authoritative expansion; see §2)
- **Status:** ready (specification frozen 2026-07-21; implementation not started)
- **Depends on:** BUILD-06 (ADI) and BUILD-07 (SIM) — both completed
- **Authorized by:** repository owner scope decision, 2026-07-21

---

## 1. Objective

Create a production-loadable root Data Acquisition browser-runtime layer by
assembling the 25 completed DA blocks in canonical numerical order, exposing
`window.INFINICUS.DA` through the established DA-01 runtime, wiring one root
bundle (`da-bundle.js`) into `index.html`, and completing the strict
DAL-to-BO publication handoff contract.

BUILD-08 assembles existing, tested blocks. It must NOT redesign, rewrite,
"improve", simplify or refactor any DA block algorithm.

## 2. DAL Meaning (settled by audit, 2026-07-21)

DAL = **Data Acquisition Layer**, layer 1 of the nine-layer architecture
(`DAL → BO → BI → DT → SIM → ADI → ABA → OM → CL`). Evidence:
`infinicus-platform/layers/data-acquisition/src/index.ts` (`LAYER_ID = 'DAL'`,
"Data Acquisition Layer"), `infinicus-platform/docs/architecture-manifest.md`
(registry row 1, handoff `dal-to-bo`, event prefix `da.*`), shared-types
`LayerId` union. DAL does NOT mean Data Access Layer or any action/approval
layer.

## 3. Source of Truth

`infinicus-platform/layers/data-acquisition/blocks/` is authoritative for
DA-01 through DA-25. Verified baseline (re-verify before editing):

- 25 block directories `INFINICUS-DA-01-…` through `INFINICUS-DA-25-…`,
  each with `src/`, `tests/`, `docs/`, `demo/`, `CLAUDE.md`, `README.md`,
  `CHANGELOG.md`, `package.json`
- All source files are already browser-global IIFEs —
  `(function(g){ … })(window)` writing `g.INFINICUS.DA.*` — **no ES-module
  conversion is required**
- DA-01 installs `INFINICUS.DA.runtime` (registerService / registerRoute /
  invoke / registerSource / setCollectionState / diagnose); DA-02…25 attach
  through that runtime API
- All 25 source block tests pass (assert-based `.mjs`, "DA-NN tests passed.")

The implementation must preserve: source behaviour, block order, public
namespace, runtime registration, route registration, diagnostics, existing
validations, existing error behaviour, existing tests, and existing
documentation meaning.

## 4. Expected Root Output

1. Root directory `data-acquisition/` with 25 block directories using the
   established full naming convention (mirroring the source directory names
   exactly, as BUILD-01…06 root layers do):
   `data-acquisition/INFINICUS-DA-01-Data-Acquisition-Core-Runtime-Registry/`
   … `data-acquisition/INFINICUS-DA-25-Master-Integration-Production-Assembly-Deployment-Engine/`
2. Each root block carries the repository-required equivalents of `src/`,
   `tests/`, `CLAUDE.md`, `README.md`, `package.json`, and the `docs/` /
   `demo/` assets already belonging to the source block. Do NOT invent empty
   files merely to force structural symmetry.
3. One root bundle: `data-acquisition/da-bundle.js`.
4. Minimal `index.html` wiring (§7).
5. Completed DAL-to-BO handoff contract (§8).
6. Focused root DAL tests (§10).
7. Completion report `.claude/state/reports/BUILD-08-DAL-completion.md` and
   queue bookkeeping.

## 5. Assembly Requirements

- DA-01 first; DA-25 last; every intermediate block in canonical numerical
  order; no block skipped; no duplicate registration; no reordering for
  perceived optimization.
- Root copies preserve the authoritative source implementation without
  semantic changes.
- Safe JavaScript boundaries between concatenated IIFEs (each source file is
  already a self-terminating IIFE; keep separators/newlines between them).
- One public namespace: `window.INFINICUS.DA`. No competing Data Acquisition
  namespace; no new global leakage beyond existing block behaviour.
- Bundle syntax validity, runtime diagnostic visibility, and source-to-root
  behavioural parity are mandatory gates.

## 6. Bundle Requirements

`da-bundle.js` must: contain all 25 blocks in numerical order; execute in a
browser without an ES-module loader; preserve each IIFE boundary; expose the
established DA runtime and registered capabilities; fail visibly and
deterministically (console error, no partial silent state) if the DA-01
runtime cannot initialize; contain no database credentials or environment
secrets; perform no direct database access; introduce no second runtime; and
depend on no unimplemented BUILD-09 code.

Precedent: existing root bundles (dt/bi/aba/om/cl/adi) are generated
concatenations with an auto-generated header comment. Follow the same
concatenation process. Do NOT introduce a new bundler or build system for
BUILD-08.

## 7. index.html Load Order

`da-bundle.js` loads: (1) after the base INFINICUS namespace prerequisites,
and (2) BEFORE the first present downstream architectural bundle. Since BO
and BI root bundles do not exist, place it before `dt-bundle.js` — i.e. the
new script tag goes immediately above the existing
`<!-- Business Digital Twin Layer -->` comment + `dt-bundle.js` tag,
preserving the established `defer` convention. Do not reorder unrelated
scripts unless a proven dependency requires it.

## 8. DAL-to-BO Handoff Contract — INCLUDED

Replace the placeholder in
`infinicus-platform/packages/handoff-contracts/src/dal-to-bo.ts`
(`{ correlationId; // TODO: add fields }`) with a strict, versioned,
serializable contract following the CLAUDE.md §8 `LayerHandoff<TPayload>`
envelope and the conventions established by `sim-to-adi.ts` (BUILD-07).

Align semantically with the canonical `da.data.published` event
(payload: `packageId`, `targetLayer`, `targetBlock`, `recordCount`;
version '1.0') and Stage 2B `data_acquisition.publication_packages`
(tenant_id, workspace_id, business_id, package_type, package_version,
target_layer/target_block, data_reference, record_count, quality_score,
reliability_score, schema_reference_id, provenance_reference_ids,
limitations, status, published_at, correlation_id). The payload must
represent, directly or via canonical referenced types:

contract version · handoff identity · correlation identity · tenant
identity · business identity (and workspace where the canonical record
carries it) · publication-package identity · publication timestamp ·
source/source-reference information · schema or data-version reference ·
record/item counts when available · data-quality summary (quality and
reliability scores as produced — never fabricated) · validation status ·
consent/provenance references · idempotency/replay identity · warnings or
limitations · integrity metadata required by existing conventions.

Rules: reuse canonical repository identifier types (no competing identity
types); accept only successfully validated, publishable DAL output (status
`published`); reject malformed payloads, missing tenant/business ownership,
and invalid publication state — with explicit reasons; JSON-serializable; no
DOM objects, functions or globals; no database credentials; preserve
correlation and provenance; support existing acknowledgement/rejection/
replay conventions where applicable; contain no Business Operations logic.
DAL publishes the handoff; BO consumes it in a later authorized build.

Runtime validation follows the repository convention established in
`sim-to-adi.ts` (hand-rolled validator with explicit reason codes +
serializability walk; Zod only if already available in the package).

## 9. Boundaries

**Stage 2B boundary** — Stage 2B owns Data Acquisition persistence. BUILD-08
must NOT: create schemas, migrations, tables or RLS policies; duplicate
repository adapters or Stage 2B database validators; access PostgreSQL from
the browser; expose database credentials; replace
`data_acquisition.publication_packages`; or redefine canonical persisted
identities. The browser DAL prepares and publishes validated runtime
information through contracts; the persistence tier remains separate.

**Capabilities** — expose only what DA-01…25 already provide (intake,
validation, normalization, enrichment, deduplication, quality scoring,
consent/provenance handling, routing, publication preparation, diagnostics).
No new acquisition sources or connectors.

**CL-to-DAL — EXCLUDED** — do not modify
`packages/handoff-contracts/src/cl-feedback.ts` (except a minimal export
repair if compilation is otherwise impossible). No CL feedback ingestion.

**Out of scope** — redesigning DA blocks; changing DA algorithms; new
connectors; any database change; Stage 2B rework; BO/BI/DT/SIM/ADI changes;
CL feedback; broad TypeScript conversion; new frontend framework; new
bundler; unrelated UI changes; BUILD-09.

## 10. Validation Gates

Discover actual commands from repository configuration; never fabricate
commands or results.

1. All 25 authoritative monorepo DA block tests
2. All 25 root DA block tests
3. Structural verification that DA-01…DA-25 root directories exist
4. No block number missing
5. No duplicate block bundled
6. Canonical bundle order verified (DA-01 first … DA-25 last)
7. `node --check data-acquisition/da-bundle.js`
8. Bundle execution smoke test (window shim in Node)
9. `window.INFINICUS.DA` namespace test
10. DA runtime initialization test
11. Route/service registration test
12. `da.runtime.diagnose` test
13. Source-to-root parity tests (byte-identical src copies or equivalent
    behavioural assertions)
14. DAL-to-BO contract type tests
15. DAL-to-BO runtime-validation tests
16. Malformed-handoff rejection tests
17. Tenant/business identity preservation tests
18. Correlation/provenance preservation tests
19. Serializability tests
20. index.html script-presence test
21. index.html script-order test (da-bundle before dt-bundle)
22. Existing root-layer regression tests (ADI, ABA, BI, DT, OM, CL)
23. Existing monorepo regression tests (incl. layer-simulation,
    handoff-contracts suites from BUILD-07)
24. Database regression tests where required by the workspace
    (`pnpm --filter @infinicus/database test`)
25. `pnpm typecheck`
26. `pnpm lint`
27. `pnpm build`

Validation must also confirm: no migration added; no schema added; no
Stage 2B repository duplicated; no database credential in browser code;
`cl-feedback.ts` not implemented; BUILD-09 not implemented; this frozen
specification unchanged during implementation.

## 11. Success Criteria

BUILD-08 is complete only when: all 25 DA blocks exist in the required root
structure, included exactly once, in canonical DA-01→DA-25 order;
`da-bundle.js` is syntax-clean; the DA runtime initializes and
`window.INFINICUS.DA` is available with expected services/routes registered;
runtime diagnostics succeed; `index.html` loads `da-bundle.js` in the
correct architectural position; source-to-root behaviour is preserved;
`dal-to-bo.ts` is a strict, versioned, tested contract (no longer a
placeholder); malformed or invalid handoffs are rejected; all §10 gates pass
(tests, typecheck, lint, build); no database change is introduced; the
completion report is written; queue and manifest state are updated; and
BUILD-09 is not started.
