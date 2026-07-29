# BUILD-28 — Billing and Entitlements: Architecture and Scope

## Purpose

Deliver the platform's billing/entitlements production-readiness capability: a plan catalog, per-tenant subscriptions with a fail-closed lifecycle state machine, atomic usage metering with plan-limit enforcement, feature entitlements, trial lifecycle, payment status and invoice references, grace periods, suspension/reactivation, and server-side enforcement wired into real API routes — not a UI mockup or a stub.

## In scope (spec §2)

- **Plans** — `billing.plans` (global catalog, seeded: free/pro/enterprise), `PlanRepository`.
- **Subscriptions** — `billing.subscriptions` (one row per tenant), `SubscriptionRepository`, a fail-closed status state machine (`trialing → active → past_due → grace_period → suspended → canceled`, with only explicitly allowed transitions).
- **Usage metering** — `billing.usage_records`, `UsageRepository.incrementAndCheck()`: atomic per-tenant/metric/calendar-month counters, using `INSERT ... ON CONFLICT DO UPDATE`'s row-level lock for race-free concurrent enforcement (live-tested at 30 concurrent callers against a limit of 20).
- **Limits** — plan-defined numeric limits in `billing.plans.limits` (`null` = unlimited), enforced by `EntitlementService.recordUsageAndEnforceLimit()`.
- **Feature entitlements** — plan-defined boolean flags in `billing.plans.features`, enforced by `EntitlementService.hasFeature()`/`enforceFeature()`.
- **Trial lifecycle** — `trial_days`/`trial_ends_at`, `EntitlementService.startSubscription()`, and `billing-lifecycle-audit.cjs expire-trials` (an unconverted trial moves to `grace_period`, not straight to `suspended` — the same courtesy window a payment failure gets).
- **Payment status** — `billing.subscriptions.payment_status`, `SubscriptionRepository.recordPayment()` (deliberately independent of the lifecycle `status` field — see test-evidence-build28.md for why).
- **Invoice references** — `billing.subscriptions.external_invoice_reference`: a reference string only, never raw payment data (CLAUDE.md §12: "credential records store references, never raw secrets").
- **Grace period** — `grace_period_ends_at`, set on payment failure (`EntitlementService.recordPaymentResult('failed', ...)`) and on trial expiry without conversion; `billing-lifecycle-audit.cjs expire-grace-periods` auto-suspends once elapsed.
- **Suspension/reactivation** — `EntitlementService.suspend()`/`reactivate()`, live-verified to actually block (`402 SubscriptionSuspendedError`) and restore access.
- **Server-side enforcement** — `apps/api/src/plugins/billing.ts` (`app.requireActiveSubscription()`, mirroring `permission.ts`'s `app.requirePermission()` factory pattern), wired into `businesses.ts`'s two consequential write routes; `GET/POST /v1/billing/*` HTTP routes; a live end-to-end HTTP test proving a suspended tenant is genuinely rejected before the route handler's own logic runs.

## Genuine design decision: "no subscription yet" is not "blocked"

`EntitlementService.enforceActiveSubscription()` lazily provisions a free-plan subscription for a tenant with no subscription row at all, rather than treating that as a block. This was a deliberate choice made after discovering that wiring hard enforcement into `businesses.ts` would otherwise fail-closed every tenant onboarded before this build existed (including every fixture in the pre-existing `api.integration.test.ts` suite) — and "never engaged with billing yet" is a materially different, legitimate state from "explicitly suspended for non-payment." Only `suspended` and `canceled` are hard blocks; `trialing`/`active`/`past_due`/`grace_period` all remain functional, matching how most real billing systems keep service running through a short payment-recovery window instead of cutting a tenant off at the first failed charge. Live-verified concurrency-safe (10 concurrent first-time calls for one tenant resolve to exactly one subscription row, not a race of duplicates).

## Out of scope

- **Real payment processing** — no Stripe/payment-processor integration; `recordPaymentResult()`/`POST /v1/billing/payment-result` accept an already-decided payment outcome (as a real processor's webhook would report) and apply its lifecycle consequence — this build does not charge a card or talk to any external payment API.
- **Plan upgrade/downgrade (changing an existing subscription's plan)** — creation and lifecycle-status transitions are in scope; switching a subscription's `plan_id` after creation is not, kept out to hold this build to its smallest coherent scope. Tracked in known-limitations-build28.md.
- **Proration, invoicing/billing-document generation, tax calculation** — real payment-processor responsibilities, not a plan/entitlement system's.
- **A billing admin UI** — this build is API + enforcement; no `apps/web`/`apps/admin` screens were added.
- Any later-build functionality (BUILD-29 incident response, BUILD-30 launch).

## Architecture

New: `billing` database schema (migrations 0150–0153, no existing schema/migration modified), `packages/database/src/repositories/billing/*` (matching every other domain's repository-package-boundary convention), a new top-level package `packages/billing` (mirroring `packages/authorization`'s shape — a service package that composes `@infinicus/database` repositories, not a repository package itself; precedented by `packages/onboarding`/`packages/workflow` already existing outside CLAUDE.md's original package list), and `apps/api/src/{plugins,routes,schemas}/billing.ts` (mirroring `permission.ts`'s preHandler-factory decorator pattern exactly). No later-build functionality added; no duplicated infrastructure (RLS, outbox schema, connection pooling, the `TenantContext`/`withTenantTransaction` primitives are all reused unchanged).

Unlike most other domains' `emit_*` outbox wrapper functions — found by the immediately preceding build (BUILD-27) to be almost entirely defined-but-never-called — this build's two outbox functions (`billing.emit_subscription_status_changed`, `billing.emit_usage_limit_exceeded`) are each called directly from the repository layer they belong to (`SubscriptionRepository.transitionStatus()`, `UsageRepository.incrementAndCheck()`), not left orphaned.
