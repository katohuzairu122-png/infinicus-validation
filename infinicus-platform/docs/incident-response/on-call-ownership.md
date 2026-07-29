# On-Call Ownership

This document defines the on-call model this platform's incident-response tooling assumes. It is deliberately written as a template a real operating organization fills in with actual names/rotations — this build ships the mechanism (declaration, timeline, resolution, the `platform:admin`-gated API), not a staffing roster, which is organizational information outside this codebase's scope.

## Roles

- **Primary on-call**: first responder for any paged incident. Responsible for the first timeline update (acknowledgment) and initial triage/severity assignment.
- **Incident commander (Sev1/Sev2 only)**: coordinates the response once an incident is confirmed above Sev3 — not necessarily the primary on-call; may be a separate escalation.
- **Communications owner (Sev1/Sev2 only)**: responsible for customer-facing updates (see communication-templates.md), separate from the person actively debugging, so technical response is not interrupted by status-page duties.

## Escalation path

1. Primary on-call is paged (external paging system — out of this build's scope, see known-limitations-build29.md).
2. Primary on-call declares the incident: `POST /v1/incidents` (requires `platform:admin`).
3. For Sev1/Sev2, primary on-call names an incident commander and communications owner in the first timeline update (`POST /v1/incidents/:id/updates`).
4. If unacknowledged within the severity's target response time (see severity-model.md), escalate to secondary on-call (organization-specific — not encoded in this build).

## Who can declare/manage an incident in this build

`platform:admin` is the permission gate on every incident route (declare, update, resolve, list, get) — the same permission `GET /v1/metrics` (BUILD-25) and `POST /v1/billing/trial` (BUILD-28) already use for cross-tenant operational actions. This is deliberately coarse (one permission covers all incident actions) rather than a dedicated `incident:write`/`incident:read` split, matching this build's proportional scope — a real production rollout with more than a handful of operators might want that finer split, tracked in known-limitations-build29.md.

## Authenticated actor attribution

Every incident record and timeline entry stores who performed the action (`declaredBy`, `postedBy` — the authenticated user's id, taken from the session, never client-supplied) — this is itself an audit trail for who was on-call and responding, reusable directly for a post-incident review's timeline reconstruction.
