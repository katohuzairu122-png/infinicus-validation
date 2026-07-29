# Runbook: Deployment Rollback

**When to use:** a newly promoted deployment is causing a Sev1/Sev2 incident (elevated errors, crash loop, broken route) and the fastest mitigation is reverting to the last known-good running version — not fixing forward.

This reuses BUILD-23's own deployment tooling exactly (`deploy.sh`, `platform.deployment_events`) — no new rollback mechanism is introduced by this build.

## Steps

1. **Declare the incident first** (if not already declared): `POST /v1/incidents` — severity per severity-model.md, `affectedSystems: ["apps/api"]`.
2. **Identify the last known-good version** for the affected environment:
   ```bash
   psql "$DATABASE_URL" -c \
     "SELECT version, completed_at FROM platform.deployment_events
      WHERE environment = '<environment>' AND status = 'succeeded'
      ORDER BY started_at DESC LIMIT 5;"
   ```
3. **Post a timeline update** naming the target rollback version: `POST /v1/incidents/:id/updates`, `statusAtUpdate: "identified"`.
4. **Re-promote the known-good version's immutable image** (already built and tagged from its original deployment — see architecture-and-scope-build23.md on immutable builds):
   ```bash
   ENVIRONMENT="<environment>" \
   DATABASE_URL="<admin-capable connection string>" \
   BASE_URL="<environment's base URL>" \
   DEPLOYED_BY="$(whoami)-rollback" \
     infrastructure/deployment/scripts/deploy.sh
   ```
   This runs through the exact same migration-gate + smoke-test + promotion-gate pipeline as a forward deployment (BUILD-23) — a rollback is not a bypass of those checks.
5. **Verify**: `GET /v1/ready` on the environment returns `200`; re-run whatever monitoring/alert (BUILD-25) flagged the original incident and confirm it has cleared.
6. **Post a "monitoring" update**, then **resolve** the incident once confirmed stable (`POST /v1/incidents/:id/resolve`), including a `postmortemUrl` if a post-incident review is warranted (see post-incident-review-template.md — required for every Sev1/Sev2).

## Important constraint

**Database migrations are never rolled back as part of a deployment rollback** — this repository's migrations are forward-only (every build's own rollback-procedure doc says the same). If the target rollback version predates a migration the current schema has already applied, that is a more serious, genuinely different incident (is the older application code even compatible with the newer schema?) requiring a manual decision, not an automated step. Escalate to migration-rollback.md's judgment call section in that case.
