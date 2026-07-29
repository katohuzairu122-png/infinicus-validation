# BUILD-26 — Security, Privacy, and Retention: Security Controls

## SQL injection

Every database query in this codebase uses parameterized queries (`$1`, `$2`, ... via the `pg` driver) — verified by grep across `packages/database/src` and `apps/api/src` for any string-concatenated or template-literal-interpolated SQL: zero matches. Live-tested: a SQL-injection-style payload in the login `email` field is rejected by Zod's `.email()` format validation before it ever reaches a query (400), and `identity.users` is confirmed still queryable and structurally intact afterward (a real `DROP TABLE` attempt would instead produce a Postgres "relation does not exist" error on the follow-up query, not a clean not-found result).

## XSS (cross-site scripting)

`apps/web` never uses `dangerouslySetInnerHTML` (verified by grep — zero matches) — React/Next.js auto-escapes all rendered text by default, and this codebase introduces no exception to that. `apps/api` is a pure JSON API with no HTML views of its own to inject script into. Live-tested: an XSS-style payload (`<script>alert(1)</script>`) submitted as a registration email is rejected by input validation (400) and never reflected unescaped in the response body.

## CSRF (cross-site request forgery)

**Not applicable, by design.** CSRF requires an ambient credential the browser attaches automatically to cross-site requests (a cookie) — this API uses Bearer-token authentication exclusively (`Authorization: Bearer <token>` header, verified: zero cookie usage anywhere in `apps/api/src`, confirmed by grep). A forged cross-site request cannot include a header the attacker doesn't already know; there is no ambient credential to ride on. This is a genuine architectural property, not an unaddressed gap.

## Security response headers

`@fastify/helmet` (newly added this build) sets `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, and related headers on every response — live-verified on both success and error responses. Content-Security-Policy is deliberately disabled: this is a pure JSON API (no HTML views to protect against injected-script XSS), and a default CSP would break the Swagger UI at `/documentation`, which needs inline scripts/styles to render.

## Bounded payloads

Found and fixed during this build's own live testing: `registerBodySchema`/`loginBodySchema`'s `password` field had no `.max()` (a 100KB+ password was accepted, `201`, and would have been passed to bcrypt — a real CPU-exhaustion DoS vector, since bcrypt's cost scales with input processed). Fixed with `.max(128)` (bcrypt's own effective limit is 72 bytes; 128 is a generous, safe bound for realistic passwords). Similarly bounded: `email` fields (`.max(254)`, RFC 5321), onboarding tenant/workspace name/slug fields (`.max(255)`), decision/outcome `summary` fields (`.max(10_000)`), and the `measurements`/`evidence` arrays in `recordOutcomeBodySchema` (`.max(100)` items).

## Rate limiting

`@fastify/rate-limit` (BUILD-21) is live-verified for the first time this build: a test constructing the app with `RATE_LIMIT_MAX=5` confirms the first 5 requests succeed and the 6th/7th return `429` — not merely configured and assumed correct.

## Controlled, redacted errors — a genuine bug found and fixed

`errorHandler.ts`'s `statusCodeFor(error.name)` lookup couldn't see a well-behaved Fastify plugin's own `.statusCode` (e.g. `@fastify/rate-limit` throws a plain `Error` with `.statusCode = 429` but a generic `.name`) — every such error was previously falling through to the generic 500 branch, incorrectly redacting a legitimate `429` and persisting a false `error_events` entry for it. Fixed by trusting a thrown error's own `.statusCode` when it's a legitimate 4xx value, checked before the name-based lookup's 500 fallback — this never weakens redaction for genuinely unexpected (500-class) errors, which still go through the same redacted, persisted, logged path as before.

## Least privilege and tenant isolation (reused, not duplicated)

Every route requiring elevated access reuses the existing `authenticate` → `resolveTenantContext` → `requirePermission` chain (BUILD-18/21/25). RLS is enabled and forced on every tenant-scoped table. `delete-tenant-data.mjs` refuses to run against a role that bypasses RLS (same check as `export-tenant.sh`).

## Right-to-erasure is tenant-isolation-safe — the second genuine bug found and fixed

See architecture-and-scope-build26.md's "two genuine bugs" section: the first live drill of `delete-tenant-data.mjs` caught a real defect where a blanket `DELETE FROM <table>` relying only on RLS visibility would have deleted every tenant's shared system roles through `tenancy.roles`' nullable-tenant policy. Fixed with an explicit `tenant_id` filter on every applicable table; the fix is covered by an automated test asserting a second tenant's data and platform-shared rows survive a deletion of the first tenant completely untouched.
