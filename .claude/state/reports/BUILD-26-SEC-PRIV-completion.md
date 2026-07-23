BUILD-26 COMPLETION REPORT — SECURITY PRIVACY AND RETENTION

Build ID: BUILD-26
Layer: SEC-PRIV
Date: 2026-07-23
Branch: claude/infinicus-engine-debug-3loqb4
Specification: docs/implementation-queue/BUILD-26-SEC-PRIV-SPECIFICATION.md
Specification SHA-256: 44f00cc26a3a1caeba455c76714d4c671ea7b9d2a9345535cabf917a989677e1
Status: COMPLETE

WHAT WAS BUILT

A STRIDE-based threat model scoped to this platform's real architecture.
Dependency scanning (pnpm audit, CI-wired via a precise, justified
allowlist script). SAST (eslint-plugin-security, wired into the existing
ESLint config, running clean). A lightweight, real DAST scan
(dast-scan.sh) probing a live instance for security headers,
stack-trace leakage, SQLi/XSS rejection, and unauthenticated-admin-route
rejection. Live rate-limit and injection-resistance tests. Standard
security response headers (@fastify/helmet, not previously wired in).
Bounded request-body payloads (found and fixed several genuinely
unbounded string/array fields). An explicit, documented CSRF-not-
applicable / SQLi-mitigated / XSS-mitigated assessment. A genuine
right-to-erasure capability (delete-tenant-data.mjs): dependency-ordered,
cross-tenant-safe, audited deletion of a tenant's complete data
footprint (platform.data_deletion_events, migration 0149).

FILES CREATED

apps/api/tests/security.integration.test.ts
apps/api/tests/dast-scan.integration.test.ts
packages/database/tests/delete-tenant-data.integration.test.ts
infrastructure/deployment/scripts/check-dependency-vulnerabilities.mjs
infrastructure/deployment/scripts/dast-scan.sh
infrastructure/database/scripts/delete-tenant-data.mjs
infrastructure/database/migrations/0149_create_data_deletion_events.sql
infinicus-platform/docs/production-readiness/{architecture-and-scope,
  configuration,operating-procedure,security-controls,test-evidence,
  rollback-procedure,known-limitations}-build26.md

FILES MODIFIED

apps/api/src/app.ts (@fastify/helmet registered)
apps/api/src/plugins/errorHandler.ts (fixed to respect a plugin-thrown
  error's own legitimate 4xx statusCode before falling back to the
  redacted-500 path — see "genuine bugs" below)
apps/api/src/schemas/{auth,onboarding,businesses}.ts (bounded several
  genuinely unbounded string/array fields)
apps/api/package.json (@fastify/helmet dependency added)
eslint.config.mjs (eslint-plugin-security wired in)
package.json (eslint-plugin-security devDependency; pnpm.overrides for
  postcss only — a broader vite/esbuild override was attempted, broke
  every apps/api test, and was reverted, see VALIDATION; pnpm.auditConfig
  for the vitest CVE)
.github/workflows/ci.yml (dependency-vulnerability-scan step added to
  validate job; DAST-scan step added to build-and-smoke-test-image job)

ARCHITECTURE

delete-tenant-data.mjs reuses export-tenant.sh's (BUILD-22) exact
tenant-scoped-table discovery mechanism (pg_policies referencing
app.tenant_id) rather than a second, parallel notion of "which tables
are tenant data" — computes a real FK-dependency topological sort via
pg_constraint, drives all DB interaction through psql subprocess calls
(matching every other infrastructure/ script's convention, since this
script lives outside any workspace package and has no npm dependencies
of its own). check-dependency-vulnerabilities.mjs and dast-scan.sh
mirror the established CLI/live-target script patterns from BUILD-23/24.
No later-build functionality added; no duplicated infrastructure
(authorization/tenant-isolation testing, health/readiness endpoints all
reused unchanged).

SECURITY

See security-controls-build26.md in full. SQLi: parameterized queries
throughout, verified. XSS: no dangerouslySetInnerHTML, verified; input
validation rejects injected payloads. CSRF: not applicable (Bearer-token-
only auth, no cookies, documented at length). Security headers: helmet
live-verified on success and error responses. Bounded payloads: several
genuine gaps found and fixed. Rate limiting: live-verified for the first
time (429 after the configured threshold). Redacted errors: a real bug
(legitimate 4xx incorrectly redacted to 500) found and fixed.

TENANCY AND AUTHORIZATION

Reused, not duplicated — extensive cross-tenant isolation testing
already exists across every prior persistence build. This build adds
one new tenancy-adjacent capability (delete-tenant-data.mjs) whose own
first live drill caught and fixed a real cross-tenant data-safety bug
(a blanket DELETE relying only on RLS visibility would have deleted
every tenant's shared system roles) — now covered by an automated test
asserting a second tenant's data and platform-shared rows survive
completely untouched.

DATABASE CHANGES

One migration: 0149_create_data_deletion_events.sql. New table
platform.data_deletion_events (append-only audit trail: tenant_id,
tenant_name, deleted_by, table_row_counts jsonb, deleted_at). One index.
No existing table, schema, or migration touched.

API CHANGES

No new routes. @fastify/helmet registered globally (security headers on
every response). errorHandler.ts's status-code resolution fixed (a
behavior correction, not a contract change — every already-correct
status code is unchanged). Three request-body schemas gained .max()
bounds on previously-unbounded fields.

UI CHANGES

None.

CONFIGURATION

No new required environment variables.

OBSERVABILITY

No changes — BUILD-25's error tracking/redaction already covers the
errorHandler.ts paths this build touches.

TESTS

13 new tests across 3 new test files, plus genuine live drills: a full
dependency-scan run (11 real findings triaged down to 1 justified
allowlist entry), a full SAST run (0 new findings), a full DAST scan
against a real running instance (7/7 checks green), a full tenant-
deletion drill against a real populated scratch tenant (verified
complete erasure + zero cross-tenant impact), and live rate-limit/
injection-resistance testing.

VALIDATION

pnpm typecheck: 26/26 tasks pass.
pnpm lint: 23/23 packages pass, 0 errors (eslint-plugin-security active,
0 new findings; 5 pre-existing unrelated console-statement warnings).
pnpm build: 23/23 packages build successfully.
Frozen-migration byte-identity: git status --porcelain on
infrastructure/database/migrations/ — only 0149 new.
Empty-database install: migration 0149 applied cleanly to the local dev
database; platform.data_deletion_events verified present.
Migration idempotency: re-ran migration-gate.sh — 0149 reported skip.
Full regression: packages/database 2786 passed | 22 skipped (37 files) ·
configuration 31 · observability 18 · authentication 45|1 skip ·
authorization 25|1 skip · onboarding 12|1 skip · workflow 12|1 skip ·
web 14 · api 44 passed | 7 skipped (7 files).
A dependency-scan remediation attempt (pnpm.overrides forcing vite/
esbuild to their patched versions) broke every apps/api test
(ReferenceError: __vite_ssr_exportName__ is not defined) — the
unbounded override resolved vite to 8.1.5, incompatible with vitest
1.6.1's internal SSR pipeline. Reverted; kept only the safe postcss
override. Full detail in test-evidence-build26.md.

ROLLBACK

One migration to roll back via a documented DROP TABLE/DELETE FROM
_migrations transaction (platform.data_deletion_events holds no tenant/
business data, only deletion metadata). Application-code rollback is a
plain commit revert. delete-tenant-data.mjs itself has no rollback, by
design — a right-to-erasure operation is meant to be permanent; the only
recovery path for an erroneous invocation is a full database restore
from a pre-deletion backup (BUILD-22), which is documented as a last
resort, not a routine path.

REGRESSION RESULTS

All prior domains pass unchanged. No frozen migration touched.
apps/api/tests/api.integration.test.ts's previously-noted-flaky
paginated-listing test (BUILD-25's own report) passed cleanly in this
build's full regression run.

OUT-OF-SCOPE CONFIRMATION

No full commercial DAST suite (not installable in this sandboxed
environment). No automated retention-window policy (the deletion
mechanism is delivered and live-verified; deciding *when* to invoke it
is a future build's scope). CSRF tokens not implemented (genuinely not
applicable — documented, not a gap). No later-build functionality
(BUILD-27 performance, BUILD-28 billing, etc.) begun.

KNOWN LIMITATIONS

See known-limitations-build26.md: DAST scope is narrow and curl-based,
not a full commercial suite; vitest's critical CVE and sharp's high
advisory are assessed-unreachable, not patched (both re-verifiable
triggers documented); delete-tenant-data.mjs's table-safety
categorization is schema-introspection-driven and covered by an
automated regression test, not a formal proof; no automated retention-
window scheduler; CSRF assessment would need revisiting only if
cookie-based auth is ever introduced; the threat model is this build's
own scoped audit, not a continuously-maintained artifact.

QUEUE TRANSITION

BUILD-26: ready -> in_progress -> completed.
Per the user's explicit "continue to full completion of all the builds
(30)" instruction, BUILD-27 is being readied and started immediately
following this report.

Commit: (this commit)
Branch: claude/infinicus-engine-debug-3loqb4
PR: #10
Next build: BUILD-27 (PERF — Performance)
