# INFINICUS MASTER IMPLEMENTATION QUEUE

This repository contains a fixed implementation queue.

## Mandatory operating loop

For every Claude Code session:

1. Read `.claude/state/implementation-status.json`.
2. Read `docs/implementation-queue/00-IMPLEMENTATION-MANIFEST.md`.
3. Read all completion reports listed for dependencies of `currentBuild`.
4. Open only the prompt identified by `currentBuild`.
5. Inspect existing code and align with repository conventions.
6. Implement only the current build.
7. Run every validation command required by that prompt.
8. Fix in-scope failures.
9. Create `docs/completion-reports/<build-id>-report.md`.
10. Update `.claude/state/implementation-status.json`:
   - current build → `complete`;
   - attach completion-report path and validation summary;
   - promote only the next build whose dependencies are complete to `ready`;
   - set `currentBuild` to that build.
11. Stop.

## Prohibited behavior

Do not redesign approved architecture.
Do not combine builds.
Do not skip dependencies.
Do not invent migration numbers.
Do not modify frozen migrations.
Do not claim completion without required tests.
Do not mark a build complete when validation is skipped.
Do not start the next build in the same session unless the user explicitly requests continuous execution.

## Priority

The first incomplete build is:

```text
database-stage-2c
```

Existing repository code remains authoritative when it proves a build has already passed. In that case, verify the completion evidence, create the missing completion report, update queue state, and move to the next eligible build.
