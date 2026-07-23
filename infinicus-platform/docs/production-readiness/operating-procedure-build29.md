# BUILD-29 — Incident Response and Rollback: Operating Procedure

## Declaring an incident

```
POST /v1/incidents  (requires platform:admin)
{
  "severity": "sev1" | "sev2" | "sev3" | "sev4",
  "title": "...",
  "description": "...",
  "affectedSystems": ["apps/api", "postgres", ...],   // optional
  "affectedTenantIds": ["<uuid>", ...]                 // optional
}
```

See `docs/incident-response/severity-model.md` for what each severity means and its target response time. This is the entry point to every runbook under `docs/incident-response/runbooks/` — each one assumes the incident has already been declared before its own steps begin.

## Posting a timeline update

```
POST /v1/incidents/:incidentId/updates  (requires platform:admin)
{ "message": "...", "statusAtUpdate": "investigating" | "identified" | "monitoring" | "resolved", "isCustomerFacing": false }
```

`isCustomerFacing: true` marks an entry as suitable for external communication — see `docs/incident-response/communication-templates.md` for the actual wording templates to use for such entries. The incident's own `status` column is kept in sync with the latest update's `statusAtUpdate` automatically.

## Resolving an incident

```
POST /v1/incidents/:incidentId/resolve  (requires platform:admin)
{ "postmortemUrl": "https://..." }   // optional but required by policy for Sev1/Sev2, see post-incident-review-template.md
```

Resolving an already-resolved incident returns `409`; adding an update to a resolved incident also returns `409` — the incident is genuinely closed at that point (open a new incident for a recurrence rather than reopening).

## Viewing active incidents and a specific incident's timeline

```
GET /v1/incidents                       — currently active (unresolved) incidents
GET /v1/incidents/:incidentId           — one incident's current state
GET /v1/incidents/:incidentId/updates   — full append-only timeline
```

## Following a runbook

Each runbook under `docs/incident-response/runbooks/` is self-contained and assumes the incident has been declared:

- `deployment-rollback.md` — a bad deployment causing active harm; revert to the last known-good version via `deploy.sh` (BUILD-23).
- `migration-rollback.md` — a bad migration; almost always a forward-fix migration, not a schema reversal (this repository's migrations are forward-only by design).
- `restore-procedure.md` — data loss/corruption; `restore.sh` or `pitr-restore.sh` (BUILD-22).
- `security-incident.md` — credential compromise, unauthorized access, active exploit; always Sev1, contain before investigating.
- `provider-outage.md` — an external dependency (hosting, managed database, DNS) is degraded; distinguish from an internal problem via `GET /v1/health` vs `GET /v1/ready` (BUILD-22) first.

## Writing the post-incident review

Use `docs/incident-response/post-incident-review-template.md`, pulling the timeline directly from `GET /v1/incidents/:incidentId/updates` rather than reconstructing it from memory. Link the completed review's URL via the `resolve` call's `postmortemUrl`, or a later follow-up if the review is completed after the incident itself is resolved.

## Rollback

See rollback-procedure-build29.md. This build ships 3 new, additive migrations and no modification to any existing route, schema, or migration.
