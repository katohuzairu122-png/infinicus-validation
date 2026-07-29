# BUILD-26 — Security, Privacy, and Retention: Rollback Procedure

## Database rollback

One migration to roll back: `0149_create_data_deletion_events.sql`.

```sql
BEGIN;
DROP TABLE IF EXISTS platform.data_deletion_events;
DELETE FROM _migrations WHERE filename = '0149_create_data_deletion_events.sql';
COMMIT;
```

No other migration or existing table is touched — safe to roll back in isolation. The table holds only deletion metadata (never the deleted data itself).

## Application-code rollback

A plain commit revert. Every change in this build is additive or a targeted, backward-compatible fix:
- New files (`security.integration.test.ts`, `dast-scan.integration.test.ts`, `delete-tenant-data.mjs`, `dast-scan.sh`, `check-dependency-vulnerabilities.mjs`, `delete-tenant-data.integration.test.ts`, all docs) — reverting deletes them cleanly.
- `apps/api/src/app.ts` — one new plugin registration (`@fastify/helmet`), additive.
- `apps/api/src/plugins/errorHandler.ts` — the fix (trusting a legitimate 4xx `.statusCode`) only changes behavior for errors that previously fell through to an incorrect 500; every already-correct status-code path is unchanged.
- `apps/api/src/schemas/{auth,onboarding,businesses}.ts` — added `.max()` bounds only; every value that was valid before remains valid (the bounds are generous, real-world limits, not arbitrary restrictions that would reject legitimate existing data).
- `eslint.config.mjs`/`package.json` — SAST plugin and dependency-scan tooling, does not affect runtime behavior at all.

**Important**: reverting the `errorHandler.ts` fix would silently reintroduce the redacted-429 bug — if this build is ever rolled back, re-verify rate-limit behavior manually (`security.integration.test.ts`'s rate-limiting test) before considering the rollback complete.

## `delete-tenant-data.mjs` has no rollback

**By design and by regulatory intent** — a right-to-erasure operation is meant to be permanent. There is no "undo" script, and none should be built: retaining the deleted data anywhere (even temporarily, even for rollback purposes) would defeat the entire purpose of the deletion. `platform.data_deletion_events` records that a deletion happened and its shape (per-table row counts), never the data itself. If an erasure was triggered in error, the only recovery path is restoring from a pre-deletion database backup (see BUILD-22's `restore.sh`/PITR procedures) — which itself would restore *every* tenant's data as of that point in time, not just the erased one, and should only be considered for a genuine operational mistake, never as a routine recovery path.
