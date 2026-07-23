# BUILD-25 — Logging, Monitoring, and Alerting: Operating Procedure

## Viewing operational metrics

```bash
curl -H "Authorization: Bearer <platform:admin token>" \
     -H "X-Tenant-Id: <tenantId>" -H "X-Workspace-Id: <workspaceId>" \
     https://<api-host>/v1/metrics
```

## Checking outbox lag / error rate (manual, or wire into a scheduled job)

```bash
DATABASE_URL="$ADMIN_DATABASE_URL" \
  node infrastructure/deployment/scripts/observability-audit.cjs check-outbox-lag 500 3600
DATABASE_URL="$ADMIN_DATABASE_URL" \
  node infrastructure/deployment/scripts/observability-audit.cjs check-error-rate 15 50
```

Both exit non-zero with an explanatory message on threshold breach — wire the exit code into whatever paging/notification system is available in the target environment (out of scope for this build to integrate directly — see known-limitations).

## Triggering and resolving alerts

```bash
DATABASE_URL="$ADMIN_DATABASE_URL" \
  node infrastructure/deployment/scripts/observability-audit.cjs trigger-alert outbox-lag critical "backlog exceeds 500 pending events"
# -> prints the new alert's id

DATABASE_URL="$ADMIN_DATABASE_URL" \
  node infrastructure/deployment/scripts/observability-audit.cjs resolve-alert <id>
```

## Operational summary

```bash
DATABASE_URL="$ADMIN_DATABASE_URL" \
  node infrastructure/deployment/scripts/observability-audit.cjs summary 60
```

Prints real, computed JSON (error count, outbox backlog, active alert count) for the given window in minutes.

## Investigating a captured error

```sql
SELECT error_name, message, route, status_code, occurred_at
FROM observability.error_events
ORDER BY occurred_at DESC
LIMIT 20;
```

`correlation_id` on each row matches the `X-Correlation-Id` response header the client received — cross-reference with the structured log line from the same request for the full picture (stack trace, request context) that `error_events` deliberately does not persist (kept lean; the log line is the source of truth for full diagnostic detail).

## Reconstructing a trace

`startSpan()`'s logged `trace.span` events share a `traceId` across a call tree — grep the structured logs for a given `traceId` and sort by timestamp to reconstruct the span tree manually (no UI is stood up for this — see known-limitations).
