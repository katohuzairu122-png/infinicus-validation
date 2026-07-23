# Severity Model

Severity is set at declaration time (`POST /v1/incidents`, `severity` field — validated against exactly these four values by both the database CHECK constraint on `platform.incidents.severity` and the API's Zod schema) and can be revised via a timeline update if the initial assessment changes.

| Severity | Definition | Examples in this platform | Target response time | Target update cadence |
|---|---|---|---|---|
| **Sev1 — Critical** | Full or near-full outage; data loss or corruption risk; active security breach. Every tenant or a majority of tenants affected. | `apps/api` down entirely; Postgres primary unreachable with no failover; a credential leak with confirmed unauthorized access (see security-incident.md). | Immediate (page on-call) | Every 30 minutes until resolved |
| **Sev2 — Major** | Significant degradation of a core capability for a meaningful subset of tenants, but the platform is not fully down. | Elevated error rate on `/v1/businesses` write routes; `RATE_LIMIT_MAX` misconfigured and rejecting legitimate traffic platform-wide; a single availability zone/region outage with automatic failover in progress. | Within 15 minutes | Every hour until resolved |
| **Sev3 — Minor** | A real defect or degradation with a workaround, affecting a small number of tenants or a non-critical capability. | One background operational script (e.g. `billing-lifecycle-audit.cjs`) failing silently; a single tenant's usage-metering counter drifting; `GET /v1/metrics` returning stale pool stats. | Within 1 business day | Daily until resolved |
| **Sev4 — Low** | Cosmetic or low-impact issue, no immediate tenant harm. | A misleading error message; a doc inaccuracy; a non-blocking lint warning surfaced in CI. | Within 1 week (or next planned work) | As needed |

## Escalation

A Sev3 or Sev4 incident that is discovered to be worse than initially assessed (e.g. a "single tenant" issue turns out to be platform-wide) must be re-declared at the higher severity via a timeline update (`statusAtUpdate` plus a message explaining the reassessment) — the severity column on `platform.incidents` itself is not changed retroactively (it reflects the declaration-time assessment; the timeline shows how understanding evolved, matching this build's append-only `incident_updates` design).
