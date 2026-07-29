# BUILD-25 — Logging, Monitoring, and Alerting: Security Controls

## No secrets in errors, logs, or diagnostics

Every error persisted to `observability.error_events` is passed through `@infinicus/configuration`'s `redactSecretValues()` before storage — a driver-level connection error embedding a raw `DATABASE_URL` is scrubbed before it ever reaches the database, not just before it reaches a client response. `packages/observability`'s `createLogger()` (BUILD-24) continues to apply default path-based redaction to every structured log line, including the new `trace.span` and `errorTracking` log shapes this build adds — no new redaction gap was introduced by either.

## Fail-closed, non-blocking error tracking

Error persistence in `apps/api`'s error handler is fire-and-forget and independently caught (`.catch(...)`) — a database outage or persistence failure never blocks, slows, or crashes the actual error response the caller receives. Error tracking degrading to log-only during a database outage is the correct fail-open behavior for a *diagnostic* subsystem (as opposed to fail-closed for authorization/authentication, which this build does not touch).

## Tenant isolation

`observability.error_events` has RLS (tenant-nullable, mirroring `audit.access_events`) — enabled and forced. `observability.alert_events` is deliberately platform-scoped (no tenant_id/RLS), matching `platform.deployment_events`/`secret_rotation_events` — an operational alert about the platform's own health is not tenant business data. `GET /v1/metrics` reads through the calling connection's RLS context (see configuration-build25.md); no tenant's error/outbox data is exposed to another tenant's caller.

## Least privilege

`GET /v1/metrics` is gated behind `platform:admin` (BUILD-18's most privileged permission, granted only to the `owner` role) — a member-role caller receives 403, live-verified. `observability-audit.cjs`'s cross-tenant-aggregate commands require an explicit `ADMIN_DATABASE_URL`, the same elevated-credential requirement already established for `backup.sh`/`grant-app-role.sh`.

## A genuine bug this build's own security-relevant testing caught

The nil-UUID-sentinel bug described in architecture-and-scope-build25.md (`''::uuid` cast failure on a pooled connection with stale session state) is itself a security-adjacent finding: without the fix, a connection-pool-contaminated session could have caused `GET /v1/metrics` to intermittently 500 rather than deterministically report only the caller's own visible data — an availability, not confidentiality, concern, but one this build's own live testing caught and fixed before it could surface in a real deployment.
