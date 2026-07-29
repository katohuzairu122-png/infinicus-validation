# BUILD-29 — Incident Response and Rollback: Architecture and Scope

## Purpose

Deliver the platform's incident-response production-readiness capability: a severity model, on-call ownership definition, runbooks for the platform's actual operational scenarios, communication templates, and a real, auditable incident-tracking mechanism (declaration → timeline → resolution) with server-side enforcement — while reusing, not duplicating, the deployment/migration rollback and database restore mechanisms BUILD-22/23 already built and live-tested.

## In scope (spec §2)

- **Severity model** — `docs/incident-response/severity-model.md`: sev1–4, response-time/update-cadence targets, escalation rule.
- **On-call ownership** — `docs/incident-response/on-call-ownership.md`: roles, escalation path, and this build's `platform:admin` permission gate as the actual access-control mechanism.
- **Runbooks** — `docs/incident-response/runbooks/`: deployment rollback, migration rollback, restore procedure (all three reusing BUILD-22/23's real tooling, with verified-accurate command syntax — see test-evidence-build29.md), security incident handling, and provider outage handling (two genuinely new runbooks this build adds, since neither existed before).
- **Communication templates** — `docs/incident-response/communication-templates.md`: customer-facing update templates per lifecycle stage, tied directly to `platform.incident_updates.is_customer_facing`.
- **Deployment rollback / migration rollback / restore procedure** — the *mechanisms* already exist (BUILD-22/23); this build's contribution is the incident-response-oriented runbook wrapping each one, not a reimplementation.
- **Security incident handling** — `docs/incident-response/runbooks/security-incident.md`, tying together BUILD-24's credential rotation, BUILD-18's audit trail, and BUILD-26's security controls into one incident-response procedure.
- **Provider outage handling** — `docs/incident-response/runbooks/provider-outage.md`, using BUILD-22's health/readiness split (`GET /v1/health` vs `GET /v1/ready`) as the actual mechanism for distinguishing "we are down" from "a dependency we don't control is down."
- **Post-incident review** — `docs/incident-response/post-incident-review-template.md`, a blameless template driven directly from the append-only `platform.incident_updates` timeline (not reconstructed from memory).

## New, genuinely code-backed capability: incident declaration and tracking

Every prior required-scope item above is process/documentation; this build also adds real, live-tested code so an incident has an actual system record, not just a runbook to follow manually:

- `platform.incidents` / `platform.incident_updates` (migrations 0154–0156): one row per declared incident plus an append-only timeline, platform-scoped (no RLS — an operator/on-call artifact, not tenant data, matching `platform.deployment_events`' precedent from BUILD-23).
- `PlatformIncidentRepository` (`packages/database`): declare/getById/listActive/listBySeverity/addUpdate/resolve/listUpdates.
- 6 new HTTP routes under `apps/api` (`/v1/incidents*`), `platform:admin`-gated, live-verified end-to-end (declare → list → update → resolve → timeline read-back, plus a 403 permission-denial test and a 409 double-resolve test).

## Genuine naming collision found and resolved

`business_operations.IncidentRepository`/`Incident` (BUILD-08, a workplace/operational-incident concept within a tenant's business data) already occupied those export names in `packages/database`'s barrel. This build's classes are named `PlatformIncident*` throughout (table names remain `platform.incidents`/`platform.incident_updates`, unambiguous at the schema level) — found by the first attempted build of this package (a real `tsc` duplicate-identifier error), not discovered later.

## Genuine design constraint found and respected: outbox events require a tenant

`events.outbox_events.tenant_id` is `NOT NULL` (migration `0007`) — a genuinely platform-wide event (no single owning tenant) cannot be represented in it without an artificial sentinel tenant. `platform.deployment_events` (BUILD-23) and `platform.secret_rotation_events` (BUILD-24) — the two prior platform-scoped audit tables — already establish the precedent of not emitting outbox events for exactly this reason; this build's migration explicitly documents following that same precedent rather than inventing a workaround.

## Out of scope

- **External paging/on-call scheduling integration** (PagerDuty, Opsgenie, etc.) — this build's on-call-ownership doc defines the model and escalation path; actually paging a human is outside this codebase's scope (no external service credentials configured in this environment).
- **A public-facing status page application** — communication-templates.md defines what a customer-facing update should say; publishing it to an actual external status page (a separate hosted service or app) is not built here. `is_customer_facing` timeline entries are the data a real status-page integration would consume.
- **Fine-grained incident permissions** (`incident:read`/`incident:write` split) — every incident route uses the single coarse `platform:admin` gate, matching this build's proportional scope; tracked as a known limitation for a larger operator team.
- **Automatic incident detection/auto-declaration from alerts** — BUILD-25's `observability.alert_events` exists and could feed a future auto-declare capability, but this build's incidents are declared by a human via the API, not automatically triggered.
- Any later-build functionality (BUILD-30 launch readiness).

## Architecture

Three new migrations (`0154`–`0156`), one new repository (`packages/database/src/repositories/incident`), one new `apps/api` route/schema/plugin-free integration (reuses the existing `permission.ts` plugin's `app.requirePermission('platform:admin')`, no new plugin needed since this build introduces no new enforcement *kind*, only new *resources*). No later-build functionality added; no duplicated infrastructure — deployment rollback, migration handling, and database restore all reuse BUILD-22/23's exact existing scripts, referenced (with verified-accurate usage syntax) rather than reimplemented.
