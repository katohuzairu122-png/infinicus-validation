# BUILD-20 — Customer Decision Workflows: Security Controls

## Server-side enforcement only

All reads and writes happen inside Next.js Server Components and Server
Actions, which execute exclusively on the server. No database
credential, connection string, or query logic is ever sent to the
browser — the client receives only rendered HTML and the opaque Server
Action references React Server Components generate. `DATABASE_URL` is
read from `process.env` on the server process only.

## Tenant isolation (RLS) — unchanged, fully inherited

This build adds no new table and no new RLS policy. Every read
`DecisionWorkflowService` performs, and every write it forwards, runs
through `withTenantTransaction(ctx, ...)` in the underlying repository —
the exact same fail-closed RLS enforcement every prior build already
relies on. `getWorkflowView`/`getDecisionHistory` were live-tested
against cross-tenant access: reading a business or its evidence with the
wrong tenant's context in `ctx` returns nothing (rejected by RLS, not
by application-level filtering) rather than leaking another tenant's
data.

## No secrets in the browser bundle

`apps/web`'s Server Components and Server Actions run only on the
server; the client-side JavaScript bundle contains no database
connection details, no repository code, and no credentials — confirmed
by inspecting the Next.js build output (`Route (app)` table shows small,
generic client bundle sizes with no server-only code included).

## Fail-closed, never-decides orchestration (AD-021)

`DecisionWorkflowService.submitApprovalDecision` and `.recordOutcome`
never choose an outcome themselves — they require an explicit `outcome`
parameter (`'approve' | 'approve_with_modifications' | 'reject'`) or
explicit outcome content from the caller, and simply forward that choice
to the repository method that already enforces immutability
(`ApprovalDecisionImmutableError`/`OutcomeObservationImmutableError` on
any attempt to redecide). The service adds no autonomous
decision-making logic anywhere.

## Known placeholder: tenant context via query parameters

**This is documented, not hidden.** No login/session UI has been built
yet (see `known-limitations-build20.md`), so `apps/web` currently trusts
`?tenantId=&workspaceId=&userId=` query parameters as the caller's
identity, with no verification that the caller is actually entitled to
act as that user. This is explicitly **not** a production-ready
authentication mechanism — it is a placeholder that makes the UI usable
and testable before a real auth-UI build exists, and it is labeled as
such directly in the UI (`app/businesses/page.tsx`'s notice text) and in
this document. **Before this application is exposed to any real user
traffic, session-based authentication must replace this mechanism** —
recorded here as the single most important follow-up item from this
build.

## Input validation

Server Actions coerce and validate the one enum-shaped input
(`outcome`) before use, rejecting anything outside the three valid
values with a clear error rather than passing an unvalidated string
through to the database layer. Free-text fields (summaries, ids) are
passed through to repository methods that already parameterize every
SQL query (no string concatenation anywhere in this build, matching
every prior build's convention) — this build introduces no new SQL
injection surface.

## Least privilege

`apps/web` connects with the same least-privilege, RLS-enforced
`app_test_user`-equivalent role as every other part of this codebase —
no `BYPASSRLS` connection is used anywhere in this build.

## Immutable audit evidence

Both human-decision writes this build exposes
(`submitApprovalDecision`, `recordOutcome`) ultimately land in
append-only, immutability-guarded tables from prior builds
(`approved_business_action.approval_decisions`/`_versions`,
`outcome_monitoring.outcome_observations`/`_versions`) — this build adds
no new mutability anywhere in the persistence layer.
