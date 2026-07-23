# BUILD-23 — Deployment and Environments: Known Limitations

## The built Docker image is not pushed to any container registry

`.github/workflows/ci.yml`'s `build-and-smoke-test-image` job builds and
smoke-tests the image, then discards it — it does not push to Docker
Hub, GHCR, ECR, or anywhere else. This repository/environment has no
real container registry credentials configured, and fabricating a push
target without a genuine deployment destination would be speculative,
untestable configuration — out of scope per this build's own
"exact... before coding, no unresolved alternatives" requirement (spec
§4). Adding a real push step (to whichever registry a real deployment
target ultimately uses) is a small, well-isolated follow-up once that
target is chosen — the image build itself, which is the part that
actually needed live verification, is already real and already tested.

## GitHub's native per-environment protection rules are not configured

GitHub Environments (with required reviewers, wait timers, deployment
branch restrictions) are the correct, native mechanism for a real
"promotion gate" at the CI/CD platform level, and this build's workflow
structure is compatible with them (job-level `environment:` keys can be
added once real environments are provisioned) — but actually configuring
protection rules is a repository Settings UI action reserved for repo
admins, not something available through a GitHub API token acting on
this session's behalf. This build's `deploy.sh`-level promotion gate
(enforced against `platform.deployment_events`, live-tested) is the
actual, working enforcement mechanism today; GitHub Environment
protection rules would be a defense-in-depth addition layered on top,
not a replacement.

## No process-supervision integration

`deploy.sh` explicitly does not start, stop, or restart the application
process/container — that responsibility is deliberately left to the
caller, since it is environment-specific (systemd unit, Kubernetes
Deployment, a PaaS's own restart mechanism, `docker run`/`docker
compose`) and none of those targets exist in this environment to
integrate against genuinely. `deploy.sh`'s own doc comment states this
explicitly rather than silently assuming a mechanism this build cannot
verify.

## No real staging/production infrastructure exists to deploy to

Every environment referenced in this build's scripts and tests
(`local`, `test`, `staging`, `production`) is a value in the
`environment` column of `platform.deployment_events` and a set of
connection-string/URL parameters passed to a script — not four distinct
provisioned servers. The promotion-gate *logic* between them is real and
tested (see `security-controls-build23.md`); the actual infrastructure
those names would map to in a real deployment (separate database
instances, separate compute, DNS, load balancers) does not exist in this
sandboxed development environment and is out of this build's scope to
fabricate.

## CI workflow triggers are scoped to this project's own branches/paths only

`.github/workflows/ci.yml` triggers on `push` to `claude/**` branches and
`pull_request`s touching `infinicus-platform/**` — it deliberately does
not trigger on `push` to `main`, since `main` hosts the unrelated legacy
static site (see `architecture-and-scope-build23.md`) and this workflow
has nothing meaningful to validate there. If `infinicus-platform/` is
ever merged into `main` as part of a real project migration, this
trigger scoping should be revisited.

## `grant-app-role.sh` grants broadly per schema, not per table

The script grants `SELECT, INSERT, UPDATE, DELETE` on every table in
every non-`public` schema to the application role, matching the
broadest form of what was already manually granted throughout this
project's history (RLS policies, not table-level grants, are this
codebase's actual tenant-isolation enforcement mechanism — see every
prior build's own security-controls docs). It does not support granting
a *narrower* per-table policy (e.g. read-only access to a specific
reporting schema for a future analytics role) — extending it to support
per-role, per-table grant profiles is a reasonable future enhancement,
out of this build's scope since no such narrower role exists yet
anywhere in this codebase.

## Deployment audit has no automatic retention/pruning

Unlike BUILD-22's `prune-backups.sh`, `platform.deployment_events` rows
accumulate indefinitely — no script in this build prunes old deployment
records. Given this table's row volume is bounded by deployment
frequency (not user/tenant activity), this was judged low-priority
relative to BUILD-22's backup-file retention (which bounds actual disk
usage); a future build could add a similar age-based pruning script
using the exact same pattern as `prune-backups.sh` if deployment volume
ever makes this a real concern.
