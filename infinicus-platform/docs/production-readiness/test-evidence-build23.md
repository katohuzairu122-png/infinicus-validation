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

`.github/workflows/ci.yml` runs automatically on push. Three real runs
were required before a genuinely green run was achieved — each failure
was a real bug this sandboxed development environment could not have
surfaced on its own:

1. Run `29997577400` failed at `pnpm/action-setup@v4` (`Error: No pnpm
   version is specified`) — see defect 6 below.
2. Run `29998343107` (after fixing defect 6) failed at the `Typecheck`
   step of the `validate` job: `@infinicus/authentication:typecheck`
   reported `Cannot find module '@infinicus/database'` and `Cannot find
   module 'node:crypto'` — see defect 7 below.
3. Run `29999270283` (after fixing defect 7) fully passed the `validate`
   job (lint, typecheck, build, migration gate, grant script, and the
   entire live-database `turbo run test` suite all green) but failed the
   `build-and-smoke-test-image` job at the `Build Docker image` step:
   `ERROR: failed to build: invalid tag "infinicus-api:0.0.1+sha.5d6c205":
   invalid reference format` — see defect 8 below.
4. Run `29999890251` (after fixing defect 8) **passed both jobs in
   full**:
   - `validate` — 2m39s (10:35:38–10:38:17 UTC). Every step green:
     checkout, `pnpm/action-setup@v4`, `actions/setup-node@v4`,
     `pnpm install --frozen-lockfile`, `pnpm lint` (23/23 packages),
     `pnpm typecheck` (26/26 tasks, dependency-ordered via the
     `^build` fix), `pnpm build` (23/23 packages), least-privilege
     role creation, `migration-gate.sh` (all 146 migrations applied to
     a fresh CI database), `grant-app-role.sh`, and the filtered
     `turbo run test` against every package with a real suite — the
     full live-database test run, ~55s.
   - `build-and-smoke-test-image` — 1m27s (10:38:19–10:39:46 UTC).
     Every step green: checkout (full history for `version.sh`),
     pnpm/node setup, building `@infinicus/database`, computing the
     immutable version (`docker_tag` now Docker-safe), `docker build`
     of `apps/api/Dockerfile` (~35s, on GitHub's unrestricted-network
     runners — the base-image pull this sandbox cannot perform),
     provisioning the database for the image, running the real
     container on `--network host`, readiness confirmed within 1s of
     `docker run`, and `smoke-test.sh` passing against the live
     container's `/v1/health`, `/v1/ready`, and `/documentation/json`.
   Run link:
   https://github.com/katohuzairu122-png/infinicus-validation/actions/runs/29999890251
   This is the confirmed, genuinely green live CI evidence for
   BUILD-23 — see the completion report's VALIDATION section and the
   PR #10 summary comment for the same result.

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
6. **`pnpm/action-setup@v4` failed on the real, live CI run** (run
   `29997577400`, `validate` job, ~36 seconds in) with `Error: No pnpm
   version is specified` — even though
   `infinicus-platform/package.json` genuinely declares
   `"packageManager": "pnpm@10.33.0"`. Root cause: the action's
   `package_json_file` input defaults to `./package.json` resolved from
   `GITHUB_WORKSPACE` (the repository root) — it does **not** inherit
   this workflow's `defaults.run.working-directory: infinicus-platform`,
   because that setting only applies to `run:` shell steps, not to a
   `uses:` action's own inputs. This is exactly the kind of bug that can
   only be caught by a genuine GitHub Actions run, never by local
   validation (`docker build`'s own base-image-pull restriction in this
   sandboxed environment meant Docker-related steps were already known
   to be unverifiable locally — this defect shows the *entire* workflow
   benefits from real execution, not just the Docker-specific steps).
   Fixed by explicitly setting
   `package_json_file: infinicus-platform/package.json` on both
   `pnpm/action-setup@v4` steps (`validate` and
   `build-and-smoke-test-image`). Pushed the fix and re-triggered a real
   CI run to confirm — which surfaced defect 7 below.
7. **`turbo.json`'s `typecheck` task depended on `^typecheck` instead of
   `^build`, so a package's cross-workspace type imports could be
   typechecked before its workspace dependencies had ever been built.**
   On the real CI run (`29998343107`, `validate` job, `Typecheck` step),
   `@infinicus/authentication:typecheck` ran before `@infinicus/database`
   had been built (the `Build` step comes *after* `Typecheck` in
   `ci.yml`, and `typecheck`'s own turbo dependency graph never pulled
   `build` in), so `@infinicus/database`'s `dist/index.d.ts` did not
   exist yet — `tsc` reported `Cannot find module '@infinicus/database'`.
   The accompanying `Cannot find module 'node:crypto'` on the same file
   was a second, independent gap: `packages/authentication`,
   `packages/authorization`, and `packages/database` all import Node
   built-ins (`node:crypto`) directly in their `src/`, but only
   `apps/api` and `packages/configuration` declared `@types/node` as a
   devDependency — every other package's resolution of `node:` imports
   depended on an incidental transitive hoist that a clean,
   frozen-lockfile CI install does not reliably reproduce. Neither gap
   was visible in this sandboxed session's own local `pnpm typecheck`
   runs, because a stale `tsconfig.tsbuildinfo` (left over from earlier
   manual builds in this long-lived container — see defect 5) let `tsc`
   report false success without re-verifying `dist/` existed, and a
   long-lived local `node_modules` had already accumulated a working
   `@types/node` hoist from unrelated earlier installs. Reproduced for
   real locally by deleting every `dist/` and `tsconfig.tsbuildinfo` in
   the workspace (a genuine fresh-checkout simulation) and re-running
   `pnpm typecheck` — same two errors. Fixed by (a) changing
   `turbo.json`'s `typecheck` task to `"dependsOn": ["^build"]`, so
   `turbo run typecheck` always builds a package's workspace
   dependencies first, and (b) adding an explicit `"@types/node":
   "^22.0.0"` devDependency to `packages/database`,
   `packages/authentication`, and `packages/authorization`. Re-verified
   locally against the same fresh-checkout simulation:
   `pnpm lint` → 23/23 pass, `pnpm typecheck` → 26/26 pass, `pnpm build`
   → 23/23 pass. Pushed the fix and re-triggered a real CI run to
   confirm — which surfaced defect 8 below.
8. **`docker build -t "infinicus-api:${VERSION}"` rejected `version.sh`'s
   own output as an invalid tag.** `version.sh` produces valid semver
   with build metadata (e.g. `0.0.1+sha.5d6c205`) — correct semver
   syntax, and the right choice for the deployment-audit table and the
   promotion gate (both plain Postgres text). Docker image tags, however,
   only permit `[\w][\w.-]{0,127}` — `+` is not a legal tag character, so
   `docker build` failed outright with `invalid reference format` on the
   real CI run (`29999270283`, `build-and-smoke-test-image` job); this
   could never have been caught locally since `docker build` cannot run
   in this sandbox at all (see known-limitations-build23.md). Fixed by
   computing a second, Docker-safe output (`docker_tag`) in `ci.yml`'s
   "Compute immutable version" step — `${VERSION//+/-}` — used only for
   the image tag and container run command; `steps.version.outputs.version`
   (the real semver string) is unchanged and still what would be recorded
   in the deployment audit trail. Verified the substitution locally
   (`0.0.1+sha.5d6c205.dirty` → `0.0.1-sha.5d6c205.dirty`, which satisfies
   Docker's tag grammar). Pushed the fix and re-triggered a real CI run to
   confirm — see this document's "Live CI run" section above for the
   corrected run's outcome.
