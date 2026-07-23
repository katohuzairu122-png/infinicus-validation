# BUILD-28 — Billing and Entitlements: Test Evidence

## Repository layer (`packages/database/tests/billing-repositories.integration.test.ts`)

13 live tests against real PostgreSQL, including:
- Plan catalog listing/lookup, correct `sort_order` (see "genuine bug" below).
- Subscription creation, one-per-tenant enforcement (`SubscriptionAlreadyExistsError`), and a full status-history-recorded lifecycle walk (`trialing → active → suspended → active → canceled`), each transition's `from_status`/`to_status` verified in `subscription_status_history`.
- An illegal transition (`canceled → active`) rejected with `InvalidSubscriptionTransitionError`.
- A transition to the current status treated as an idempotent no-op (no duplicate history row written).
- Usage metering: increment-under-limit, increment-to-exactly-the-limit (allowed), increment-over-limit (`UsageLimitExceededError`, and the rejected attempt's quantity confirmed **not** persisted).
- `null` limit (enterprise plan) confirmed genuinely unlimited at 1,000,000 units.
- Two metrics (`simulation_runs`, `reasoning_runs`) confirmed metered independently for the same tenant.
- **30 concurrent `incrementAndCheck()` calls against a limit of 20**: exactly 20 succeeded, 10 rejected, final persisted quantity exactly 20 — proves the row-lock-based serialization is race-free, not merely "usually correct."
- Cross-tenant isolation: a second tenant's direct `getById()` for the first tenant's subscription resolves not-found (RLS-scoped).

## Service layer (`packages/billing/tests/EntitlementService.integration.test.ts`)

11 live tests, including:
- Default free-plan subscription starts `active` (no trial); pro-plan subscription starts `trialing` with a real trial-end date.
- **Lazy provisioning**: a tenant that never called `startSubscription()` still resolves to an `active` free-plan subscription on its first `enforceActiveSubscription()`/`getSubscriptionWithPlan()` call.
- **Lazy-provisioning concurrency**: 10 concurrent first-time `enforceActiveSubscription()` calls for one tenant resolve to exactly one subscription id (`new Set(...).size === 1`) — no duplicate-row race.
- `enforceActiveSubscription()` passes for trialing/active, throws `SubscriptionSuspendedError`/`SubscriptionCanceledError` for suspended/canceled.
- Feature gating: free plan lacks `apiAccess`, pro plan has it — both `hasFeature()` and the fail-closed `enforceFeature()` verified.
- Free plan's `simulationRunsPerMonth` limit (20) enforced end-to-end through the service layer, not persisted on rejection.
- Metered usage is blocked entirely for a suspended tenant (`enforceActiveSubscription()` runs first, so the usage check never executes).
- Enterprise plan's `null` limit confirmed unlimited through the service layer.
- A failed payment moves an active subscription to `grace_period` with a real future `gracePeriodEndsAt`; a subsequent successful payment reactivates it and clears the grace period.
- A `pending` payment updates `payment_status` without changing the lifecycle `status` — the specific bug this build found and fixed in its own first draft (see "genuine bug" below).

## HTTP layer (`apps/api/tests/billing.integration.test.ts`)

5 live tests booting the real Fastify app and exercising it over real HTTP (`app.inject`), including:
- `GET /v1/billing/subscription` lazily provisions and returns the free plan with `usage: { simulation_runs: 0, reasoning_runs: 0 }`.
- `POST /v1/billing/trial` starts a pro trial (`201`), a second call for the same tenant returns `409`.
- `POST /v1/billing/trial` is rejected `403` for a `viewer`-role member (permission gate genuinely enforced, not just documented).
- `POST /v1/billing/payment-result` with `status: 'failed'` moves the subscription to `grace_period` with a real future `gracePeriodEndsAt` over real HTTP.
- **End-to-end enforcement**: a tenant explicitly suspended via `EntitlementService.suspend()` is rejected `402` (`error.code: "SubscriptionSuspendedError"`) calling `POST /v1/businesses/:id/decisions` — verified with a schema-valid-but-otherwise-nonexistent request body, confirming the `402` comes from the `preHandler` chain (before the route handler's own record-lookup logic could run), not a coincidental later failure.

## Lifecycle audit script (`billing-lifecycle-audit.cjs`) — live drill

Ran against real fixture data with deliberately backdated timestamps:
- A `trialing` subscription with `trial_ends_at` one day in the past → `expire-trials` moved it to `grace_period` with a real 7-day-forward `grace_period_ends_at`, logged and counted correctly (`Processed 1 expired trial(s).`).
- A `grace_period` subscription with `grace_period_ends_at` one hour in the past → `expire-grace-periods` moved it to `suspended`, logged and counted correctly (`Processed 1 expired grace period(s).`).
- Both re-verified via direct query afterward (`status`/`grace_period_ends_at` columns matched exactly what the script reported).

## Genuine bugs found and fixed during this build's live testing

1. **`billing.plans` catalog sort ambiguity**: the `enterprise` plan's price is "contact sales" (stored as `0`), which ties with the `free` plan under a naive `ORDER BY price_cents` — the repository's own first live test run genuinely returned `[free, enterprise, pro]` instead of the intended catalog order. Fixed by adding an explicit `sort_order` column (migration `0150`) rather than continuing to overload `price_cents` for both "cost" and "display order," two things that are not the same for a plan whose price isn't a number in the usual sense.
2. **`SubscriptionRepository.transitionStatus()`'s idempotent no-op short-circuit silently dropped payment-status updates**: a `recordPayment(status: 'pending')` call implemented as "transition to the current status with `paymentStatus` in the options" would have returned the unchanged row without ever applying `paymentStatus`, because the idempotent-no-op branch returns before options are read. Found before it shipped (this build's own service-layer test design surfaced the gap during development, not a production incident) — fixed by giving `payment_status` its own dedicated `recordPayment()` repository method, independent of the lifecycle `status` state machine entirely, and covered by a dedicated live test (`'a pending payment updates payment_status without changing the lifecycle status'`).
3. **New schema forgot the operational grant step**: the first live test run against the new `billing` schema failed with `permission denied for schema billing` — not a code bug, but a reminder that `grant-app-role.sh` (BUILD-23, schema-discovery-based) must be re-run whenever a new schema is added to a fresh/existing database, same as every prior schema-adding build required. Documented here as evidence the existing operational tooling correctly generalizes to a brand-new domain without any code change of its own.

## Full regression (this build's changes only — no unrelated regressions)

```
pnpm turbo run build      → 24/24 tasks successful (was 23; @infinicus/billing added)
pnpm turbo run lint       → 52/52 tasks successful (0 errors)
pnpm turbo run typecheck  → included above, 0 errors
pnpm turbo run test --filter=@infinicus/database --filter=@infinicus/api --filter=@infinicus/billing \
  --filter=@infinicus/authorization --filter=@infinicus/authentication --filter=@infinicus/onboarding --filter=@infinicus/workflow
  → @infinicus/database:      39 test files, 2805 passed | 24 skipped (0 failed)
  → @infinicus/api:            9 test files,   50 passed |  9 skipped (0 failed)
  → @infinicus/billing:        1 test file,    11 passed |  1 skipped (0 failed)
  → authorization/authentication/onboarding/workflow: all passing, unchanged
```

Wiring `app.requireActiveSubscription()` into `businesses.ts`'s two write routes was verified NOT to break any pre-existing test in `api.integration.test.ts` (27 tests, all still passing) — the lazy free-plan provisioning is exactly what makes this safe: every pre-existing test tenant that hits those routes gets transparently, correctly provisioned onto the free plan rather than being newly blocked.
