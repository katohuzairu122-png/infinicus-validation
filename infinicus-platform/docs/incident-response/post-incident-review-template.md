# Post-Incident Review Template

Required for every Sev1/Sev2 incident, and any Sev3 involving a security or data-integrity concern (see the relevant runbook's own "resolve with a postmortem" step). Blameless: the goal is understanding what happened and closing the gap, not attributing fault to an individual.

Link the completed review's URL in `platform.incidents.postmortem_url` via `POST /v1/incidents/:id/resolve`'s `postmortemUrl` field (or a follow-up call if the review is completed after resolution, which is normal — the incident is resolved when service is restored, the review can follow within a reasonable window afterward).

---

## Incident summary

- **Incident ID**: (`platform.incidents.id`)
- **Severity**: sev1–4
- **Declared**: (timestamp)
- **Resolved**: (timestamp)
- **Duration**: (resolved_at − declared_at)
- **Affected systems**: (from `affected_systems`)
- **Affected tenants**: (count/list from `affected_tenant_ids`, or "platform-wide")

## Timeline

Pull directly from `GET /v1/incidents/:id/updates` — the append-only timeline is the source of truth for what was known and done, when. Do not reconstruct from memory if the recorded timeline exists; correct the review to match the record, not the other way around.

## What happened (root cause)

Plain description of the actual root cause, distinct from the symptom that triggered the initial alert/report. If multiple contributing factors exist, list all of them — a single root cause is often an oversimplification.

## What went well

Genuine, specific things that worked — fast detection, an effective runbook step, a mitigation that actually reduced impact. Not filler.

## What could be improved

Specific, actionable gaps — a monitoring blind spot, a runbook step that was unclear or wrong, a delay in escalation, a missing automated check. Each item here should be traceable to a concrete follow-up action below, not left as a vague observation.

## Follow-up actions

| Action | Owner | Target date | Status |
|---|---|---|---|
| | | | |

Every "what could be improved" item should map to at least one row here. A review with no follow-up actions is a signal the review wasn't thorough enough, not that nothing needs to change.

## Customer impact and communication

Was the affected-tenant assessment (`affected_tenant_ids`) accurate at declaration time, or did it need correcting mid-incident? Were the customer-facing timeline updates (`isCustomerFacing: true`, see communication-templates.md) timely and accurate in hindsight? Any commitment made to customers (e.g. "full review to be published") — confirm it is fulfilled by this document's own publication.
