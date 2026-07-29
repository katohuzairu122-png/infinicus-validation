BUILD-24 COMPLETION REPORT — SECRETS AND CONFIGURATION MANAGEMENT

Build ID: BUILD-24
Layer: SECRETS
Date: 2026-07-23
Branch: claude/infinicus-engine-debug-3loqb4
Specification: docs/implementation-queue/BUILD-24-SECRETS-SPECIFICATION.md
Specification SHA-256: 9e9af3f9dc0f1de6dda0d4a4c768677734f0c1a80435ab9343c287445e599b71
Status: COMPLETE

WHAT WAS BUILT

A declarative secret inventory (packages/configuration/src/secrets.ts) verified
against actual source — every process.env reference server-side code makes,
classified secret/non-secret, with owner and rotation policy. A production
credential guard that fails closed if a production process's DATABASE_URL
looks like a local/CI disposable credential. A SecretProvider abstraction
(EnvSecretProvider today; the seam a real cloud secret manager attaches to
later). Default log redaction wired into every logger this platform
constructs (packages/observability), plus a free-text secret-value scrubber
for error messages. A rotation/expiration audit trail
(platform.secret_rotation_events, migration 0147) with a live-tested
database-credential rotation script enforcing Postgres's own VALID UNTIL
expiry. A genuinely enforced, CI-wired browser-secret-prevention static
scan. A corrected .env.example (the previous one listed six environment
variables — SUPABASE_URL/ANON_KEY/SERVICE_ROLE_KEY, JWT_SECRET, JWT_EXPIRY,
SENTRY_DSN — that zero code in this repository has ever read, a stale
leftover predating this monorepo's real configuration schema).

FILES CREATED

packages/configuration/src/errors.ts
packages/configuration/src/secrets.ts
packages/configuration/tests/secrets.test.ts
packages/database/src/repositories/secrets/errors.ts
packages/database/src/repositories/secrets/SecretRotationEventRepository.ts
packages/database/src/repositories/secrets/index.ts
packages/database/tests/secret-rotation-events.integration.test.ts
packages/database/tests/secret-rotation-audit-cli.integration.test.ts
apps/web/tests/browser-secret-check.integration.test.ts
infrastructure/database/migrations/0147_create_secret_rotation_events.sql
infrastructure/deployment/scripts/secret-rotation-audit.cjs
infrastructure/deployment/scripts/rotate-db-credential.sh
infrastructure/deployment/scripts/check-no-browser-secrets.mjs
infinicus-platform/docs/production-readiness/{architecture-and-scope,
  configuration,operating-procedure,security-controls,test-evidence,
  rollback-procedure,known-limitations}-build24.md

FILES MODIFIED

packages/configuration/src/index.ts (production-credential guard added;
  re-exports secrets.ts; ConfigurationError moved to errors.ts, no behavior
  change to existing exports)
packages/configuration/tests/loadConfig.test.ts (3 new tests appended;
  no existing test changed)
packages/observability/src/index.ts (createLogger() gains default redaction
  + optional destination/redactPaths fields; existing call sites unaffected)
packages/observability/tests/logger.test.ts (4 new tests appended; existing
  tests re-pointed at a capturing destination, same assertions)
packages/database/src/index.ts (BUILD-24 export section added)
.env.example (rewritten to match the real, verified secret inventory)
.github/workflows/ci.yml (browser-secret-check step added to validate job)

ARCHITECTURE

packages/configuration is the single source of truth for the secret
inventory (SECRET_INVENTORY) and its provider abstraction (SecretProvider/
EnvSecretProvider). packages/observability (already a dependency of
configuration) consumes SECRET_REDACTION_LOG_PATHS directly rather than
requiring every caller to wire it in. packages/database's new
repositories/secrets/ mirrors BUILD-23's repositories/deployment/ pattern
exactly (plain withTransaction(), no RLS, platform-scoped table).
infrastructure/deployment/scripts/secret-rotation-audit.cjs mirrors
BUILD-23's deployment-audit.cjs (argv-only CLI, no shell-interpolated
node -e strings). No later-build functionality added; no duplicated
infrastructure (least privilege reuses grant-app-role.sh unchanged).

SECURITY

Fail-closed startup (missing secret, non-numeric field, or production-
credential mismatch all throw ConfigurationError before the process ever
listens). No secrets in source (.env.example uses placeholders only). No
secrets in logs (default path-based redaction, live-verified). No secrets
in errors (redactSecretValues, live-verified). No secrets in browser
bundles (check-no-browser-secrets.mjs, live-verified against both a clean
and a deliberately-violating fixture, CI-wired). Least privilege and
tenant isolation reused unchanged from BUILD-18/22/23 — not duplicated,
not weakened.

TENANCY AND AUTHORIZATION

Not applicable — platform.secret_rotation_events is platform-scoped (no
tenant_id/RLS), matching platform.deployment_events/system_settings/
feature_flags. No tenant-facing code path was touched.

DATABASE CHANGES

One migration: 0147_create_secret_rotation_events.sql. New table
platform.secret_rotation_events (append-only: no update/transition method
on its repository, no updated_at trigger — a rotation event is a
permanent historical fact). One index
(idx_secret_rotation_events_secret_name_rotated_at). No existing table,
schema, or migration touched.

API CHANGES

None. This build's scope is configuration/deployment tooling, not the
HTTP API surface.

UI CHANGES

None. This build's browser-secret-prevention check reads apps/web/apps/admin
source but modifies no UI code.

CONFIGURATION

packages/configuration/src/secrets.ts's SECRET_INVENTORY is the canonical,
verified list (11 environment variables: 2 secret, 9 non-secret — see
configuration-build24.md's full table). .env.example rewritten to match.

OBSERVABILITY

packages/observability's createLogger() now redacts known-sensitive log
paths by default (config.databaseUrl, config.adminDatabaseUrl,
req.headers.authorization, *.password, *.connectionString) — live-verified
via a captured pino output stream, not just configured and assumed
correct.

TESTS

41 new tests across 6 new/modified test files (see test-evidence-build24.md
for the exact per-file breakdown), plus 3 genuine live drills: a full
database-credential rotation cycle (old password rejected, new password
accepted, audit record correct, VALID UNTIL expiry genuinely enforced by
Postgres), secret-expiration checking across three real scenarios, and the
browser-secret scanner against both clean and deliberately-violating
fixtures.

VALIDATION

pnpm typecheck: 26/26 tasks pass.
pnpm lint: 23/23 packages pass, 0 errors (5 pre-existing unrelated
console-statement warnings in packages/database).
pnpm build: 23/23 packages build successfully.
Frozen-migration byte-identity: git status --porcelain on
infrastructure/database/migrations/ — only 0147 new.
Empty-database install: migrations 0001-0147 applied cleanly to the local
dev database (continuing from the 0146 baseline); platform.
secret_rotation_events verified present with its index.
Migration idempotency: re-ran migration-gate.sh — 0147 reported skip.
Full regression: packages/database 2764 passed | 18 skipped (33 files) ·
configuration 31 · observability 9 · authentication 45|1 skip ·
authorization 25|1 skip · onboarding 12|1 skip · workflow 12|1 skip ·
web 14 · api 32|4 skip. A single transient timeout occurred in
packages/onboarding under concurrent turbo run test (shared local
Postgres contention, unrelated to this build — onboarding was not
touched); re-ran in isolation (12/12 passed) and re-ran the full filtered
command a second time with everything passing, confirming the flake.

ROLLBACK

One migration to roll back via a documented DROP TABLE/DELETE FROM
_migrations transaction (platform.secret_rotation_events holds no
tenant/business data). Application-code rollback is a plain commit
revert — every change in this build is additive. A rotated database
credential cannot be un-rotated (the old password is gone the instant
ALTER ROLE commits) — documented as inherent to password rotation, not
a gap in this build's tooling.

REGRESSION RESULTS

All prior domains (da, bo, bi, dt, simulation, adi, aba, om, cl, auth,
onboarding, api, deploy) pass unchanged. No frozen migration touched. No
existing test modified in a way that changes its assertions (loadConfig
and logger tests gained new cases; existing ones untouched).

OUT-OF-SCOPE CONFIRMATION

No real cloud secret manager integrated (no such service reachable from
this environment — SecretProvider is the documented seam). No automated/
scheduled rotation (manually-invoked, live-verified, mirroring BUILD-22's
PITR-drill treatment). No user-facing API key rotation (already BUILD-18's
scope, a distinct concern). No later-build functionality (BUILD-25
observability/metrics, BUILD-26 security/privacy beyond secrets, etc.)
begun.

KNOWN LIMITATIONS

See known-limitations-build24.md: no managed secret store integration; no
scheduled rotation; browser-secret check is source-level not built-bundle-
level; SECRET_INVENTORY is hand-maintained (no CI enforcement that a new
process.env reference gets an inventory entry); the production-credential
guard is a documented heuristic, not a certainty; rotation mechanism
implemented for the database credential only (the only secret in this
platform's real inventory that needs it today).

QUEUE TRANSITION

BUILD-24: ready -> in_progress -> completed.
Per the user's explicit "continue to full completion of all the builds
(30)" instruction, BUILD-25 is being readied and started immediately
following this report.

Commit: (this commit)
Branch: claude/infinicus-engine-debug-3loqb4
PR: #10
Next build: BUILD-25 (OBS — Observability)
