BUILD-31 COMPLETION REPORT — DATA ACQUISITION RUNTIME FOUNDATION



Build ID: BUILD-31

Layer: DATA-ACQUISITION-RUNTIME

Date: 2026-08-27

Branch: claude/infinicus-engine-debug-3loqb4

Implementation commit: 083abfe

Specification: docs/implementation-queue/BUILD-31-DATA-ACQUISITION-RUNTIME-SPECIFICATION.md

Specification SHA-256: 53d797086f2d0bb722c05d15a3431de116aa76fdcacf93590ba2cc78feba429f

Status: COMPLETE



WHAT WAS BUILT



BUILD-31 delivers the first production Data Acquisition runtime slice for INFINICUS.



The implementation provides:



\* Governed data-source and connector registration, lookup, listing, and lifecycle status transitions, each under an optimistic-concurrency guard.

\* Synchronous manual JSON intake: validate, persist, quality-score, provenance-record, and transition a collection run to `validated` or `quarantined` — a single atomic sequence.

\* Deterministic per-record validation (type, size, and depth limits) and deterministic six-dimension quality scoring against the spec's own weights and thresholds.

\* SHA-256 provenance hashing over a canonical-JSON record representation, with parent-lineage depth enforcement.

\* Publication-package preparation and controlled publication into Business Operations, atomically transitioning the source collection run alongside the package.

\* A transactional outbox emitting all nine required `da.*` events on the same database client as the domain write they describe.

\* Fastify routes for every operation above, authenticated, tenant-scoped, permission-gated (`da:read`/`da:write`/`da:admin`), idempotency-protected on every mutation, and documented in the generated OpenAPI spec.

\* Live PostgreSQL validation at every layer: repository, runtime-service, and HTTP-route levels.



WHAT WAS ALREADY IN PLACE BEFORE THIS COMMIT



A prior session had merged the DA persistence-layer foundation: migrations, the guarded-transition helper, the transactional outbox wrappers, and initial repository classes. The implementation-status queue still recorded BUILD-31 as `status: "ready"` with `testsPass: false` — the runtime service layer and the Fastify API described by the spec did not yet exist, and several repository methods (duplicate-code handling, pagination, lineage-depth enforcement, the publication-package state machine) were incomplete or absent. This commit closes that gap end to end, following the specification's own five-phase implementation order.



NEW PACKAGE: @infinicus/data-acquisition-runtime



\* `validation/ManualRecordValidator.ts` — per-record structural validation (unsupported types including class instances/Date/Map are rejected, not silently accepted; size, depth, and array-length limits).

\* `quality/DataQualityScoringService.ts` — completeness, validity, consistency, timeliness, uniqueness, and conformity scoring on the spec's own 0–100 scale, converted to the database's `numeric(5,4)` fraction scale only at the persistence boundary.

\* `provenance/ProvenanceService.ts` — canonical-JSON serialization (sorted object keys, preserved array order) and SHA-256 hashing, recorded atomically with a `canonicalize` transformation record.

\* `publication/PublicationService.ts` — pure readiness assertions for package preparation and publish, throwing `PublicationNotReadyError`/`QualityThresholdError`.

\* `DataAcquisitionService.ts` — orchestrates the full lifecycle: source/connector CRUD with cross-business ownership checks, the 14-step manual-intake sequence with the transaction boundaries the spec's atomicity rules require (run creation+start commits durably before intake processing begins, so a later failure has a real run to mark `failed`), and publication preparation/publish.



REPOSITORY-LAYER FIXES



\* `DataSourceRepository`: unique-violation on `data_sources_code_unique` now translates to `DuplicateSourceCodeError` instead of a raw Postgres error; added `findBySourceCode`, `listByBusiness` (paginated, status-filterable), and rewrote `updateStatus` onto the guarded-transition helper.

\* `ProvenanceRepository`: a non-resolving `parentProvenanceId` and exceeding `MAX_LINEAGE_DEPTH` (50) now throw `ProvenanceError` instead of silently defaulting depth to 0; added `listByCollectionRun`.

\* `PublicationPackageRepository`: rewritten with an explicit state machine (`draft -> ready -> published`, `ready|published -> revoked`) and an atomic `publish()`/`publishOn()` that also transitions the linked collection run to `published` on the same client — no FK column existed for this link previously, so `publish` now takes the run id explicitly.

\* Three new domain errors (`CollectionLimitExceededError`, `PublicationNotReadyError`, `QualityThresholdError`) added alongside the pre-existing DA error set, all mapped in `apps/api/src/errors.ts`'s status-code table (`InvalidStateTransitionError` was found unmapped during an earlier verification pass and fixed at that time; the three new errors are mapped in this commit).



API LAYER



\* `apps/api/src/schemas/dataAcquisition.ts` — Zod request/response schemas for every route.

\* `apps/api/src/routes/dataAcquisition.ts` — 17 routes covering source lifecycle, connector lifecycle, manual intake, collection-run reads (run, validation results, quality score, provenance), and publication-package prepare/publish/list/get. Every mutating route requires an `Idempotency-Key` header and an active subscription, matching the existing convention used by every other route file in this API. Permission codes (`da:read`/`da:write`/`da:admin`) were already seeded for every system role in `0137_seed_auth_roles_permissions.sql` — no new seed migration was needed.

\* Registered in `apps/api/src/app.ts`; `@infinicus/data-acquisition-runtime` added as a workspace dependency of `apps/api`.



VALIDATION PERFORMED (live, not just typechecked)



\* `packages/database` full test suite: 2,899 passed, 25 skipped, 41 files — including 129 DA repository tests (up from prior runs, extended with new `PublicationPackageRepository` and `ProvenanceRepository` cases for this commit).

\* `@infinicus/data-acquisition-runtime`: 73 tests (59 unit, 14 live-database integration) — run twice consecutively for stability, both green.

\* New `apps/api/tests/dataAcquisition.integration.test.ts`: 11 live HTTP-level integration tests via `app.inject()` against a real PostgreSQL instance — permission denial, source/connector lifecycle, duplicate-code conflict, soft-delete, manual intake (happy path reading back every derived resource, inactive-source rejection, missing-idempotency-key rejection), and publication-package prepare/publish/list/get including double-publish rejection. Run twice consecutively for stability, both green.

\* Full `@infinicus/api` package test suite (11 files, including the pre-existing BUILD-21/25/26/27/28/29/30 integration suites): 67 passed, 11 skipped, all green — confirming the new routes do not regress any existing route, and that OpenAPI JSON generation (initially broken by an invalid raw-JSON-Schema 204 response definition, fixed to use `z.null()` matching the existing `auth.ts` convention) succeeds.

\* Workspace-wide `turbo run typecheck lint`: 61/61 tasks pass.

\* Workspace-wide `turbo run build`: 27/27 tasks pass, including `apps/web` and `apps/admin`.

\* `git diff --check`: clean, no whitespace errors.



KNOWN PRE-EXISTING GAP (not introduced by this commit, not fixed by this commit)



A workspace-wide `turbo run test` shows 12 of 49 test tasks failing with `sh: vitest: not found` — `@infinicus/shared-types`, `@infinicus/event-contracts`, `@infinicus/testing`, `@infinicus/admin`, and the `layer-*` packages (`business-operations`, `business-intelligence`, `business-digital-twin`, `ai-decision-intelligence`, `approved-business-action`, `outcome-monitoring`, `continuous-learning`, `data-acquisition`). None of these packages were touched by this commit (confirmed via `git status`/`git diff` before any changes were staged). Each of these packages' own `package.json` has a `"test": "vitest run"` script but never declares `vitest` as a dependency, and pnpm's per-package `node_modules/.bin` does not include it — unlike `@infinicus/database`, `@infinicus/data-acquisition-runtime`, and `@infinicus/api`, which do declare it and pass cleanly. This predates this session's changes (confirmed against the committed `HEAD` version of `package.json`) and is outside BUILD-31's scope to fix.



NOT STARTED / DEFERRED (per the frozen spec's own scope)



\* Foodics and other external connector implementations — deferred by the spec itself; only connector registration/lifecycle plumbing (connector-agnostic) is in scope for BUILD-31.

\* Scheduled/webhook-driven collection — only synchronous manual JSON intake is in this build's frozen scope.



NEXT RECOMMENDED TASK



\* No BUILD-32 specification exists yet in `docs/implementation-queue/`. The next build should be authored and frozen before further layer work proceeds, per this repository's own queue discipline.
