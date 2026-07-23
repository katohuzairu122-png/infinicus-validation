# BUILD-23 — Deployment and Environments: Operating Procedure

## The full promotion sequence, worked example

```bash
cd infinicus-platform

# 1. Build everything (produces the dist/ output migration-gate.sh and
#    deploy.sh's audit CLI both need).
pnpm build

# 2. Deploy to test — no prerequisite.
ENVIRONMENT=test \
DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/<test-db>" \
BASE_URL="http://<test-host>:3000" \
DEPLOYED_BY="$(whoami)" \
  infrastructure/deployment/scripts/deploy.sh
# (start/restart the apps/api process against <test-db> before this
#  script's smoke-test step runs — deploy.sh gates and audits, it does
#  not supervise the process itself)

# 3. Deploy to staging — REQUIRES step 2 to have recorded 'succeeded'
#    for this exact version (from version.sh) against 'test'.
ENVIRONMENT=staging \
DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/<staging-db>" \
BASE_URL="http://<staging-host>:3000" \
DEPLOYED_BY="$(whoami)" \
  infrastructure/deployment/scripts/deploy.sh

# 4. Deploy to production — REQUIRES step 3 to have recorded 'succeeded'
#    for this exact version against 'staging'.
ENVIRONMENT=production \
DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/<production-db>" \
BASE_URL="http://<production-host>:3000" \
DEPLOYED_BY="$(whoami)" \
  infrastructure/deployment/scripts/deploy.sh
```

Attempting to skip a step (e.g. running `ENVIRONMENT=production`
directly without a prior succeeded `staging` deployment of the same
version) fails immediately with a clear error and a `failed`
`deployment_events` row recording the rejection — see
`security-controls-build23.md`.

## Provisioning a brand-new environment's database

```bash
# One-time, per new environment:
DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/<new-db>" \
  infrastructure/deployment/scripts/migration-gate.sh
ADMIN_DATABASE_URL="postgresql://<admin-role>:<pw>@<host>:5432/<new-db>" \
APP_ROLE="<app-role-name>" \
  infrastructure/database/scripts/grant-app-role.sh
```

## Building and running the immutable image locally

```bash
cd infinicus-platform
VERSION=$(infrastructure/deployment/scripts/version.sh)
docker build -f apps/api/Dockerfile -t "infinicus-api:${VERSION}" .
docker run -d --name infinicus-api \
  -e DATABASE_URL="postgresql://<app-role>:<pw>@<host>:5432/<db>" \
  -e PORT=3000 \
  -p 3000:3000 \
  "infinicus-api:${VERSION}"
BASE_URL="http://localhost:3000" infrastructure/deployment/scripts/smoke-test.sh
```

## CI (automatic)

`.github/workflows/ci.yml` runs automatically on every push to a
`claude/**` branch and every pull request touching
`infinicus-platform/**`. No manual trigger is required. See
`test-evidence-build23.md` for this build's own observed run.

## Rollback

See `rollback-procedure-build23.md` for the full procedure. Summary: a
rollback is a promotion of a **previous, already-succeeded** version
back into an environment — `deploy.sh`'s own promotion gate applies
identically (rolling back staging to an older version still requires
that older version to have a succeeded `test` deployment on record,
which it does, since it was already promoted through the chain once).

## One-time repo-admin setup (not automatable via API token)

GitHub's native per-environment protection rules (required reviewers,
wait timers before a job targeting `environment: production` can run)
are configured in the repository's Settings → Environments UI by a repo
admin — this is a real, GitHub-native mechanism this build's CI workflow
is compatible with, but configuring the actual protection rules is
outside what a GitHub API token can do on this project's behalf. See
`known-limitations-build23.md`.
