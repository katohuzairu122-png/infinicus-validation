BUILD-23 COMPLETION REPORT — DEPLOYMENT AND ENVIRONMENTS

Build ID: BUILD-23
Layer: DEPLOY
Date: 2026-07-23
Branch: claude/infinicus-engine-debug-3loqb4
Specification: docs/implementation-queue/BUILD-23-DEPLOY-SPECIFICATION.md
Specification SHA-256: 459a5ddfe4c6aeab3f8b2449a852099e3b04142e27f3c90a5da6509d81728bdc
Status: COMPLETE

WHAT WAS BUILT

Every capability in spec §2's required scope, each genuinely built and
live-tested: release versioning (version.sh, git-state-derived);
deployment audit (a new platform.deployment_events table, platform-
scoped like _migrations/system_settings/feature_flags, plus
DeploymentEventRepository); immutable builds (a multi-stage, non-root,
healthchecked Dockerfile for apps/api, tagged by version.sh's output);
a migration gate (migration-gate.sh, a thin wrapper around BUILD-22's
advisory-locked runMigrations()); health checks and smoke tests (reusing
BUILD-22's /v1/health and /v1/ready, plus a real smoke-test.sh); a
genuinely enforced promotion gate (deployment-audit.cjs's
check-promotion command — staging requires this exact version to have
already succeeded in test, production requires it to have already
succeeded in staging — checked by code and live-tested including the
negative cases, not just documented policy); rollback procedure; and a
CI workflow (.github/workflows/ci.yml) with two jobs covering
lint/typecheck/build/full-test-suite and a real Docker image
build-and-smoke-test, scoped to this project's own branches/paths since
this repository's main branch hosts an entirely unrelated legacy static
site discovered during entry-gate inspection.

A pre-existing, previously-undiscovered gap had to be fixed to make any
of this genuinely testable: every schema-level GRANT in this project's
history was applied by hand against one long-lived local database,
never scripted — infrastructure/database/scripts/grant-app-role.sh is
now that script, live-verified by provisioning a completely fresh
database (migrate + grant, nothing else) and running the full 2747-test
@infinicus/database suite against it unchanged.

FILES CREATED

infinicus-platform/infrastructure/database/migrations/0146_create_deployment_events.sql
infinicus-platform/packages/database/src/repositories/deployment/errors.ts
infinicus-platform/packages/database/src/repositories/deployment/DeploymentEventRepository.ts
infinicus-platform/packages/database/src/repositories/deployment/index.ts
infinicus-platform/packages/database/tests/deployment-events.integration.test.ts
infinicus-platform/packages/database/tests/migration-gate.integration.test.ts
infinicus-platform/packages/database/tests/promotion-gate.integration.test.ts
infinicus-platform/infrastructure/deployment/scripts/version.sh
infinicus-platform/infrastructure/deployment/scripts/migration-gate.sh
infinicus-platform/infrastructure/deployment/scripts/smoke-test.sh
infinicus-platform/infrastructure/deployment/scripts/deploy.sh
infinicus-platform/infrastructure/deployment/scripts/deployment-audit.cjs
infinicus-platform/infrastructure/database/scripts/grant-app-role.sh
infinicus-platform/apps/api/Dockerfile
infinicus-platform/apps/api/tests/smoke-test.integration.test.ts
infinicus-platform/apps/api/tests/deploy-orchestration.integration.test.ts
infinicus-platform/.dockerignore
.github/workflows/ci.yml
infinicus-platform/docs/production-readiness/architecture-and-scope-build23.md
infinicus-platform/docs/production-readiness/configuration-build23.md
infinicus-platform/docs/production-readiness/operating-procedure-build23.md
infinicus-platform/docs/production-readiness/security-controls-build23.md
infinicus-platform/docs/production-readiness/test-evidence-build23.md
infinicus-platform/docs/production-readiness/rollback-procedure-build23.md
infinicus-platform/docs/production-readiness/known-limitations-build23.md

FILES MODIFIED

infinicus-platform/packages/database/src/index.ts (barrel exports: DeploymentEventRepository, DeploymentEventNotFoundError, and related types)
infinicus-platform/turbo.json (test task gained "env": ["DATABASE_URL", "ADMIN_DATABASE_URL"] — Turborepo 2.x's default strict envMode was silently dropping these before they reached child test processes, causing turbo run test to report false-green success while every live-integration test silently skipped)

ARCHITECTURE

No duplicate infrastructure — migration-gate.sh wraps BUILD-22's
existing runMigrations() directly; health checks reuse BUILD-22's
existing /v1/health and /v1/ready; grant-app-role.sh automates the
exact grant pattern already established manually in BUILD-19/21, not a
new access model. One new migration only (0146), platform-scoped (no
tenant_id), matching the established pattern for infrastructure
metadata tables. Full detail:
docs/production-readiness/architecture-and-scope-build23.md.

SECURITY

The promotion gate is enforced by code querying platform.deployment_events,
live-tested for both acceptance and rejection (including a subtle case:
a prerequisite deployment that exists but is recorded failed, not
succeeded, is still correctly rejected). A real shell-injection risk in
an early draft of deploy.sh (shell variables interpolated into an inline
node -e script string) was caught and fixed during this build's own
authoring by extracting a proper CLI script that reads arguments via
process.argv. grant-app-role.sh deliberately excludes the public schema
(vestigial tables including _migrations, which the application role has
never had access to) — live-verified with has_table_privilege() checks.
The Docker image runs as a non-root user. Full detail:
docs/production-readiness/security-controls-build23.md.

TENANCY AND AUTHORIZATION

No new tenant-facing authorization logic. platform.deployment_events has
no RLS (platform infrastructure metadata, matching platform.system_settings/
feature_flags and _migrations). grant-app-role.sh reuses the existing
RLS-based tenant isolation every prior build already established —
verified by running the full tenant-isolation-dependent @infinicus/database
suite against a database it alone provisioned.

DATABASE CHANGES

One new migration (0146): platform.deployment_events (no RLS, matching
established platform-metadata-table precedent). Migrations 0001-0145
verified byte-identical (git status --porcelain clean for everything
except 0146).

API CHANGES

None new in apps/api itself — this build's HTTP surface is unchanged
from BUILD-21/22 (/v1/health, /v1/ready are reused, not modified).

UI CHANGES

None. This build is deployment/CI infrastructure — apps/web is
unmodified.

CONFIGURATION

No new InfinicusConfig fields — every new environment variable this
build introduces is consumed only by deployment scripts at invocation
time, never by the running application process. turbo.json's one
required change (test task env passthrough) is documented above and in
configuration-build23.md. Full detail:
docs/production-readiness/configuration-build23.md.

OBSERVABILITY

platform.deployment_events is itself a new, queryable observability
surface: every deployment attempt (started/succeeded/failed/rolled_back)
across every environment, with version/gitSha/timestamps/notes — a
concrete, code-enforced audit trail satisfying spec §2's "deployment
audit" requirement, not a log line that could be edited or lost.

TESTS

5 new test files, 20 new live-database integration tests, all exercising
the real shippable scripts via genuine child processes (not
reimplementations). Beyond the automated suite: every script was also
run manually, live, at least once — including a full end-to-end
promotion chain (test succeeded -> staging accepted; a synthetic
never-deployed version correctly rejected for both staging and
production) and a complete fresh-database provisioning drill (migrate +
grant, then the full 2747-test @infinicus/database suite passing
unchanged against that freshly provisioned database). Docker image
building/running could not be fully verified inside this sandboxed
development environment (its outbound network policy allowlists package
registries like npm/PyPI but not container registries — confirmed via a
local docker build attempt that correctly parsed the Dockerfile and
failed only at the base-image-pull step); the equivalent real evidence
comes from .github/workflows/ci.yml's build-and-smoke-test-image job
running on GitHub's own unrestricted-network runners — see
test-evidence-build23.md and this report's VALIDATION section for the
observed outcome of that run.

VALIDATION

pnpm typecheck: 8/8 packages with a typecheck script pass.
pnpm lint: 23/23 packages pass, 0 errors (5 pre-existing unrelated
console-statement warnings in packages/database).
pnpm build: 23/23 packages build successfully.
Frozen-migration byte-identity: git status --porcelain on
infrastructure/database/migrations/ — only 0146 new.
Empty-database install test: migrations 0001-0146 applied cleanly to a
fresh database in one pass, zero errors; platform.deployment_events
verified present with its trigger.
Migration idempotency test: re-ran migration-gate.sh against the
already-migrated database — all 146 migrations reported skip.
Fresh-database full-suite drill: a completely fresh database, provisioned
using only migration-gate.sh + grant-app-role.sh (no manual steps), then
ran the full 2747-test @infinicus/database suite unchanged — passed.
Live CI run (GitHub Actions, on GitHub's own runners, real network
access): four real runs were required before a genuinely green run was
achieved. Run 29997577400 failed at the pnpm/action-setup@v4 step with
"No pnpm version is specified" — a real bug only a genuine GitHub
Actions execution could surface (the action's package_json_file input
resolves from the repository root by default and does not inherit the
workflow's defaults.run.working-directory, which only applies to run:
steps). Fixed by explicitly setting package_json_file:
infinicus-platform/package.json on both pnpm/action-setup@v4 steps,
pushed, and re-triggered. The corrected run (29998343107) failed at a
different step — the validate job's Typecheck step —
@infinicus/authentication:typecheck reported "Cannot find module
'@infinicus/database'" and "Cannot find module 'node:crypto'". Root
cause: turbo.json's typecheck task depended on ^typecheck instead of
^build, so a package could be typechecked before its workspace
dependencies were ever built (no dist/*.d.ts yet), and
packages/authentication, packages/authorization, and packages/database
all import Node built-ins directly without declaring @types/node as a
devDependency, relying on an incidental transitive hoist that a clean
frozen-lockfile CI install does not reliably reproduce. Reproduced for
real locally by deleting every dist/ and tsconfig.tsbuildinfo in the
workspace (genuine fresh-checkout simulation) before re-running pnpm
typecheck. Fixed by changing turbo.json's typecheck task to
"dependsOn": ["^build"] and adding an explicit @types/node
devDependency to the three affected packages; re-verified against the
same fresh-checkout simulation (pnpm lint 23/23, pnpm typecheck 26/26,
pnpm build 23/23), pushed, and re-triggered. That run (29999270283)
fully passed the validate job (lint, typecheck, build, migration gate,
grant script, and the entire live-database turbo run test suite all
green) but failed build-and-smoke-test-image at the Build Docker image
step: "invalid tag \"infinicus-api:0.0.1+sha.5d6c205\": invalid
reference format". version.sh's output is valid semver build metadata
(correct for the deployment-audit table and promotion gate, both plain
Postgres text) but Docker tags only permit [\w][\w.-]{0,127} — "+" is
illegal there; this could not have been caught locally since docker
build cannot run in this sandbox at all. Fixed by computing a second,
Docker-safe output in ci.yml's version step (${VERSION//+/-}, used only
for the image tag/container run) while leaving the real semver string
unchanged for the audit trail; verified the substitution locally, pushed,
and re-triggered — see
docs/production-readiness/test-evidence-build23.md's "Live CI run"
section and the PR #10 summary comment for the corrected run's
confirmed outcome. Run 29999890251 (after fixing defect 8) passed both
jobs in full: validate in 2m39s (lint 23/23, typecheck 26/26, build
23/23, migration gate applying all 146 migrations to a fresh CI
database, grant-app-role.sh, and the filtered turbo run test's full
live-database suite all green), and build-and-smoke-test-image in 1m27s
(real docker build of apps/api/Dockerfile on GitHub's unrestricted-
network runners, the image run for real with --network host, readiness
confirmed within 1s, and smoke-test.sh passing against the live
container's /v1/health, /v1/ready, and /documentation/json). Run:
https://github.com/katohuzairu122-png/infinicus-validation/actions/runs/29999890251
Eight genuine bugs were found and fixed during this build's own
testing/authoring (a shell-injection risk in deploy.sh, a doubled status
code in smoke-test.sh's failure path, turbo's silent env-var
strict-mode drop causing a false-green test result, the expected
permission-denied on a freshly created ungranted table, a
tsconfig.tsbuildinfo staleness artifact from this session's own manual
exploration, the pnpm/action-setup@v4 working-directory bug, the turbo
typecheck task-graph / missing @types/node bug, and the Docker
tag/semver-build-metadata incompatibility above) — full root-cause and
fix detail in test-evidence-build23.md.

ROLLBACK

One migration to roll back via a documented DROP TABLE/DELETE FROM
_migrations transaction (platform.deployment_events holds no tenant/
business data). Application-code rollback is a plain commit revert —
every change in this build is additive except one line in turbo.json
(documented as a real regression if reverted in isolation, since it
fixes a pre-existing defect unrelated to this build's own purpose).
Rolling back a *deployed application version* (not the codebase) is
documented as re-promoting a previous immutable image tag through the
same gated deploy.sh sequence. Full procedure:
docs/production-readiness/rollback-procedure-build23.md.

REGRESSION RESULTS

packages/database: 31 test files, 2752 passed | 16 skipped (2768 total)
— every prior domain (da, bo, bi, dt, simulation, adi, aba, om, cl,
auth, onboarding, api-idempotency, plus all migration-stage2* structural
suites, plus every BUILD-22 script test) passed unchanged.
packages/configuration: 1 test file, 12 passed.
packages/observability: 1 test file, 5 passed.
packages/authentication: 3 test files, 45 passed | 1 skipped (46 total).
packages/authorization: 2 test files, 25 passed | 1 skipped (26 total).
packages/onboarding: 1 test file, 12 passed | 1 skipped (13 total).
packages/workflow: 1 test file, 12 passed | 1 skipped (13 total).
apps/web: 1 test file, 10 passed.
apps/api: 4 test files, 32 passed | 4 skipped (36 total).

OUT-OF-SCOPE CONFIRMATION

No later-build functionality was implemented. The built Docker image is
not pushed to any container registry (none configured in this
environment). GitHub's native per-environment protection rules are
documented but not configured (a repo-admin UI action, not available to
an API token). deploy.sh does not start/stop/supervise the application
process itself (environment-specific, deliberately left to the caller).
No real staging/production infrastructure was fabricated — the
promotion-gate logic between named environments is real and tested; the
infrastructure those names would map to in a real deployment does not
exist in this sandboxed environment. No frozen migration (0001-0145) or
existing repository/service/route from any prior build was modified.

KNOWN LIMITATIONS

Full detail in docs/production-readiness/known-limitations-build23.md.
Summary: no container-registry push; GitHub Environment protection
rules not configured (repo-admin action); no process-supervision
integration; no real staging/production infrastructure; CI workflow
deliberately scoped away from the unrelated legacy main branch;
grant-app-role.sh grants broadly per schema, not per table; deployment
audit has no automatic retention/pruning yet.

QUEUE TRANSITION

BUILD-23: blocked -> ready -> in_progress -> completed. currentReadyBuild
remains null — BUILD-24 was not readied or started, per explicit
instruction (spec §8, §10).

Commit: (see next commit in this branch)
Branch: claude/infinicus-engine-debug-3loqb4
PR: #10 (tracking PR for this branch) — to be updated with this build's summary.
Next build: BUILD-24 (SECRETS). Not readied. Per BUILD-23 specification
§8/§10, a future session must explicitly re-verify BUILD-24's
preconditions against
docs/implementation-queue/BUILD-24-SECRETS-SPECIFICATION.md and the
current repository state before marking it ready.
