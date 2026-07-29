# Runbook: Provider Outage Handling

**When to use:** a dependency this platform does not control is degraded or unavailable — the hosting provider, the managed Postgres instance, a DNS provider, etc. Distinct from an internal deployment/migration problem (see deployment-rollback.md/migration-rollback.md) — the fix here is often "wait and communicate," not "change our own code."

## Steps

1. **Confirm it's actually external, not internal, before declaring a provider outage.** Check `GET /v1/ready` (BUILD-22) first — if it fails with a database-connectivity error but `GET /v1/health` (no DB dependency) succeeds, that specifically isolates the database as the failure point, which narrows whether it's "our config" vs. "the provider is down." Check the provider's own status page/API if one exists.
2. **Declare the incident** — severity depends on what fraction of the platform the outage affects (see severity-model.md); a full database-provider outage is Sev1, a degraded-but-partially-working dependency is Sev2/Sev3.
3. **Post an initial timeline update** stating which external dependency is affected and, if known, the provider's own incident/status reference (do not fabricate a status if the provider hasn't published one — say "confirming with provider" rather than guessing).
4. **Assess mitigation options**, in order of preference:
   - **Failover**, if the affected dependency has a configured standby/replica this platform can point at (out of this build's own scope to configure — see known-limitations-build29.md; this step assumes infrastructure a real deployment has set up).
   - **Degrade gracefully**: if only a non-critical capability depends on the affected provider, confirm the rest of the platform continues to function (e.g. `GET /v1/health` staying up during a database outage, by design — BUILD-22's own liveness/readiness split exists specifically so an orchestrator doesn't kill a process it can't fix by restarting).
   - **Wait**: for outages with no failover available, the honest mitigation is monitoring the provider's status and communicating regularly (see communication-templates.md's provider-outage template) — do not attempt to "fix" infrastructure this platform doesn't own.
5. **Once the provider reports resolution**, verify independently before declaring the incident resolved on this platform's side: re-check `GET /v1/ready`, confirm the connection pool (`poolStats()` via `GET /v1/metrics`, BUILD-25) has returned to normal, and watch for a reasonable stabilization window (a provider "resolved" status doesn't always mean immediately stable) before posting the `resolved` update.
6. **Resolve** with a postmortem if Sev1/Sev2 (see post-incident-review-template.md) — even though the root cause was external, the review should still cover this platform's own detection time, mitigation effectiveness, and communication quality, all of which are within this platform's control regardless of whose infrastructure failed.
