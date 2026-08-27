BUILD-28 COMPLETION REPORT — BILLING AND ENTITLEMENTS



Build ID: BUILD-28

Layer: BILLING

Date: 2026-08-05

Branch: claude/infinicus-engine-debug-3loqb4

Implementation commit: b3ade86

Specification: docs/implementation-queue/BUILD-28-BILLING-SPECIFICATION.md

Specification SHA-256: 5a03ab43024907474254c6edfeeb69bdc8ce1261c9ffd8892bf118939a60842d

Status: COMPLETE



WHAT WAS BUILT



BUILD-28 adds the production billing and entitlement foundation for

INFINICUS.



The implementation provides:



\* A billing plan catalog with free, pro, and enterprise plans.

\* One subscription per tenant.

\* Trial, active, grace-period, suspended, and canceled subscription states.

\* Subscription lifecycle history.

\* Feature entitlements by plan.

\* Metered usage limits.

\* Unlimited enterprise-plan usage.

\* Payment-result recording.

\* Failed-payment grace periods.

\* Subscription suspension, reactivation, and cancellation.

\* Server-side billing enforcement on protected business-write routes.

\* Automated lifecycle processing for expired trials and grace periods.

\* Live PostgreSQL repository, service, and HTTP integration tests.



FILES CREATED



infinicus-platform/apps/api/src/plugins/billing.ts

infinicus-platform/apps/api/src/routes/billing.ts

infinicus-platform/apps/api/src/schemas/billing.ts

infinicus-platform/apps/api/tests/billing.integration.test.ts



infinicus-platform/docs/production-readiness/architecture-and-scope-build28.md

infinicus-platform/docs/production-readiness/configuration-build28.md

infinicus-platform/docs/production-readiness/known-limitations-build28.md

infinicus-platform/docs/production-readiness/operating-procedure-build28.md

infinicus-platform/docs/production-readiness/rollback-procedure-build28.md

infinicus-platform/docs/production-readiness/security-controls-build28.md

infinicus-platform/docs/production-readiness/test-evidence-build28.md



infinicus-platform/infrastructure/database/migrations/0150\_create\_billing\_schema.sql

infinicus-platform/infrastructure/database/migrations/0151\_create\_billing\_indexes.sql

infinicus-platform/infrastructure/database/migrations/0152\_create\_billing\_rls\_policies.sql

infinicus-platform/infrastructure/database/migrations/0153\_create\_billing\_triggers\_events.sql



infinicus-platform/infrastructure/deployment/scripts/billing-lifecycle-audit.cjs



infinicus-platform/packages/billing/package.json

infinicus-platform/packages/billing/src/EntitlementService.ts

infinicus-platform/packages/billing/src/errors.ts

infinicus-platform/packages/billing/src/index.ts

infinicus-platform/packages/billing/tests/EntitlementService.integration.test.ts

infinicus-platform/packages/billing/tsconfig.json



infinicus-platform/packages/database/src/repositories/billing/PlanRepository.ts

infinicus-platform/packages/database/src/repositories/billing/SubscriptionRepository.ts

infinicus-platform/packages/database/src/repositories/billing/UsageRepository.ts

infinicus-platform/packages/database/src/repositories/billing/errors.ts

infinicus-platform/packages/database/src/repositories/billing/index.ts

infinicus-platform/packages/database/tests/billing-repositories.integration.test.ts



FILES MODIFIED



infinicus-platform/apps/api/package.json

infinicus-platform/apps/api/src/app.ts

infinicus-platform/apps/api/src/errors.ts

infinicus-platform/apps/api/src/routes/businesses.ts

infinicus-platform/packages/database/src/index.ts

infinicus-platform/pnpm-lock.yaml



ARCHITECTURE



The billing domain is implemented as a dedicated workspace package,

@infinicus/billing.



Database persistence remains inside @infinicus/database through dedicated

billing repositories. Business rules and entitlement decisions are handled

by EntitlementService. HTTP exposure and request enforcement remain inside

apps/api.



The implementation reuses the existing platform tenancy, authentication,

authorization, database-pool, error-handling, Fastify-plugin, and migration

patterns. It does not duplicate those concerns.



The billing API exposes:



\* GET /v1/billing/subscription

\* POST /v1/billing/trial

\* POST /v1/billing/payment-result



Protected business-write routes use server-side active-subscription

enforcement before executing their normal route handlers.



SECURITY



Billing records are tenant-scoped and protected through PostgreSQL row-level

security.



Billing administration requires the appropriate authorization role.

Non-administrative members cannot start or modify subscription trials.



Entitlement enforcement occurs server-side. Client-side state cannot bypass

subscription suspension or cancellation.



Usage limits are enforced transactionally and fail closed. Rejected usage is

not persisted.



Concurrent usage increments are serialized using database row locking,

preventing a tenant from exceeding its plan limit through simultaneous

requests.



Payment outcomes are treated as billing state inputs. External payment

provider trust, signature verification, and webhook authenticity remain the

responsibility of the payment-provider adapter that submits those outcomes.



TENANCY AND AUTHORIZATION



Every subscription belongs to one tenant.



The database enforces one subscription per tenant.



Repository operations use the established tenant-scoped database context and

RLS model.



Cross-tenant subscription access is rejected.



Trial creation is restricted to authorized tenant administrators or owners.



A suspended tenant is rejected before a protected business-write operation

reaches its route-specific database logic.



DATABASE CHANGES



Four migrations were added:



0150\_create\_billing\_schema.sql

Creates the billing schema, plan catalog, subscriptions, subscription status

history, usage records, and required billing domain structures.



0151\_create\_billing\_indexes.sql

Adds billing query, tenant, lifecycle, and usage indexes.



0152\_create\_billing\_rls\_policies.sql

Enables and defines tenant-isolation policies for billing tables.



0153\_create\_billing\_triggers\_events.sql

Adds lifecycle triggers, audit/event behavior, and billing domain event

support.



The complete INFINICUS migration set now contains 168 ordered migrations,

from 0001 through 0168.



All 168 migrations were applied successfully to the selected Supabase

PostgreSQL database.



Migration output completed with:



Migrations complete.

Migration gate passed.



The database was verified before migration:



\* No existing public application tables.

\* No INFINICUS tenancy schema.

\* No existing migrations table.

\* Only standard Supabase-managed schemas were present.



API CHANGES



The API now registers a billing plugin and billing routes.



The API provides normalized billing-domain errors, including suspended and

canceled subscription enforcement responses.



Protected business decision write routes now require an active or otherwise

permitted subscription state.



Lazy free-plan provisioning preserves compatibility for tenants that have not

explicitly started a trial or selected a paid plan.



UI CHANGES



None.



BUILD-28 provides backend billing, entitlement, lifecycle, and enforcement

capabilities. Customer-facing pricing, checkout, subscription-management,

invoice, and payment-method interfaces remain outside this build.



CONFIGURATION



The billing package uses the existing PostgreSQL configuration.



Required database variables used during live validation:



\* DATABASE\_URL

\* ADMIN\_DATABASE\_URL



ADMIN\_DATABASE\_URL was used for migration administration and live database

validation.



The current Supabase connection uses a remote pooler. This is functional but

introduces substantial latency during sequential live integration tests.



RESEND\_API\_KEY was not configured during API integration tests. Email delivery

therefore remained in the existing development fallback mode and logged the

messages that would have been sent. This did not affect billing-test results.



OBSERVABILITY



Subscription status changes are persisted in subscription status history.



Billing lifecycle operations are observable through repository state,

lifecycle records, API errors, and lifecycle-audit script output.



The lifecycle audit script reports the number of expired trials and expired

grace periods processed.



No external billing metrics dashboard or payment-provider observability

integration was added by this build.



TESTS



DATABASE REPOSITORY LAYER



The existing BUILD-28 test evidence records 13 live PostgreSQL repository

tests covering:



\* Plan listing and lookup.

\* Plan display order.

\* Subscription creation.

\* One-subscription-per-tenant enforcement.

\* Full subscription lifecycle transitions.

\* Status-history records.

\* Illegal transition rejection.

\* Idempotent transition handling.

\* Usage increments below and at the plan limit.

\* Rejection above the limit.

\* Unlimited enterprise usage.

\* Independent metrics.

\* Concurrent usage enforcement.

\* Cross-tenant isolation.



SERVICE LAYER



The live EntitlementService suite was rerun against the migrated Supabase

PostgreSQL database.



Result:



\* Test files: 1 passed.

\* Live tests: 11 passed.

\* Environment-guard test: 1 skipped because the live-test branch was active.

\* Failed tests: 0.



Validated behavior included:



\* Free subscription activation.

\* Pro subscription trial creation.

\* Lazy free-plan provisioning.

\* Race-free concurrent provisioning.

\* Active, trialing, suspended, and canceled enforcement.

\* Feature gates.

\* Monthly usage limits.

\* Suspended-tenant usage rejection.

\* Unlimited enterprise usage.

\* Failed-payment grace-period transition.

\* Successful-payment reactivation.

\* Pending-payment recording without lifecycle corruption.



HTTP/API LAYER



The live billing HTTP integration suite was rerun against the migrated

Supabase PostgreSQL database.



Result:



\* Test files: 1 passed.

\* Live tests: 5 passed.

\* Environment-guard test: 1 skipped because the live-test branch was active.

\* Failed tests: 0.



Validated behavior included:



\* GET subscription with lazy free-plan provisioning.

\* POST pro trial creation.

\* Duplicate trial rejection.

\* Non-admin permission rejection.

\* Failed-payment grace-period transition.

\* Suspended-tenant rejection on a billing-protected business-write route.



BUILD AND STATIC VALIDATION



The following had already passed during this validation session:



\* @infinicus/billing typecheck.

\* @infinicus/billing build.

\* @infinicus/billing lint.

\* @infinicus/api and all required dependencies build.



The BUILD-28 test-evidence document records the implementation-time regression

results as:



\* Turbo build: 24/24 tasks successful.

\* Turbo lint: 52/52 tasks successful.

\* TypeScript validation: 0 errors.

\* Database package: 39 test files, 2805 passed, 24 skipped, 0 failed.

\* API package: 9 test files, 50 passed, 9 skipped, 0 failed.

\* Billing package: 1 test file, 11 passed, 1 skipped, 0 failed.

\* Authorization, authentication, onboarding, and workflow packages passing.



TEST-ENVIRONMENT PERFORMANCE NOTE



The default 5-second Vitest timeout was insufficient for live tests against

the remote Supabase pooler.



The service tests passed with a 30-second per-test timeout.



The HTTP tests required a 120-second per-test timeout, with individual tests

taking approximately 34 to 45 seconds.



This is recorded as remote shared-database and connection-pooler latency, not

a functional billing failure. It must not be treated as representative

production latency or an acceptable production API service-level objective.



GENUINE DEFECTS FOUND AND FIXED



1\. PLAN CATALOG ORDER



The enterprise plan uses contact-sales pricing represented as zero, which

caused it to tie with the free plan when sorting by price. An explicit

sort\_order field was added so display order no longer depends on price.



2\. PAYMENT-STATUS UPDATE LOSS



The initial idempotent lifecycle transition path could return before applying

a payment-status update. Payment-status recording was separated into a

dedicated repository operation, preventing payment state from being silently

discarded.



3\. DATABASE OPERATIONAL GRANTS



Initial live validation identified missing access to the new billing schema

for the application role. The existing schema-discovery grant procedure is

required whenever a new schema is deployed.



ROLLBACK



Rollback is documented in:



infinicus-platform/docs/production-readiness/rollback-procedure-build28.md



Application-code rollback can be performed by reverting implementation commit

b3ade86 and redeploying the affected packages.



Database rollback must follow the documented forward-migration policy.

Applied migrations must not be deleted, edited, reordered, or silently

reversed.



A corrective migration must be used when production data or later migrations

depend on the billing schema.



Disabling billing enforcement without removing billing data can be performed

through a controlled application rollback, subject to the documented security

and operational review.



REGRESSION RESULTS



No frozen migration was modified.



The migration set remains ordered and complete through 0168.



The formal BUILD-28 preflight passed:



\* ok: true

\* currentReadyBuild: BUILD-28

\* migrationCount: 168

\* highestMigration: 0168

\* migrationSetSha256:

&#x20; f4e0f3adfd917e43b66580cdc6dc404619c49e797b6474ac836c9bdbd82856cb



The Git working tree was clean after validation and cleanup of temporary or

accidentally created dependency files.



OUT-OF-SCOPE CONFIRMATION



BUILD-28 does not implement:



\* A customer-facing pricing page.

\* Hosted checkout.

\* Payment-provider webhook adapters.

\* Card or payment-method storage.

\* Invoice generation or tax calculation.

\* Refund and chargeback workflows.

\* Coupons or promotional codes.

\* Proration.

\* Multi-currency billing.

\* Dunning email campaigns.

\* A billing administration UI.

\* Revenue recognition.

\* Accounting-ledger integration.

\* Automatic external scheduling of the lifecycle audit.

\* Production performance optimization for remote pooled database access.



These items require separate product, payment-provider, accounting, or

operational work and were not silently added to this build.



KNOWN LIMITATIONS



The authoritative limitations are documented in:



infinicus-platform/docs/production-readiness/known-limitations-build28.md



The main validated limitations include:



\* Payment-provider integration remains external.

\* Lifecycle processing requires operational scheduling.

\* The live development database uses a remote Supabase pooler.

\* Remote integration-test execution is slow.

\* RESEND\_API\_KEY was not configured during current revalidation.

\* Customer-facing billing and account-management interfaces are not included.

\* Application-role grants must be reapplied when deploying new schemas.

\* The current application and administrative database credentials must be

&#x20; separated properly before production operation if they still share the

&#x20; PostgreSQL administrator role.



QUEUE TRANSITION



BUILD-28: ready -> in\_progress -> completed.



BUILD-29 is now eligible to move from pending to ready.



The next authoritative queue state should be:



\* BUILD-28 status: completed

\* BUILD-28 completedAt: 2026-08-05

\* BUILD-28 report:

&#x20; .claude/state/reports/BUILD-28-BILLING-completion.md

\* BUILD-28 testsPass: true

\* BUILD-29 status: ready

\* BUILD-29 notes: Dependency BUILD-28 completed.

\* currentReadyBuild: BUILD-29



Implementation commit: b3ade86

Completion commit: pending

Branch: claude/infinicus-engine-debug-3loqb4

PR: #10

Next build: BUILD-29 (INCIDENT)



