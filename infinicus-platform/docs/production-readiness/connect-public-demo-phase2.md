# Connect the public demo to the real backend — Phase 2 (frontend)

Scope: wire the live site's `index.html` "Run Simulation" flow to Phase 1's real backend pipeline (`docs/production-readiness/connect-public-demo-phase1.md`), while requiring signup first, without touching any existing auth system.

## What this phase built

- **`API_BASE_URL`** — env-swappable: defaults to `http://127.0.0.1:3000` on `localhost`/`127.0.0.1`, otherwise `https://api.infini-cus.com` (Phase 4's placeholder target). A `localStorage.inf_api_base_url` override lets it be pointed anywhere without editing the file — used for all local verification in this phase.
- **A backend identity bridge** (`ensureBackendBusiness()` / `runBackendSimulation()` in `index.html`) that provisions a shadow account on the new backend (its own separate `apps/api` identity system, with no shared login with Supabase) tied to the currently-signed-in visitor, and runs a simulation through it. Provisioning (register → onboarding → business creation) happens once per browser and is cached in `localStorage['inf_backend_account_v1']`; every run does a fresh login for a valid session token.
- **`startSim()`/`finalize()` rewired**: the real backend call is kicked off in parallel with the existing (unchanged) fake progress-bar UI; `finalize()` (now `async`) awaits it and, on success, feeds `S.days`/`S.events`/`S.mc` from the real `EngineRunResult` into all existing, untouched rendering code (`renderVerdict`, `calcScores`, `computeVerdict`, dashboard charts) — those functions only ever read `S.days`/`S.mc`/`S.params`, so nothing about rendering itself changed.
- **Graceful fallback, not a hard dependency**: any backend failure (network error, unreachable API — expected before Phase 3/4's OCI deployment exists) is caught and logged via `console.warn`, and `finalize()` falls back to the original client-side `simulate()`/`monteCarlo()` computation. The demo cannot be broken by this change before the real backend is actually deployed and reachable.
- **Backend parity fix found while wiring this up**: the multi-revenue-stream UI fields (`price2`/`vol2`/`price3`/`vol3`, combined into `extraDailyRev`) were silently dropped by the backend — `SimulationOrchestrationService`'s `StartSimulationInput` and the `/v1/businesses/:id/simulations` Zod schema didn't accept the field at all, even though the ported engine (`SimulationParams`) already supported it. Fixed: `extraDailyRev` is now accepted end-to-end (`StartSimulationInput`, `normalizeInput`, `startSimulationBodySchema`).
- **Response shape widened** (carried over from the end of Phase 1, finished here): `SimulationRunStatusResult` changed from a narrow aggregate object to the full `EngineRunResult` (day-by-day array, discrete events, and the complete 500-value Monte Carlo distribution), because that's what the existing frontend rendering code actually needs — not just summary numbers. `executeRun()` now persists the real `outcome` object directly; `apps/api`'s Zod response schema validates the full shape.

## A real architectural discovery that shaped this phase's design

The live site turns out to already have **two independent, unrelated auth gates**:

1. `startSim()`'s own `if (!U) { redirect to landing.html }` check, tied to the real Supabase Auth integration (`SUPA`, `doLogin()`/`doRegister()`, `onAuthStateChange`).
2. A separate, synchronous, page-load-time "AUTH GUARD" IIFE (`index.html`, near the bottom of the main script) that checks `localStorage['infinicus_user']` directly and redirects to `landing.html` on every load if it's missing — independent of `U` itself, though `saveUser()` (called from `onAuthStateChange`) keeps the two in sync in practice.

In other words: **"require signup first" was already fully implemented** before this phase — Phase 2 didn't need to build a new login modal. What was actually missing was a bridge from that already-required Supabase identity to the new backend's own, separate identity system (a bearer-token/tenant/workspace/business model with no knowledge of Supabase). This phase built that bridge (`ensureBackendBusiness()`) rather than duplicating login UI, and never reads, writes, or otherwise touches Supabase auth, `landing.html`'s signup, or `account.html`.

## Known simplifications (deliberate, not bugs)

- The backend shadow account's password is a random value generated once per browser and stored only in that browser's `localStorage` (never transmitted anywhere else, never derived from anything guessable). Clearing `localStorage` or switching browsers provisions a *new* shadow account/business for the same Supabase identity — acceptable for a first-run public demo; would need real account linking (e.g., a backend endpoint keyed on a verified Supabase ID token) if this needs to survive across devices later.
- The 6-month/12-month extended forecast (`simulateLong`/`monteCarloLong`, used by the Forecast tab) is **not** part of the backend pipeline yet — Phase 1's engine only models the 90-day `SIM_DAYS` window. It's still computed client-side in `finalize()` regardless of which engine produced the main 90-day run. Extending the backend to cover this is future work, not required for this phase's scope.
- No mechanism yet reconciles a backend shadow account with a *real* Supabase account if the same person visits from two different browsers — by design, out of scope until real account linking is decided.

## Verification

- `pnpm turbo run build lint typecheck test` for every package touched in this phase (`@infinicus/workflow`, `@infinicus/api`, `@infinicus/database`, `@infinicus/simulation-engine`): all green, run both individually and as part of a full-workspace pass. (Two pre-existing, unrelated packages — `@infinicus/shared-types` and `@infinicus/event-contracts` — have had a `test` script with no `vitest` devDependency and no test files since the original scaffold commit, predating this entire session; `@infinicus/testing` likewise has no test files. None of the three were touched in this phase.)
- Live HTTP E2E (Node script, no browser) against a local Postgres + `apps/api`: register → login → onboard (all 3 required steps) → create business → start simulation → poll → `completed`, with the full `EngineRunResult` shape (`days` 90-length array, `events`, `mc.runs` 500-length array, `scores`, `verdict`) verified field-by-field.
- **Real in-browser test** (Playwright + local Chromium, against the actual `index.html` file and a local `apps/api` + Postgres): loaded the real page, pre-seeded `localStorage['infinicus_user']` to simulate an already-signed-in visitor (without touching the real Supabase project), filled in the real "SIMULATION SETUP" form, clicked the real "RUN SIMULATION" button, and confirmed the dashboard rendered a real verdict (`go`, 100/95/100/100 scores) sourced from `S.days`/`S.mc` — i.e. the real backend response, not the fallback. Independently confirmed against Postgres directly: a `Public Demo Idea` business and a `completed` `simulation_runs` row were created by that exact browser click.
- Confirmed the fallback path separately: pointing `API_BASE_URL` at an unreachable host produces a logged warning and a fully-rendered result from the original client-side engine — the demo does not break.

## What's still pending

- **Phase 3** (OCI deployment artifacts — cloud-init, `docker-compose.yml`, TLS reverse proxy, runbook): not started. Prepared-only; cannot be executed from this sandbox (no OCI credentials/tool access).
- **Phase 4** (final live wiring — pointing the real `API_BASE_URL` at a reachable HTTPS OCI instance and doing a real end-to-end smoke test): blocked on Phase 3's actual provisioning by the user.
