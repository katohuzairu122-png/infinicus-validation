# BUILD-25 — Logging, Monitoring, and Alerting: Rollback Procedure

## Database rollback

One migration to roll back: `0148_create_observability_schema.sql`.

```sql
BEGIN;
DROP TABLE IF EXISTS observability.error_events;
DROP TABLE IF EXISTS observability.alert_events;
DROP SCHEMA IF EXISTS observability;
DELETE FROM _migrations WHERE filename = '0148_create_observability_schema.sql';
COMMIT;
```

No other migration or existing table is touched — safe to roll back in isolation. `error_events` holds only diagnostic data (already-redacted error messages, no raw secrets); `alert_events` holds only operational alert metadata. Neither holds tenant business data whose loss would be irreversible in a business sense.

## Application-code rollback

A plain commit revert. Every change in this build is additive:
- New files (`errorTracking.ts`, `tracing.ts`, the two new repositories, `outboxMonitor.ts`, `observability-audit.cjs`, the observability route/schema, all new tests/docs) — reverting deletes them cleanly.
- Modified files:
  - `packages/observability/src/index.ts` — refactored into a barrel over `logger.ts` (moved, not changed) plus two new re-exported modules; no existing export's behavior changed.
  - `apps/api/src/plugins/errorHandler.ts` — the existing error-response behavior is unchanged; only a fire-and-forget persistence call was added to the pre-existing 500 branch.
  - `apps/api/src/app.ts` — one new route registration, additive.
  - `packages/database/src/index.ts` — new export section, additive.

## Rollback of a triggered alert

`resolve-alert <id>` sets `resolved_at` — there is no "un-resolve" path (an alert, once resolved, is a closed historical fact, matching every other append-style event table in this platform). If an alert was resolved in error, trigger a new one describing the same condition rather than attempting to reopen the old record.
