# BUILD-19 — Tenant Onboarding: Known Limitations

## No UI

No wizard frontend, form, or admin onboarding-management page was built —
this build is the service/repository layer only, matching its
specification's scope in the same way BUILD-18 was service/repository
only.

## No HTTP layer

Same deferred boundary as BUILD-18 (root `CLAUDE.md` §4) — `OnboardingService`
is framework-agnostic and callable directly; a future HTTP-layer build
must wrap its methods in whatever framework is eventually chosen.

## No email delivery for invitations

`OnboardingService.inviteTeamMembers` produces a real `tenancy.invitations`
row and a raw token via the existing BUILD-18 `AuthorizationService`, but
does not send anything — actually delivering the invitation email is a
future integration, out of scope here exactly as it was out of scope for
BUILD-18's own invitation creation.

## Onboarding creates exactly one workspace

The wizard's first step creates one tenant and one workspace together.
Adding further workspaces to a tenant after onboarding completes uses
`WorkspaceRepository.create()` directly — that path exists and is tested,
but it is not wired into the onboarding state machine (multi-workspace
onboarding was not part of the frozen scope: "workspace creation" is
listed once, singular, in the specification).

## Abandoning does not delete tenant data

`abandonOnboarding` marks the *onboarding attempt* terminal; it
deliberately does not delete the tenant/workspace/business rows already
created by earlier steps (see `rollback-procedure-build19.md`). A user
who abandons and retries gets a **second, independent** tenant — the
first tenant's rows remain in the database (in `trial` status,
unused) unless a separate tenant-deletion capability is built later.
This is a conscious scope boundary, not an oversight: implementing safe
tenant deletion (cascading through every downstream layer's tenant-scoped
data) is a much larger capability than this build's remit.

## Default settings are a fixed, hardcoded set

`applyDefaultSettings` ships exactly three defaults
(`theme`, `notificationsEnabled`, `defaultLocale`) with caller-supplied
overrides merged in. There is no admin-configurable "default settings
template" — any change to the defaults requires an application code
change, matching this build's compile-time-constants approach (see
`configuration-build19.md`).

## Industry is a free-text field, not a controlled vocabulary

`platform.businesses.industry` (frozen schema, migration `0005`) is plain
`text`, not an enum or a foreign key to an industry-taxonomy table — this
build passes whatever string the caller supplies straight through. Adding
a controlled industry taxonomy would require a schema change, which is
out of scope (this build reuses the existing schema without modification).

## The empty-string/NULL `current_setting` cast behavior is a standing footgun

The Postgres behavior documented in `security-controls-build19.md`
(a custom GUC set once via `SET LOCAL` on a pooled connection reverts to
`''`, not `NULL`, for the rest of that connection's session) affects any
**future** repository method that queries an RLS'd table without
explicitly setting every GUC the table's policy references. This build's
own `getActiveForUser()` is fixed; the pattern (set a nil-UUID sentinel
rather than leaving a referenced GUC unset) should be followed by any
future repository with the same "resume before full context is known"
shape. This is flagged here as a reusable lesson, not a defect in this
build's shipped code.
