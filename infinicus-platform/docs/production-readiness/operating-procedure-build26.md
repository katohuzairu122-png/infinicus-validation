# BUILD-26 — Security, Privacy, and Retention: Operating Procedure

## Running a dependency scan manually

```bash
node infrastructure/deployment/scripts/check-dependency-vulnerabilities.mjs
```

Runs automatically in CI (`validate` job, after the browser-secret check). Exit 0: every finding is either absent or on the justified allowlist. Exit 1: prints the un-allowlisted advisory(ies) — either upgrade the affected package or add a justified `ALLOWLIST` entry in the script (never a blanket suppression).

## Running a DAST scan manually

```bash
BASE_URL="http://localhost:3000" infrastructure/deployment/scripts/dast-scan.sh
```

Runs automatically in CI (`build-and-smoke-test-image` job, after the smoke test, against the real running Docker image). Exit 0: every check passes. Exit 1: prints each failing check.

## Handling a right-to-erasure (data deletion) request

```bash
DATABASE_URL="$APP_DATABASE_URL" \
ADMIN_DATABASE_URL="$ADMIN_DATABASE_URL" \
TENANT_ID="<the tenant's uuid>" \
DELETED_BY="<support-ticket-id or operator name>" \
  node infrastructure/database/scripts/delete-tenant-data.mjs
```

This is **permanent and irreversible** — there is no undo (see rollback-procedure-build26.md). The script:
1. Refuses to run if `DATABASE_URL` bypasses RLS.
2. Discovers every tenant-scoped table dynamically (no hand-maintained list to fall out of sync).
3. Computes a safe FK-dependency delete order.
4. Counts, then deletes, every row belonging to the tenant, scoped by an explicit `tenant_id = <TENANT_ID>` filter (never relying on RLS visibility alone — see architecture-and-scope-build26.md for why that distinction matters).
5. Deletes the tenant's workspace(s) and the tenant row itself.
6. Records a permanent audit entry in `platform.data_deletion_events` (tenant name, actor, per-table row counts, timestamp) — the deleted data itself is never stored, only the fact and shape of its deletion.

Recommended: run `export-tenant.sh` (BUILD-22) first if the deletion request doesn't also waive the right to a final data export, since deletion is irreversible.

## Investigating a past deletion

```sql
SELECT tenant_id, tenant_name, deleted_by, deleted_at, table_row_counts
FROM platform.data_deletion_events
ORDER BY deleted_at DESC;
```

## Checking security headers on a live deployment

```bash
curl -sI https://<api-host>/v1/health
```

Expect `x-content-type-options: nosniff`, `x-frame-options`, `strict-transport-security`, `referrer-policy` present on every response (verified by `dast-scan.sh`).
