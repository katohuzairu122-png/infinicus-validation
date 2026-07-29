# BUILD-26 — Security, Privacy, and Retention: Architecture and Scope

## Purpose

Deliver the platform's security/privacy/retention production-readiness capability: a threat model, dependency scanning, SAST, a lightweight DAST scan, rate-limit and injection-resistance tests, security response headers, an explicit CSRF/XSS/SQLi posture assessment, and a genuine right-to-erasure (tenant data deletion) capability.

## Threat model (STRIDE, scoped to this platform's actual architecture)

| Threat | Relevant surface | Mitigation (existing unless noted) |
|---|---|---|
| **Spoofing** | Bearer-token session/API-key auth (BUILD-18/21) | SHA-256-hashed tokens, DB-verified per request; no ambient/ cookie credential to forge |
| **Tampering** | Request bodies, DB rows | Zod schema validation on every route; parameterized queries throughout (verified: zero string-concatenated SQL in the codebase); RLS enforced at the database layer, not just the app layer |
| **Repudiation** | Actions without an audit trail | `audit.audit_events`/`access_events` (BUILD-18), `observability.error_events` (BUILD-25), and this build's `platform.data_deletion_events` — every consequential action leaves an append-only record |
| **Information disclosure** | Error responses, logs, browser bundle | Redacted 500s (BUILD-21), default log redaction (BUILD-24), browser-secret scanning (BUILD-24), and this build's stack-trace-leak test |
| **Denial of service** | Rate limiting, unbounded payloads | `@fastify/rate-limit` (BUILD-21, now live-tested), and this build's newly-bounded request-body string/array fields (found unbounded — see test-evidence) |
| **Elevation of privilege** | Permission checks, tenant isolation | `AuthorizationService.authorize()` fail-closed (BUILD-18), RLS on every tenant-scoped table, `platform:admin`-gated operational routes (BUILD-25) |

## In scope (spec §2)

- **Threat model** — above.
- **Dependency scanning** — `pnpm audit`, CI-wired via `check-dependency-vulnerabilities.mjs` (a precise, justified allowlist — not a blanket suppression).
- **SAST** — `eslint-plugin-security`, wired into the existing ESLint flat config, running clean.
- **DAST** — `dast-scan.sh`: a real black-box HTTP probe against a live instance (security headers, stack-trace-leak, SQLi/XSS rejection, unauthenticated-admin-route rejection). No OWASP ZAP or similar full DAST suite is installable in this sandboxed environment (no reachable download source) — this covers what's genuinely automatable with curl and meaningful for this API's actual (JSON-only, Bearer-token) shape.
- **Authorization and tenant-isolation tests** — reused; already extensive across every prior build (BUILD-15 through BUILD-25 all include live cross-tenant isolation tests). This build adds the right-to-erasure script's own cross-tenant-safety test (see below).
- **Rate-limit tests** — new live test confirming `@fastify/rate-limit` genuinely returns 429 once the configured limit is exceeded (not merely configured and assumed correct).
- **Input fuzzing** — new tests for SQLi-style, XSS-style, and oversized payloads.
- **Security headers** — `@fastify/helmet` added (was not previously wired in), live-verified.
- **CSRF/XSS/SQLi controls** — see security-controls-build26.md for the full assessment.
- **Privacy workflows** — data export already exists (`export-tenant.sh`, BUILD-22); this build adds data deletion.
- **Retention and deletion** — `delete-tenant-data.mjs`: a genuine, dependency-ordered, cross-tenant-safe right-to-erasure script for a tenant's complete data footprint, with an audit trail (`platform.data_deletion_events`, migration `0149`).

## Out of scope

- A full commercial DAST suite (OWASP ZAP, Burp) — not installable in this sandboxed environment.
- Automated retention-window enforcement (e.g., "auto-delete tenants inactive for N years") — this build delivers the deletion *mechanism*, live-verified; a policy engine deciding *when* to invoke it is a candidate for a future build.
- CSRF tokens — this API has no cookie-based session (Bearer tokens only), so CSRF (which requires an ambient, browser-attached credential) does not apply; documented, not implemented as a non-applicable control.
- Any later-build functionality (BUILD-27 performance, BUILD-28 billing, etc.).

## Architecture

```
apps/api/src/
  app.ts                    — @fastify/helmet registered (CSP off: pure JSON API + Swagger UI needs inline scripts)
  plugins/errorHandler.ts   — fixed to respect a plugin-thrown error's own
                               statusCode (see "genuine bug" below)
  schemas/{auth,onboarding,businesses}.ts — bounded string/array fields added
  tests/{security,dast-scan}.integration.test.ts

infrastructure/deployment/scripts/
  check-dependency-vulnerabilities.mjs   — pnpm audit + justified allowlist
  dast-scan.sh                            — live black-box HTTP probe

infrastructure/database/scripts/
  delete-tenant-data.mjs   — topological-sort-ordered, RLS-scoped tenant erasure

infrastructure/database/migrations/
  0149_create_data_deletion_events.sql   — platform.data_deletion_events (audit trail)

eslint.config.mjs           — eslint-plugin-security wired in
package.json                — pnpm.overrides (postcss patch), pnpm.auditConfig
```

## Two genuine bugs found and fixed during this build's own testing

1. **`errorHandler.ts` silently redacted legitimate 4xx errors to 500.** A live rate-limit test expected `429` and got `500` — `@fastify/rate-limit` throws a plain `Error` with `.statusCode = 429` but a generic `.name`, which `statusCodeFor(error.name)` couldn't map, falling through to the catch-all 500 branch. Fixed by trusting a thrown error's own `.statusCode` when it's a legitimate 4xx value, before falling back to 500.
2. **A blanket `DELETE FROM <table>` relying only on RLS visibility would have deleted every tenant's shared system roles.** `tenancy.roles`' RLS policy uses a nullable-tenant pattern (`tenant_id IS NULL OR tenant_id = ...`) to make platform-shared system roles visible to every tenant — the same pattern `audit.access_events`/`observability.error_events` use. `delete-tenant-data.mjs`'s first live drill hit a real FK violation (`membership_roles` still referencing a role the script was about to delete) that, on inspection, revealed the script would have attempted to delete every tenant's shared roles, not just the target tenant's. Fixed by adding an explicit `WHERE tenant_id = '<TENANT_ID>'` to every table with a literal `tenant_id` column (verified per-table via `information_schema`, not assumed) — re-verified with an automated test asserting a second tenant's data and platform-shared system roles survive completely untouched.

## Dependency

BUILD-25 (completed).
