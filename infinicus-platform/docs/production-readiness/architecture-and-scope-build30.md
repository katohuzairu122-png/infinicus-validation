# BUILD-30 — Production Acceptance and Launch: Architecture and Scope

## Purpose

Deliver the final production-readiness capability: a genuine, evidence-backed go/no-go acceptance record for the entire BUILD-01→BUILD-29 platform, not a rebuild of anything those builds already delivered.

## In scope (spec §2)

- **Acceptance matrix** — `docs/launch/LAUNCH-CHECKLIST.md`: every required-scope item mapped to real evidence, either freshly re-run in this build or cited from a specific prior build's own live-tested result.
- **Critical workflow sign-off** — `apps/api/tests/api.integration.test.ts` re-run live in this build (26 passed, 1 skipped), exercising the full BI→DT→Simulation→ADI→ABA→OM chain plus auth/onboarding/billing/incident routes over real HTTP.
- **Security gates** — `check-dependency-vulnerabilities.mjs` and `dast-scan.sh` (BUILD-26) re-run live in this build; SAST (`eslint-plugin-security`) included in this build's own `pnpm turbo run lint`.
- **Restore proof** — `backup-restore.integration.test.ts` (BUILD-22) re-run live in this build.
- **Rollback proof** — `deployment-rollback.md`/`migration-rollback.md` (BUILD-29) plus a live re-run of `migration-gate.sh`'s state check.
- **Monitoring proof** — `GET /v1/metrics`'s `platform:admin` gate re-verified live.
- **Load target proof** — `load-test.mjs` re-run live against BUILD-27's own documented SLO targets.
- **Privacy proof** — `export-tenant.integration.test.ts`/`delete-tenant-data.integration.test.ts` (BUILD-22/26/27) re-run live, plus an incidental real drill erasing this build's own fixture tenant.
- **Billing proof** — a live subscription lazy-provisioning check through the real `EntitlementService`.
- **Staging approval** — a documented, explicit human-decision gate (see LAUNCH-CHECKLIST.md's own "Staging approval" section) — deliberately not something a script auto-approves.
- **Production smoke test** — `smoke-test.sh`'s exact three checks, reproduced and re-run live.
- **Launch checklist** — `docs/launch/LAUNCH-CHECKLIST.md`.

## New, genuinely code-backed capability: `launch-acceptance-check.mjs`

Rather than a purely documentary "trust the prior builds" checklist, this build delivers one executable script (`infrastructure/deployment/scripts/launch-acceptance-check.mjs`) that boots the real `apps/api` application in-process and runs a battery of live checks in one automated pass: migration state, smoke test, monitoring-gate verification, a load-test snapshot compared against BUILD-27's documented SLO targets, a billing-lazy-provisioning check, and this build's own incident-tracking declare→resolve round-trip. This is the "acceptance matrix" and "production smoke test" required-scope items made executable, not merely narrated.

## Genuine defects found and fixed in this build's own tooling

`launch-acceptance-check.mjs`'s first draft had two real bugs, both caught by running it, not by review: (1) `execFileSync` for the load-test subprocess self-deadlocked the in-process HTTP server (fixed to `execFileAsync`, matching BUILD-27's own established pattern); (2) the migration-state check and billing-proof fixture insert both initially used the RLS-enforced application connection instead of an admin connection, and were correctly rejected (fixed to use `ADMIN_DATABASE_URL`, matching every other fixture-setup script's convention). Full detail in test-evidence-build30.md and LAUNCH-CHECKLIST.md's "genuine findings" section.

Separately, re-running BUILD-26's dependency scan surfaced 4 new, un-allowlisted advisories (`esbuild`, 3× `vite`) not present at BUILD-26's original writing. Investigated, confirmed unreachable (vite/esbuild's own dev servers are never started anywhere in this workspace — verified via a live grep across every package's `dev`/`preview` script), and allowlisted with the same specificity and rigor as BUILD-26's original two entries — not a blanket suppression.

## Out of scope

- **Rebuilding any prior build's mechanism** — deployment/migration rollback, database restore, security scanning, load testing, billing enforcement, and privacy tooling are all reused exactly as BUILD-22 through BUILD-28 built them; this build adds evidence-gathering and one thin orchestration script, not parallel implementations.
- **Actually promoting to a real production environment** — this build produces the acceptance record and a recommendation; executing an actual production promotion (running `deploy.sh` against a real production `DATABASE_URL`/hosting target) requires infrastructure this sandboxed environment does not have and a human decision this build explicitly defers to (see LAUNCH-CHECKLIST.md's "Staging approval").
- **A dedicated chaos-engineering or full commercial DAST/pen-test pass** — every prior build's own known-limitations doc already states this boundary (no OWASP ZAP/commercial DAST tooling installable in this sandboxed environment); this build does not attempt to close that gap, only to honestly carry it forward into the final acceptance record.
- Any functionality beyond the required launch-acceptance scope — this is the final build in the BUILD-10→BUILD-30 roadmap; there is no next build to avoid encroaching on.

## Architecture

One new script (`infrastructure/deployment/scripts/launch-acceptance-check.mjs`), one new documentation tree (`docs/launch/`), no new database schema, no new API routes, no modification to any existing route or migration. No later-build functionality (there is none); no duplicated infrastructure.
