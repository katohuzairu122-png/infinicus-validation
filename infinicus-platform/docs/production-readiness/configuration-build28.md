# BUILD-28 — Billing and Entitlements: Configuration

## No new required environment variables

`packages/billing` and its `apps/api` wiring introduce no new environment variables — `EntitlementService` composes `@infinicus/database` repositories, which use the same `DATABASE_URL`/pool already configured by BUILD-21/22. `billing-lifecycle-audit.cjs` (the operational script that drives time-based transitions — see operating-procedure-build28.md) requires the same `DATABASE_URL`/`ADMIN_DATABASE_URL` pair every other `infrastructure/database/scripts/*` and `infrastructure/deployment/scripts/*` script already requires; no new variable name.

## Plan catalog is migration-seeded, not environment-configured

The three plans (`free`, `pro`, `enterprise`) and their limits/features/trial-day values are seeded directly by migration `0150_create_billing_schema.sql`, not read from configuration. This matches `tenancy.permissions`' precedent (migration-seeded reference data, not env-configured) and keeps plan definitions version-controlled and auditable rather than mutable per-environment state. Changing a plan's limits/features/price in a real deployment requires a new migration (or a future admin capability, explicitly out of scope here — see known-limitations-build28.md), not an environment variable.

## Grace period length is a code constant, not configuration

`DEFAULT_GRACE_PERIOD_DAYS = 7` in `packages/billing/src/EntitlementService.ts` is a hardcoded constant. This was a deliberate proportionality choice for this build's scope — making it environment-configurable would need its own validated config surface (`packages/configuration`) for a single, rarely-changed business rule; documented as a known limitation rather than silently under-engineered.

## No new secrets

No new credential, API key, or payment-processor secret is introduced — this build accepts an already-decided payment result (`POST /v1/billing/payment-result`), it does not call out to any external payment API itself (see architecture-and-scope-build28.md's "Out of scope").
