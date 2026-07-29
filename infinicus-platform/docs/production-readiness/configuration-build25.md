# BUILD-25 — Logging, Monitoring, and Alerting: Configuration

## No new environment variables

This build introduces no new environment variables — `DATABASE_URL`/`ADMIN_DATABASE_URL` (BUILD-24's inventory) are the only credentials `GET /v1/metrics` and `observability-audit.cjs` need, and both are already in `SECRET_INVENTORY`.

## GET /v1/metrics response shape

```json
{
  "timestamp": "2026-07-23T15:00:00.000Z",
  "process": { "uptimeSeconds": 1234.5, "memoryRssBytes": 123456789 },
  "databasePool": { "totalCount": 10, "idleCount": 8, "waitingCount": 0 },
  "errors": { "last15Minutes": 0 },
  "outbox": { "pendingCount": 0, "failedCount": 0, "deadLetteredCount": 0, "oldestPendingAgeSeconds": null },
  "activeAlertCount": 0
}
```

`errors.last15Minutes` and `outbox.*` reflect what's visible under the calling connection's RLS-restricted role — both deliberately reset to a nil-tenant session context first (see architecture-and-scope-build25.md's "a real bug found" section), so under the application's own role they report tenant-NULL-scoped figures only, never a leaked prior request's tenant context. For a true cross-tenant platform aggregate, run `observability-audit.cjs summary` with `ADMIN_DATABASE_URL`.

## Permission required

`GET /v1/metrics` requires the `platform:admin` permission (seeded by BUILD-18, granted to the `owner` system role) — reuses the existing `authenticate` → `resolveTenantContext` → `requirePermission` chain, no new auth mechanism.

## `observability-audit.cjs` thresholds

Caller-supplied, not hardcoded:

```bash
DATABASE_URL="$ADMIN_DATABASE_URL" node observability-audit.cjs check-outbox-lag <maxPendingCount> <maxAgeSeconds>
DATABASE_URL="$ADMIN_DATABASE_URL" node observability-audit.cjs check-error-rate <windowMinutes> <maxCount>
```

No default thresholds are baked into this build — an operator (or a future scheduled-check build) chooses values appropriate to their environment.
