# EXECUTE NEXT BUILD

## Step 1 — Identify the current ready build

Read `.claude/state/implementation-status.json`. Find the build with `"status": "ready"`.

## Step 2 — Read the build spec

Open `docs/implementation-queue/00-IMPLEMENTATION-MANIFEST.md` and read the spec
for the current ready build ID.

## Step 3 — Inspect the repository

Before writing any code:
- Verify what already exists in the target output directory.
- Read CLAUDE.md files in the relevant source blocks.
- Confirm source tests pass: `node {block}/tests/*.mjs`
- Confirm no regressions in existing layers.

## Step 4 — Execute the build

For BUILD-06 (ADI):

1. For each ADI block ADI-01 through ADI-25:
   a. Create `ai-decision-intelligence/INFINICUS-ADI-{NN}-{Name}/` directory
   b. Write `src/` files in browser-global IIFE pattern
   c. Write `tests/` files using Node.js assert (not TAP)
   d. Write `CLAUDE.md`, `README.md`, `package.json`, `docs/`, `demo/`

2. Create `ai-decision-intelligence/adi-bundle.js`:
   - Concatenate all IIFE src files in dependency order
   - ADI-01 first (runtime), ADI-25 last (master integration)
   - Single file, no external imports
   - Exposes `INFINICUS.ADI` on `window`

3. Update `index.html`:
   - Add `<script src="/ai-decision-intelligence/adi-bundle.js"></script>`
   - Place after the existing layer bundles, before closing `</body>`

## Step 5 — Validate

Run in order:
```bash
node --check ai-decision-intelligence/adi-bundle.js
for dir in ai-decision-intelligence/INFINICUS-ADI-*/; do
  for test in "$dir/tests/"*.mjs; do node "$test"; done
done
# Regression: all other layer tests
for layer in approved-business-action business-intelligence digital-twin outcome-monitoring continuous-learning; do
  for dir in "$layer"/INFINICUS-*/; do
    for test in "$dir/tests/"*.mjs; do node "$test"; done
  done
done
```

## Step 6 — Write completion report

Create `.claude/state/reports/BUILD-06-ADI-completion.md` with:
- Build ID and date
- Files created (count)
- Tests: pass/fail totals
- Validation results
- index.html integration confirmation
- Any defects found and fixed

## Step 7 — Update queue state

In `.claude/state/implementation-status.json`:
- Set BUILD-06 status to `"completed"`, add `"completedAt"` timestamp
- Set BUILD-07 status to `"ready"`

## Step 8 — Commit and push

Stage only the new files. Do not stage unrelated changes.
Commit message: `feat(adi): BUILD-06 — AI Decision Intelligence layer (25 blocks + bundle)`
Push to the current branch.

## Step 9 — Stop

Do not begin BUILD-07. Report the completion summary and stop.
