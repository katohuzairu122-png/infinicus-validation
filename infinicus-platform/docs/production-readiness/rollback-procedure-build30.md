# BUILD-30 — Production Acceptance and Launch: Rollback Procedure

## What this build changes

- One new operational script: `infrastructure/deployment/scripts/launch-acceptance-check.mjs`. Not deployed with `apps/api`, no runtime dependency on it.
- One new documentation tree: `docs/launch/LAUNCH-CHECKLIST.md`.
- 7 new docs under `docs/production-readiness/*-build30.md`.
- One modification to an existing script: `infrastructure/deployment/scripts/check-dependency-vulnerabilities.mjs` gained 4 new allowlist entries (additive — no existing entry removed or changed).

**No database migration. No production API route, schema, or runtime application code changes.**

## Rollback

```bash
git revert <this-build's-commit-sha>
```

Since there is no migration and no runtime code path affected, a plain revert is complete and safe.

## If the dependency-scan allowlist additions specifically need to be rolled back

Reverting this commit restores `check-dependency-vulnerabilities.mjs` to its pre-BUILD-30 state (2 allowlist entries instead of 6) — the script would then correctly re-fail on the 4 esbuild/vite advisories again, exactly as it did on this build's own first live run, forcing a fresh justification (or a real dependency upgrade) before the security gate passes again. This is the intended, safe behavior of a revert here: it does not silently re-suppress anything, it returns the gate to its prior, stricter state.

## Verification after rollback

```bash
pnpm turbo run build lint typecheck
node infrastructure/deployment/scripts/check-dependency-vulnerabilities.mjs   # should FAIL again post-revert, confirming the allowlist additions were actually removed
```

## No data-loss risk from rollback

`launch-acceptance-check.mjs` creates one fixture tenant/workspace per run under a fixed, obviously-test id (`launch-acceptance-tenant`) and does not delete real data. Reverting carries no risk of destroying real state.
