# BUILD-25 — Logging, Monitoring, and Alerting: Architecture and Scope

## Purpose

Deliver the platform's observability production-readiness capability: structured logging (already substantially built by BUILD-21/24, extended here), error tracking, lightweight in-process distributed tracing, database/outbox/workflow monitoring, alerting, a real dashboards-data endpoint, and an honest treatment of SLO reporting.

## In scope (spec §2)

- **Structured logs** — reused from BUILD-21/24 (`packages/observability`'s `createLogger`/`logAuditEntry`, with BUILD-24's default redaction). No changes needed to satisfy this bullet beyond what already exists.
- **Error tracking** — `ErrorTracker` interface + `LoggingErrorTracker`/`CompositeErrorTracker` (`packages/observability/src/errorTracking.ts`); `observability.error_events` table (migration `0148`) + `ErrorEventRepository`; wired into `apps/api`'s central error handler — every unhandled (500) error is persisted, redacted via BUILD-24's `redactSecretValues()`.
- **Distributed tracing** — `startSpan()` (`packages/observability/src/tracing.ts`): genuinely functional in-process span/duration recording with trace/parent propagation, logged as structured events. No real tracing backend is connected (see known-limitations).
- **Database monitoring** — `GET /v1/metrics` exposes `poolStats()` (already built by BUILD-22), reused not duplicated.
- **Job/outbox monitoring** — `getOutboxBacklog()` (`packages/database/src/repositories/observability/outboxMonitor.ts`), querying the pre-existing `events.outbox_events` table (migration `0007`) for pending/failed/dead-lettered counts and oldest-pending age.
- **Workflow monitoring** — reused: every API request through `packages/workflow`'s routes already gets a `logAuditEntry` line (BUILD-21) and is now additionally covered by the same error-tracking path as every other route. No workflow-specific monitoring infrastructure was duplicated.
- **Health/readiness endpoints** — reused unchanged (`/v1/health`, `/v1/ready`, BUILD-21/22).
- **Alerts** — `observability.alert_events` table + `AlertEventRepository` (trigger/resolve/listActive/listForAlertName); `observability-audit.cjs`'s `check-outbox-lag`/`check-error-rate` commands (exit-code-driven, the same pattern BUILD-23/24's audit CLIs already establish) plus `trigger-alert`/`resolve-alert`.
- **Dashboards** — `GET /v1/metrics`: a real, `platform:admin`-gated JSON endpoint a dashboard tool would consume (pool stats, process metrics, error rate, outbox backlog, active alert count). No dashboard UI is stood up (see known-limitations).
- **SLO reporting** — `observability-audit.cjs summary`: a real, computed operational summary. Deliberately does **not** fabricate an availability/SLO percentage — that requires a request-volume denominator this build does not add (see known-limitations).

## Out of scope

- A real APM/error-tracking backend (Sentry, Bugsnag) or tracing backend (Jaeger, an OTel collector) — none reachable from this sandboxed environment. `ErrorTracker`/`startSpan()` are the documented seams.
- Automated/scheduled alert checking (a cron triggering `observability-audit.cjs check-outbox-lag`) — manually-invoked, live-verified, mirroring BUILD-22/24's drill treatment.
- A real dashboard UI (Grafana or similar) — `/v1/metrics` is the data source a future one would consume.
- A true SLO/availability percentage — requires request-volume tracking this build does not add.
- Any later-build functionality (BUILD-26 security/privacy, BUILD-27 performance, etc.).

## Architecture

```
packages/observability/src/
  logger.ts         — createLogger/withCorrelationId/logAuditEntry/DEFAULT_REDACT_PATHS
                       (moved out of index.ts to break a circular import
                       with errorTracking.ts/tracing.ts, no behavior change)
  errorTracking.ts   — ErrorTracker, LoggingErrorTracker, CompositeErrorTracker
  tracing.ts         — startSpan()
  index.ts           — barrel re-export

packages/database/src/repositories/observability/
  ErrorEventRepository.ts   — observability.error_events (tenant-nullable RLS)
  AlertEventRepository.ts   — observability.alert_events (platform-scoped, no RLS)
  outboxMonitor.ts           — getOutboxBacklog() over events.outbox_events

apps/api/src/
  plugins/errorHandler.ts   — extended: unhandled errors persist to
                               ErrorEventRepository, redacted, fire-and-forget
  routes/observability.ts   — GET /v1/metrics (platform:admin-gated)

infrastructure/deployment/scripts/
  observability-audit.cjs   — check-outbox-lag / check-error-rate /
                               trigger-alert / resolve-alert / summary
```

`observability.error_events` mirrors `audit.access_events`' tenant-nullable RLS pattern (BUILD-18). `observability.alert_events` mirrors `platform.deployment_events`/`secret_rotation_events`' platform-scoped no-RLS pattern (BUILD-23/24).

## A real bug found and fixed during this build's own testing

`ErrorEventRepository.countSince()`/`listRecent()` and `getOutboxBacklog()` initially failed with `invalid input syntax for type uuid: ""` when exercised through `GET /v1/metrics` — the exact class of bug BUILD-19 already discovered and fixed (a Postgres session variable set via `SET LOCAL` on a pooled connection reverts to an empty string, not `NULL`, once that transaction commits; a later transaction reusing the same physical connection then fails casting `''::uuid`). Fixed by applying BUILD-19's own nil-UUID sentinel pattern to every one of these methods.

## Dependency

BUILD-24 (completed).
