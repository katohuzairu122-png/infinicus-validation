# BUILD-27 — Performance and Load Readiness: Security Controls

## No new attack surface

This build adds no new API routes, no new database schema, and no new production runtime code. `load-test.mjs` is an operational script (not deployed with `apps/api`), reads no secret, and its only network behavior is issuing plain HTTP requests to a caller-supplied `BASE_URL` — it cannot be pointed anywhere by an unauthenticated third party since it must be invoked directly with environment variables.

## Rate limiting verified under real concurrent load (not just configured)

Prior builds wired `@fastify/rate-limit` (BUILD-21) and fixed a bug where its legitimate 429s were being redacted to a generic 500 (BUILD-26). This build is the first to genuinely fire concurrent load at it and confirm the protective behavior end-to-end: a 300-request burst at concurrency 20 against the default `RATE_LIMIT_MAX=100` produced exactly 100 successes and 200 real `429` rejections (live-measured, see test-evidence-build27.md) — the limiter degrades the service under overload exactly as intended rather than failing open, crashing the process, or exhausting the connection pool.

## Connection-pool exhaustion resilience verified

A deliberately undersized pool (`max: 2`) under 10 concurrent queries was live-tested to confirm requests queue and all eventually succeed, rather than the pool throwing, hanging indefinitely, or leaking connections. This is a direct defense against a denial-of-service class where an attacker (or a runaway internal job) opens many slow concurrent queries — the pool degrades gracefully instead of taking the whole process down.

## Right-to-erasure (`delete-tenant-data.mjs`) integrity fixes — two real defects found and fixed

1. **Workspace-scoping gap** (found live during this build's own fixture cleanup): the script previously left ~300 of 442 tenant-scoped tables' rows completely undeleted for any tenant using a workspace beyond the RLS session context it set — a serious, silent incompleteness in a GDPR-style erasure mechanism that had gone undetected since BUILD-26 because that build's own live drill used a minimal fixture tenant that never exercised those specific tables. Fixed and re-verified live (see test-evidence-build27.md); the sibling `export-tenant.sh` (BUILD-22) had the identical defect and is fixed the same way, with new regression coverage added to its existing integration test.
2. **Append-only audit-trail conflict**: ~210 tables across every domain are deliberately immutable (`forbid_mutation` trigger, no role can `UPDATE`/`DELETE`) — this is itself a security/integrity control (protecting audit trails, including the BUILD-23 deployment-audit and BUILD-24 secret-rotation-audit tables' own peers, from tampering). The erasure script previously crashed outright the first time it hit one of these tables for a tenant with real usage history, rather than either respecting the immutability guarantee or reporting the conflict. It now explicitly skips these tables (never attempts to bypass the trigger — the audit-integrity guarantee is treated as a hard constraint, not a bug to route around) and honestly reports what was retained versus erased in the immutable `platform.data_deletion_events` audit record itself.

Both fixes preserve every safety property established in BUILD-26 (explicit `WHERE tenant_id = '<TENANT_ID>'` filtering rather than reliance on RLS visibility alone, the RLS-exempt-role refusal check, the cross-tenant-safety regression test) — nothing about the original safety design was loosened, only completed.

## No secrets in load-test output

`load-test.mjs`'s JSON report contains only latency/throughput numbers and the target path — no request/response bodies, no headers beyond what the caller explicitly opts into via `LOAD_TEST_HEADERS`, and that variable itself is never logged back verbatim (only used to construct the outgoing `fetch()` call).
