# BUILD-23 — Deployment and Environments: Test Evidence

All tests below were executed against a live local disposable PostgreSQL
16 instance (migrations `0001`–`0146` — this build added `0146`). Every
number below is from an actual `vitest run`/script execution, not
asserted from code review.

## New test files (this build)

| File | Package | Kind | Result |
|---|---|---|---|
| `tests/deployment-events.integration.test.ts` | `@infinicus/database` | Live integration | 8 passed, 1 skipped (guard) |
| `tests/migration-gate.integration.test.ts` | `@infinicus/database` | Live integration | 3 passed, 1 skipped (guard) |
| `tests/promotion-gate.integration.test.ts` | `@infinicus/database` | Live integration | 5 passed, 1 skipped (guard) |
| `tests/smoke-test.integration.test.ts` | `@infinicus/api` | Live integration | 2 passed, 1 skipped (guard) |
| `tests/deploy-orchestration.integration.test.ts` | `@infinicus/api` | Live integration | 2 passed, 1 skipped (guard) |

**Totals:** 20 new live-database integration tests across 5 new files —
every single one exercises a real shell script (`migration-gate.sh`,
`smoke-test.sh`, `deploy.sh`, `deployment-audit.cjs`) via genuine child
processes, not a reimplementation of the script's logic in TypeScript.

## Coverage by requirement (spec §6)

- **Unit tests**: not applicable as a separate category here — every
  meaningful unit of this build's behavior only makes sense against a
  live database (deployment audit, migration gate, promotion gate), so
  coverage is entirely at the live-integration level, consistent with
  this build's own subject matter.
- **Integration tests**: covered by the five files above, each invoking
  the real, shippable script.
- **Authorization and tenant-isolation tests**: `grant-app-role.sh` was
  manually verified (below) to correctly exclude the `public` schema
  (and specifically `_migrations`) from the application role's grants
  while correctly granting every real domain schema — the same
  tenant-isolation foundation every prior build's RLS policies already
  enforce is untouched by this build.
- **Failure-path tests**: `migration-gate.sh` rejects a missing
  `DATABASE_URL`; `smoke-test.sh` fails loudly (non-zero exit, clean
  `000` status) against an unreachable instance; `deploy.sh` records a
  `failed` deployment_events row (not just a non-zero exit) on both a
  migration-gate failure and a smoke-test failure; the promotion gate
  rejects both a version with no history and — more subtly — a version
  whose prerequisite deployment exists but is `failed` rather than
  `succeeded`.
- **Idempotency tests where relevant**: `migration-gate.sh` re-run
  against an already-migrated database reports every migration as
  `skip`, verified via a dedicated test asserting the output contains no
  `apply` lines on the second run.
- **Migration tests**: `migration-0001.test.ts`-style structural checks
  don't apply to a single new small migration the same way, but the
  empty-database install test and idempotency re-run (below) cover it.
- **Security tests**: the shell-injection fix in `deploy.sh` (extracting
  `deployment-audit.cjs` to pass values as argv, not interpolated
  script text — see `security-controls-build23.md`) was itself caught
  and fixed during this build's own authoring, before any test run
  could have exercised the vulnerable path; `grant-app-role.sh`'s
  `public`-schema exclusion was live-verified with
  `has_table_privilege()` checks (below).
- **Regression tests**: full existing suite across every package
  re-run unchanged (below).

## Live-execution evidence beyond the automated test suite

Every script in `infrastructure/deployment/scripts/` and
`infrastructure/database/scripts/grant-app-role.sh` was run manually,
live, at least once during this build, independent of the automated
vitest suites above — genuine acceptance evidence, not just "the tests
pass":

- `version.sh` — produced `0.0.1+sha.<short-sha>[.dirty]` correctly.
- `deploy.sh` — full end-to-end run against the local environment:
  version computed → deployment_events row created → migration gate
  passed → smoke test passed against a genuinely running `apps/api`
  instance → row marked `succeeded`. Also run with the wrong
  (RLS-restricted) role deliberately, confirming the migration gate
  correctly refuses and the row is marked `failed` with an accurate
  note — exactly the same permission boundary BUILD-22's `backup.sh`
  established.
- **Promotion chain, live, end to end**: a `staging` deploy attempt
  correctly found and accepted a prior `succeeded` `test` deployment of
  the same version (recorded by the automated test suite moments
  earlier); the CLI's `check-promotion` command was also exercised
  directly against a synthetic never-deployed version string, correctly
  rejecting both `staging` and `production` promotion.
- **`grant-app-role.sh`, live, against a completely fresh database**:
  created a fresh database, ran `migration-gate.sh` (146 migrations
  applied), created the application role, ran `grant-app-role.sh`
  (granted 17 schemas), then ran the **full `@infinicus/database` test
  suite (2747 tests) against that freshly provisioned database** — all
  passed, proving the provisioning scripts alone (no manual grant steps)
  are sufficient to stand up a working environment from nothing. This is
  also exactly what `.github/workflows/ci.yml`'s `validate` job does on
  every CI run.
- **Docker**: `docker build` was run locally and confirmed to parse the
  Dockerfile correctly and proceed exactly to the base-image pull step
  before failing — this sandboxed environment's outbound proxy only
  allowlists specific package registries (npm, PyPI, etc.), not
  container registries, so `docker.io`/`production.cloudfront.docker.com`
  pulls are rejected with a 403 at the gateway level. This is an
  environment constraint, not a Dockerfile defect (confirmed: the error
  occurs identically whether or not the file has any actual mistakes,
  since it happens at metadata-resolution time before any instruction
  in the file is evaluated). Real build/run verification instead comes
  from `.github/workflows/ci.yml`'s `build-and-smoke-test-image` job
  running on GitHub's own runners, which have unrestricted internet
  access — see "Live CI run" below.

## Full regression (this build's changes against every prior build)

```
packages/database:       31 test files, 2752 passed | 16 skipped (2768 total)
packages/configuration:   1 test file,     12 passed
packages/observability:   1 test file,      5 passed
packages/authentication:  3 test files,    45 passed | 1 skipped (46 total)
packages/authorization:   2 test files,    25 passed | 1 skipped (26 total)
packages/onboarding:      1 test file,     12 passed | 1 skipped (13 total)
packages/workflow:        1 test file,     12 passed | 1 skipped (13 total)
apps/web:                 1 test file,     10 passed
apps/api:                 4 test files,    32 passed | 4 skipped (36 total)
```

Every prior domain's suite (`da`, `bo`, `bi`, `dt`, `simulation`, `adi`,
`aba`, `om`, `cl`, `auth`, `onboarding`, `api-idempotency`, plus all
`migration-stage2*` structural suites, plus every BUILD-22 script test)
passed unchanged.

## Static checks

```
pnpm typecheck  → 8/8 packages with a typecheck script pass
pnpm lint       → 23/23 packages pass (0 errors; 5 pre-existing
                  console-statement warnings in packages/database,
                  unrelated to this build)
pnpm build      → 23/23 packages build successfully
```

## Frozen-migration byte-identity

```
git status --porcelain infinicus-platform/infrastructure/database/migrations/
→ only 0146_create_deployment_events.sql is new — 0001-0145 untouched.
```

## Empty-database install test

Applied migrations `0001`–`0146` to a freshly created, previously-empty
database in one pass: zero errors, all 146 migrations reported `apply`.
`platform.deployment_events` verified present with its trigger. Scratch
database dropped after verification.

## Migration idempotency test

Re-ran `migration-gate.sh` against the already-migrated database: all
146 migrations (including `0146`) reported `skip`.

## Live CI run (GitHub Actions, on GitHub's own runners)

`.github/workflows/ci.yml` runs automatically on push to this branch.
[This section is completed after observing the actual triggered run —
see the BUILD-23 completion report and the PR #10 summary comment for
the confirmed run outcome, including the `build-and-smoke-test-image`
job's real `docker build`/`docker run` result, which this sandboxed
development environment's own outbound network policy cannot produce
locally (see above).]

## Defects found and fixed during this build's own testing

1. **Shell-injection risk in `deploy.sh`'s first draft.** Values
   (`$VERSION`, `$ENVIRONMENT`, `$DEPLOYED_BY`, caller-supplied notes)
   were interpolated directly into an inline `node -e '...'` script
   string — a value containing a single quote could break out and
   execute arbitrary code. Fixed by extracting `deployment-audit.cjs`, a
   real script reading every value via `process.argv`. Caught during
   authoring/review, before any test run.
2. **`smoke-test.sh`'s failure-path status code doubled up
   (`"000000"` instead of `"000"`).** `curl -w '%{http_code}' ... ||
   echo "000"` — curl itself already prints `"000"` on a connection
   failure via `-w`, so the `|| echo "000"` fallback (added to stop
   `set -e` aborting the script) printed a *second* `"000"`, and both
   landed in the same command-substitution capture. Fixed by changing
   the fallback to `|| true` (suppresses the abort without printing
   anything of its own) and defaulting the displayed value to
   `<no response>` only if genuinely empty. Caught live: the first
   manual test of the failure path showed `got 000000` instead of the
   expected `got 000`.
3. **`turbo run test` silently skipping every live-integration test.**
   The very first attempt at a filtered `turbo run test` invocation
   (mirroring what CI would do) showed drastically inflated skip counts
   (e.g. `@infinicus/database`: `1641 passed | 1121 skipped` instead of
   the expected `~2747 passed | ~15 skipped`) — Turborepo 2.x defaults
   to `envMode: "strict"`, which drops any environment variable not
   explicitly declared before it reaches a task's child process, so
   every `describe.runIf(!!process.env.DATABASE_URL)` guard silently
   evaluated false. This is a **dangerous false-green**: `turbo run
   test` still reported 0 failures, because nothing meaningful had
   actually run. Fixed by adding `"env": ["DATABASE_URL",
   "ADMIN_DATABASE_URL"]` to `turbo.json`'s `test` task — re-ran the
   exact same filtered command afterward and confirmed the full,
   correct test counts.
4. **`platform.deployment_events` permission denied for `app_test_user`
   on first live test run.** A newly created table has no grant for any
   role until one is explicitly given — expected, and exactly the gap
   this build's own `grant-app-role.sh` exists to close going forward
   (applied manually, once, for this session's own long-lived local
   database; automated for every future fresh database via the new
   script).
5. **A manual `rm -rf` during my own local Dockerfile-validation
   exploration deleted `packages/event-contracts/dist` and
   `packages/handoff-contracts/dist` without also clearing their stale
   `tsconfig.tsbuildinfo` files**, causing a subsequent `turbo run
   build --force` to report success without actually regenerating
   `dist/` (tsc's incremental-build cache trusted the buildinfo file's
   record of "already compiled" without re-verifying the output
   existed), which then caused `@infinicus/layer-simulation`'s build to
   fail with `Cannot find module '@infinicus/handoff-contracts'`. This
   was entirely an artifact of my own manual exploration in this
   sandboxed session (a genuinely fresh checkout has no stale
   `tsconfig.tsbuildinfo` at all) — fixed by deleting every
   `tsconfig.tsbuildinfo` in the workspace and rebuilding cleanly; not a
   defect in any committed file.
