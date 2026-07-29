# BUILD-29 — Incident Response and Rollback: Security Controls

## Server-side enforcement, fail-closed

Every incident route requires `platform:admin` (`app.requirePermission('platform:admin')`, BUILD-18's existing fail-closed `AuthorizationService.authorize()`), live-verified: a `viewer`-role member's `POST /v1/incidents` call is rejected `403`. No incident data or action is exposed to a non-admin caller.

## Authenticated actor attribution, not client-supplied

`declaredBy`/`postedBy` on every incident record and timeline entry come from `request.session.user.id` (the authenticated session), never from the request body — a caller cannot attribute a declaration or update to a different user. This matters for the audit-trail value of the timeline (see post-incident-review-template.md's reliance on it as the source of truth for who did what, when).

## Append-only timeline preserves incident-history integrity

`platform.incident_updates` has a `forbid_mutation` trigger (migration `0156`) — no role, including an admin, can `UPDATE` or `DELETE` a posted timeline entry. This matches every other domain's `*_status_history`/audit-table convention in this codebase and is deliberate: a post-incident review's value depends on the recorded timeline being what was actually known and said at the time, not editable after the fact.

## Bounded payloads

Every incident request body field has an explicit `.max()` bound (`title` 255, `description`/`message` 10,000, `affectedSystems` array capped at 50 entries of 255 chars each, `affectedTenantIds` capped at 1,000 UUIDs, `postmortemUrl` 2,048 chars) — consistent with BUILD-26's bounded-payload requirement, checked for this build specifically rather than assumed.

## No new attack surface beyond the documented, gated routes

Six new routes, all behind `app.authenticate` + `app.resolveTenantContext` + `app.requirePermission('platform:admin')`. `platform.incidents`/`platform.incident_updates` have no RLS (by design — see architecture-and-scope-build29.md), so the permission gate at the API layer is the only access control for this data; there is no tenant-scoped visibility to bypass since the data is not tenant-scoped to begin with (an incident may span every tenant, and only operators need to see it).

## Security-incident runbook itself reuses, not reinvents, prior builds' security mechanisms

`docs/incident-response/runbooks/security-incident.md` explicitly directs a responder to BUILD-24's credential rotation, BUILD-18's audit-event tables, and BUILD-26's SAST/DAST/dependency-scan tooling — this build adds no parallel security mechanism of its own, only the procedural glue tying the existing ones together into an incident-response context.
