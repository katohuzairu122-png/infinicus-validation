# BUILD-30 — Production Acceptance and Launch: Operating Procedure

## Running the full launch acceptance check

```bash
DATABASE_URL="postgresql://app_test_user:PW@HOST:5432/DB" \
ADMIN_DATABASE_URL="postgresql://admin_role:PW@HOST:5432/DB" \
  node infrastructure/deployment/scripts/launch-acceptance-check.mjs
```

Prints `PASS`/`FAIL` per check and exits non-zero if any check fails. This is the single command a release manager runs before approving a promotion — it covers migration state, smoke test, monitoring-gate verification, load-target proof, billing proof, and incident-tracking proof in one pass.

## Running the remaining acceptance-matrix items (not covered by the script above)

These reuse prior builds' own tools directly, run separately since they either need their own live-booted instance or are independently valuable evidence outside the in-process script:

```bash
# Security gates (BUILD-26)
node infrastructure/deployment/scripts/check-dependency-vulnerabilities.mjs
BASE_URL="http://<live-instance>" infrastructure/deployment/scripts/dast-scan.sh

# Restore proof, privacy proof, critical-workflow sign-off (BUILD-22/26/27/21)
DATABASE_URL="..." ADMIN_DATABASE_URL="..." \
  npx vitest run tests/backup-restore.integration.test.ts \
    tests/export-tenant.integration.test.ts tests/delete-tenant-data.integration.test.ts   # packages/database
DATABASE_URL="..." ADMIN_DATABASE_URL="..." npx vitest run tests/api.integration.test.ts    # apps/api
```

## Reading the launch checklist

`docs/launch/LAUNCH-CHECKLIST.md` is the compiled acceptance matrix — every row cites either a fresh re-run from this build or a specific prior build's own evidence. Read it in full before approving a staging or production promotion; it also documents the one noted exception (a single load-test run's p99 marginally exceeding target, resolved on re-run) and this build's own genuine findings, rather than presenting an unqualified "everything passed."

## Approving staging/production

This build deliberately does not auto-approve a promotion. A human reviewer reads `LAUNCH-CHECKLIST.md`, confirms the evidence is current (re-run the acceptance check if meaningful time has passed since the checklist was last compiled), and then proceeds with BUILD-23's existing promotion mechanism:

```bash
ENVIRONMENT="staging" DATABASE_URL="<admin-capable connection string>" BASE_URL="<staging base URL>" DEPLOYED_BY="$(whoami)" \
  infrastructure/deployment/scripts/deploy.sh
```

BUILD-23's promotion gate already enforces that staging must have a `succeeded` deployment on record before production is even eligible — this build's checklist is the human-readable justification for approving that first staging promotion, not a replacement for `deploy.sh`'s own gate logic.

## Rollback

See rollback-procedure-build30.md. This build ships no migrations and no production runtime code changes (one operational script, one documentation tree, and two small justified additions to an existing script).
