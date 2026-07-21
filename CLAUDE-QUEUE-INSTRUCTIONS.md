# CLAUDE QUEUE INSTRUCTIONS — INFINICUS ENGINE

## Purpose

This file governs all Claude-driven build execution on the INFINICUS repository.
Read this file before reading any queue state or executing any build.

## Repository Source of Truth

- The repository is the source of truth. Do not guess state — inspect files.
- Preserve the working application at all times. Never break `index.html`.
- All bundles in `index.html` must remain loadable after every build.
- Do not rewrite working blocks unless the build explicitly targets them.

## Queue Files

| File | Purpose |
|---|---|
| `.claude/state/implementation-status.json` | Live state of all builds |
| `docs/implementation-queue/00-IMPLEMENTATION-MANIFEST.md` | Full ordered build list |
| `.claude/commands/execute-next-build.md` | Instructions for executing the next build |

## Execution Protocol

1. Read this file.
2. Read `.claude/state/implementation-status.json` to find the current ready build.
3. Read `docs/implementation-queue/00-IMPLEMENTATION-MANIFEST.md` for the build spec.
4. Read `.claude/commands/execute-next-build.md` for execution steps.
5. Inspect the repository before writing any code.
6. Execute only the single build marked `ready`.
7. Run every required validation command.
8. Create the completion report in `.claude/state/reports/`.
9. Update `.claude/state/implementation-status.json` — mark the build `completed`.
10. Stop. Do not begin the next build.

## Layer Architecture

Root-level layer directories contain browser-global IIFE JavaScript blocks:

```
/{layer-name}/
  INFINICUS-{LAYER}-{NN}-{Block-Name}/
    src/          ← browser-global IIFE .js files
    tests/        ← node .mjs tests (assert-based, not TAP)
    CLAUDE.md
    README.md
    docs/
    demo/
    package.json
  {layer}-bundle.js   ← concatenated bundle loaded by index.html
```

Bundles use `(function(global){ ... })(window);` IIFE pattern.
Bundles are loaded via `<script src="/{layer}/{layer}-bundle.js">` in index.html.
All blocks set their namespace via `global.INFINICUS.{LAYER} = ...`.

## Validation Commands

After every build, run in order:

```bash
# 1. Node tests for the new layer (from repo root)
for dir in /{layer}/INFINICUS-{LAYER}-*/; do
  for test in "$dir/tests/"*.mjs; do
    node "$test"
  done
done

# 2. Node tests for all existing layers (regression)
# Run all *.mjs tests in approved-business-action, business-intelligence,
# digital-twin, outcome-monitoring, continuous-learning

# 3. Syntax check the bundle
node --check {layer}/adi-bundle.js
```

## Security Constraints

- Never commit passwords, API keys, tokens, database credentials, or secrets.
- Never store secrets in browser-visible configuration.
- ADI layer must not bypass upstream validation from DT, BI, SIM layers.
- Preserve all correlation, causation, lineage, and confidence identifiers.
