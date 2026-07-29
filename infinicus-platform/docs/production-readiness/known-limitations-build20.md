# BUILD-20 — Customer Decision Workflows: Known Limitations

## No authentication/session UI — the most important follow-up

`apps/web` resolves tenant context from visible query parameters
(`?tenantId=&workspaceId=&userId=`), not a real session. This is a
deliberate, clearly-labeled placeholder (see
`configuration-build20.md`/`security-controls-build20.md`), not a
security control, and it must be replaced with real session-based
authentication before this application is exposed to real user traffic.
No prior build in this sequence has built a login UI either (BUILD-18
built the authentication *service* layer, `@infinicus/authentication`,
but no HTTP/UI wiring exists yet) — this remains the single largest gap
blocking production readiness across the whole platform, not something
introduced by this build.

## No in-UI discovery of "what's pending review"

The ABA review form and the outcome-entry form both require the
reviewer to paste in an id directly (the ABA intake package id, and the
monitored action id respectively) rather than picking from a list of
"things awaiting your review." No repository in this codebase currently
exposes a "list intake packages awaiting review for a business" or
"list monitored actions awaiting an outcome" query — adding one would be
a reasonable, small follow-up but was judged out of this build's frozen
scope (it would mean designing a new read method's semantics for a
"pending" concept that doesn't have a single obvious status value across
the relevant tables' state machines).

## This UI does not trigger a simulation run, or generate a DT snapshot or an ADI recommendation

"Simulation execution" in this build's required scope means *viewing*
simulation execution state and results — this UI has no button that
starts a new simulation, publishes a new DT snapshot, or generates a new
ADI recommendation. Those remain the responsibility of their own layers'
pipelines (the browser SIM/DT/ADI blocks from earlier root-level builds,
or a future automation trigger) — this was a deliberate scope boundary,
not an oversight: building "trigger a simulation from a web form" would
require wiring into the actual Simulation engine, a substantial and
architecturally separate body of work explicitly out of this build's
frozen scope ("Add no later-build functionality").

## Decision history is per-stage, not one interleaved timeline

`getDecisionHistory` returns five separate, independently-ordered lists
(one per domain) rather than a single chronologically merged timeline.
No domain repository in this codebase currently exposes a directly
comparable creation timestamp across all six domains through its public
interface (each `rowTo*` mapper omits `created_at` from its returned
type, using it only internally for `ORDER BY`) — merging them would have
required widening five more repositories' public interfaces beyond what
this build's scope required. The correlationId/FK-chain lineage that
*would* allow reconstructing one true cross-stage timeline (documented
in `architecture-and-scope-build20.md`'s research) is present in the
schema but not surfaced by this build.

## No admin/ops UI for the ABA approver-assignment lifecycle

`submitApprovalDecision` creates a fresh `ApproverAssignment` on every
call (via `ApproverAuthorityRepository.createAssignment`) rather than
reusing or managing existing assignments — there is no UI to view,
reuse, revoke, or delegate approver assignments. This matches the
BUILD-15 repository's own design (assignments are cheap, per-review
records, not a persistent roster), but a real approver-management UI is
a reasonable future addition, out of this build's scope.

## No client-side interactivity beyond native HTML forms

The UI uses no client-side JavaScript framework features beyond what
Next.js's App Router provides by default (React Server Components,
native `<form>`/Server Actions) — no optimistic UI updates, no
client-side validation beyond native HTML `required`/`aria-required`
attributes, no toast notifications. This keeps the bundle small and the
accessibility story simple (native forms are inherently
keyboard-and-screen-reader accessible), at the cost of a plainer
interaction model than a fully client-rendered SPA would offer. Given
this build's scope (a working, accessible, responsive review/decision
UI, not a polished product), this tradeoff was judged appropriate.

## Styling is hand-written CSS, not a design system

`app/globals.css` is a small, hand-written, dependency-free stylesheet
(CSS custom properties, flexbox/grid, light/dark via
`prefers-color-scheme`) rather than an adopted design system or
component library. This keeps the dependency footprint minimal for a
first UI build, but means visual consistency across future pages will
require either continuing this hand-written approach or introducing a
real design system later — a decision explicitly deferred, matching the
same "framework/tooling choices require explicit instruction" posture
already applied to the Next.js decision itself.
