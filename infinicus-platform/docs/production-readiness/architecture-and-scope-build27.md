# BUILD-27 — Performance and Load Readiness: Architecture and Scope

## Purpose

Deliver genuine, live-measured performance and load-readiness evidence for the platform: a load model, API throughput/concurrent-user measurements, database load, Simulation/ADI concurrency, outbox throughput, a large-tenant test, resilience under connection-pool pressure, a capacity plan, and performance SLOs grounded in real numbers — not simulated or fabricated ones.

## Load model

The platform is a JSON-only, Bearer-token-authenticated Fastify API backed by a single PostgreSQL 16 instance via `pg.Pool` (BUILD-22's pooling/readiness hardening). There is no session affinity, no in-memory server state, and no WebSocket/streaming surface, so the relevant load model is simple: N concurrent HTTP clients issuing short JSON requests, each request doing 0–few database round trips through RLS-scoped queries.

Assumed traffic mix for this SME/mid-market-tenant platform at initial scale:
- **Read-heavy**: business/workflow listing, metrics, readiness/health checks — the majority of request volume.
- **Write bursts**: Simulation/ADI run requests are naturally bursty (a user triggers N scenario runs or reasoning runs at once, e.g. a sensitivity sweep), not steady-state.
- **Background/operational**: outbox emission, deployment/secret-rotation audits, backups — off the request path, already covered by BUILD-22/23/24's own scripts.

This shapes what this build measures: steady-state HTTP throughput/latency (load-test.mjs), a domain-specific burst pattern (Simulation/ADI concurrency tests), and a database-level stress case (large-tenant, small-pool resilience) rather than a generic "requests per second forever" benchmark.

## In scope (spec §2)

- **Concurrent users / API throughput** — `infrastructure/deployment/scripts/load-test.mjs`, a dependency-free Node `fetch`-based load generator (no autocannon/k6 — not installable/needed in this sandboxed single-process environment), producing real p50/p95/p99 latency and throughput against a live, listening `apps/api` instance. Verified via `apps/api/tests/load-test.integration.test.ts` (boots the real app with `app.listen()`, runs the actual script against it).
- **Database load** — 50 concurrent repository reads through the real connection pool, with a post-burst pool-idle assertion (no connection leak).
- **Simulation concurrency** — 20 concurrent simulation run requests/runs against the same scenario version, asserting no id collision/row corruption.
- **ADI concurrency** — the same pattern for 20 concurrent reasoning run requests/runs against the same decision case.
- **Outbox throughput** — see "Genuine finding: outbox emission is not yet wired" below; measures the real `events.outbox_events` INSERT code path under concurrency.
- **Large-tenant test** — bulk-inserts 500 businesses for one tenant and times a real `COUNT(*)`/listing query against a 500+-row tenant.
- **Resilience** — a deliberately undersized connection pool (`max: 2`) under 10 concurrent queries, proving requests queue rather than crash or error.
- **Capacity plan / performance SLOs** — see test-evidence-build27.md, built from this build's own measured numbers.

## Genuine finding: outbox emission is not yet wired into any write path

While building the outbox-throughput test, live inspection (`grep` across every layer/package, not just simulation) showed that **no repository or service-layer code anywhere in this monorepo calls the `emit_*` outbox helper functions** defined in each domain's `NNNN_create_*_triggers_events.sql` migration (e.g. `simulation.emit_run_requested`, `simulation.emit_scenario_created`). They are real, tested SQL primitives (`SELECT ... RETURNING id` into `events.outbox_events`), but nothing in the write path — `SimulationModelRepository.createModel()`, `SimulationRunRepository.createRequest()/createRun()`, etc. — invokes them. A first draft of this test asserted `emitted > 0` after 20 concurrent `createModel()` calls and genuinely measured `emitted === 0`, confirming this is a real gap, not a test bug.

This is out of BUILD-27's scope to fix (wiring outbox emission into every domain's write path is a cross-cutting change touching every layer, not a performance-testing concern), so the test instead measures the actual, currently-exercised outbox code path — concurrent calls to `simulation.emit_run_requested()` directly — which is representative of every `emit_*` wrapper (they all funnel through the same `emit_outbox_event()` primitive). This gap is recorded in known-limitations-build27.md as a finding for a future build.

## Genuine finding: workspace-scoping gap in BUILD-22/26's tenant data scripts

Cleaning up this build's own performance-test fixture data (via BUILD-26's `delete-tenant-data.mjs`) hit a real FK-constraint failure that traced back to a serious, previously-undiscovered defect: the majority of tenant-scoped tables' RLS policies (`~300` of `442`) require **both** `tenant_id` **and** `workspace_id` to match `current_setting()`, but `delete-tenant-data.mjs` (BUILD-26) and `export-tenant.sh` (BUILD-22) only ever set `app.tenant_id`. RLS silently admitted zero rows for every such table — no error, just an incomplete export and an incomplete erasure that later manifested as an orphaned-row FK violation. Both scripts are fixed in this build (loop per-workspace, setting both session variables) and re-verified live; see test-evidence-build27.md and known-limitations-build27.md for the full account, including a third, related finding (append-only audit-trail tables that block deletion by design).

## Out of scope

- A full commercial load-testing platform (k6 Cloud, Gatling, JMeter distributed) — this sandboxed single-process environment cannot usefully drive or interpret results beyond what `load-test.mjs`'s Node-native concurrency already exercises.
- Multi-node/horizontal-scaling load tests — the platform runs as a single `apps/api` process against a single Postgres instance in every environment available here.
- Wiring outbox emission into domain write paths — a cross-cutting change, tracked as a known limitation for a future build, not BUILD-27.
- Building an anonymization/redaction capability for append-only audit-trail tables so tenants with real usage history can be fully erased — a compliance-design decision beyond a performance build's scope; also tracked as a known limitation.
- Any later-build functionality (BUILD-28 billing, BUILD-29 incident response, BUILD-30 launch).

## Architecture

No new services, packages, or database schema are introduced. This build adds:
- One operational script (`load-test.mjs`) alongside BUILD-22/23's existing `infrastructure/deployment/scripts/` and `infrastructure/database/scripts/` tooling.
- Two new live integration test suites (`apps/api/tests/load-test.integration.test.ts`, `packages/database/tests/performance.integration.test.ts`).
- Targeted fixes to two BUILD-22/26 scripts (`export-tenant.sh`, `delete-tenant-data.mjs`) and their existing integration tests, plus a robustness fix to one pre-existing, unrelated flaky assertion in `apps/api/tests/api.integration.test.ts` (found during full regression — see test-evidence-build27.md).
