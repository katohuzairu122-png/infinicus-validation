# BUILD-24 — Secrets and Configuration Management: Rollback Procedure

## Database rollback

One migration to roll back: `0147_create_secret_rotation_events.sql`.

```sql
BEGIN;
DROP TABLE IF EXISTS platform.secret_rotation_events;
DELETE FROM _migrations WHERE filename = '0147_create_secret_rotation_events.sql';
COMMIT;
```

No other migration or existing table is touched by this build — safe to roll back in isolation.

## Application-code rollback

A plain commit revert. Every change in this build is additive:
- New files (`secrets.ts`, `errors.ts`, the three new scripts, the new repository, new tests, new docs) — reverting deletes them cleanly.
- Modified files (`packages/configuration/src/index.ts`, `packages/observability/src/index.ts`, `packages/database/src/index.ts`, `.env.example`, `.github/workflows/ci.yml`) — every change is additive (new exports, a new optional field, a new CI step, corrected documentation) with no removed behavior other than `.env.example`'s fictitious entries, which corresponded to zero code and are safe to lose.

## Rotation rollback

If a rotated database credential must be reverted (e.g. the new value was never actually propagated to the running application before the old one was needed again): the *old* password is gone the instant `ALTER ROLE` commits — there is no automatic revert. The only path back is to rotate again with the previously-known password value, if the operator retained it, or to generate and propagate a fresh one. This is inherent to password rotation, not specific to this build's tooling — documented here so the on-call runbook doesn't assume otherwise.

## Rollback of the CI browser-secret-check step

If `check-no-browser-secrets.mjs` produces a false positive blocking an urgent deploy, the step can be temporarily removed from `.github/workflows/ci.yml`'s `validate` job (a one-line revert) — but any such removal must be treated as a real regression and restored in the same PR that fixes the false positive, not left removed.
