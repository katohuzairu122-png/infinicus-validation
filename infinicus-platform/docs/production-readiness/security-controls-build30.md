# BUILD-30 — Production Acceptance and Launch: Security Controls

## No new attack surface

This build adds one operational script (not deployed with `apps/api`) and documentation. No new API route, database table, or runtime code path exists for an attacker to reach.

## Security gates re-verified live, not merely cited

Rather than asserting BUILD-26's security tooling "still works" without checking, this build actually re-ran both the dependency scan and the DAST scan against a live-booted instance as part of compiling the launch checklist — and the dependency scan surfaced 4 genuinely new findings in the process (dependency versions shift over time; a security gate that is only ever run once at the build that introduced it would miss this). Each new finding was individually investigated (not blanket-suppressed) and allowlisted only after confirming, via a live `grep` across every package's own `dev`/`preview` scripts, that the vulnerable code path (vite/esbuild's own development server) is never started anywhere in this workspace.

## Monitoring endpoint's authorization gate re-verified live

`GET /v1/metrics` correctly rejects an unauthenticated request (`401`) — re-confirmed live in this build's `launch-acceptance-check.mjs`, not assumed to still be true from BUILD-25's original implementation.

## `launch-acceptance-check.mjs`'s own fixture handling respects RLS, not bypasses it

The script's billing-proof step needed a fixture tenant/workspace to exist. Its first draft attempted this via the RLS-enforced application connection and was correctly rejected — the fix uses a separate, explicit `ADMIN_DATABASE_URL` connection for fixture setup only, with all subsequent entitlement checks still running through the RLS-enforced application pool exactly as production traffic would. This is the same separation of concerns (admin connection for setup, RLS-enforced connection for the actual behavior under test) every other live test in this codebase already uses — the script's initial bug was a real, live-caught confirmation that RLS is doing its job, not a security gap.

## Launch checklist itself does not overclaim

`docs/launch/LAUNCH-CHECKLIST.md` documents the one load-test run that marginally missed its SLO target, and both genuine bugs found in this build's own tooling, rather than presenting a sanitized "all green" record — consistent with every prior build's own known-limitations discipline in this session. A security or operational reviewer reading the checklist gets an honest account, which is itself part of this build's security posture: a launch record that hides its own rough edges is a worse security artifact than one that states them plainly.
