# EXECUTE NEXT BUILD

This command is build-agnostic. It executes whichever single build is marked
`ready` in the queue, following that build's authoritative specification.

## Step 1 — Identify the current ready build

Read `.claude/state/implementation-status.json`. Find the single build with
`"status": "ready"` (it must match `currentReadyBuild`). If zero or more than
one build is `ready`, stop and report the inconsistency.

## Step 2 — Read the authoritative specification

Open `docs/implementation-queue/00-IMPLEMENTATION-MANIFEST.md` and locate the
`## BUILD-NN Specification` section for the ready build. If that section
links to a dedicated specification document (e.g.
`docs/implementation-queue/BUILD-07-SIM-SPECIFICATION.md`), read the linked
document completely — it is the authoritative scope.

If no specification section or linked document exists for the ready build,
STOP and report the missing definition. Do not invent the scope.

Current ready build: **BUILD-10** (PLATFORM) — specification frozen
2026-07-21 at `docs/implementation-queue/BUILD-10-PLATFORM-SPECIFICATION.md`
(SHA-256 `878ff02a4f3865fb2a06ffc33b71d7c614ec65e810f92926a0cd27f0abc081c7`).
Not yet implemented.

## Step 3 — Inspect the repository

Before writing any code:

- Re-verify the specification's current-state baseline against the actual
  repository (the repository is the source of truth).
- Read the CLAUDE.md files relevant to the touched areas.
- Confirm existing tests pass in the areas the build touches.
- Confirm no regressions exist in completed layers before starting.
- Preserve unrelated user changes; work only on the designated branch.

## Step 4 — Execute the build

Implement exactly the specification's in-scope work. Respect its
out-of-scope list, architecture boundaries and safety requirements. Keep
changes to the smallest coherent implementation. Do not begin any later
build.

## Step 5 — Validate

Run every validation gate listed in the build's specification. Discover the
real commands from `package.json` and workspace configuration — never
fabricate command names or results. Include regression runs for all
completed layers and, when the build touches the monorepo, `pnpm lint`,
`pnpm typecheck`, `pnpm build` and the relevant test filters.

## Step 6 — Write the completion report

Create `.claude/state/reports/BUILD-NN-<LAYER>-completion.md` following the
format of the existing reports (build ID and date, files created/modified,
tests pass/fail totals, validation results, integration confirmation,
defects found and fixed).

## Step 7 — Update queue state

Only after all gates pass, in `.claude/state/implementation-status.json`:

- Set the completed build's status to `"completed"` with a `"completedAt"`
  timestamp.
- Set the next build's status to `"ready"` only if all of its declared
  prerequisites are complete, and update `currentReadyBuild`.
- Mirror the transition in `00-IMPLEMENTATION-MANIFEST.md`'s status tables.

## Step 8 — Commit and push

Stage only the files belonging to this build. Use a focused conventional
commit message naming the build ID. Push to the designated branch and update
the tracking PR with the build summary and validation evidence.

## Step 9 — Stop

Do not begin the next build. Report the completion summary and stop.
