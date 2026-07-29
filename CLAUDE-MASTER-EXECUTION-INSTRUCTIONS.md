# INFINICUS — CLAUDE MASTER EXECUTION INSTRUCTIONS

## Mission

Continue the existing INFINICUS repository. Edit and extend what exists. Do not restart the project, generate a replacement monorepo, or discard completed work.

The repository is the source of truth. Specifications define scope, but actual files, migrations, exports, tests, and completed reports determine the current baseline.

## Required build route

```text
BUILD-10
→ BUILD-12
→ BUILD-13
→ BUILD-14
→ BUILD-15
→ BUILD-16
→ BUILD-17
→ BUILD-18
→ BUILD-19
→ BUILD-20
→ BUILD-21
→ BUILD-22
→ BUILD-23
→ BUILD-24
→ BUILD-25
→ BUILD-26
→ BUILD-27
→ BUILD-28
→ BUILD-29
→ BUILD-30
```

BUILD-11 is superseded. Keep its history, but never execute it.

## Non-negotiable execution cycle

For every build:

1. Read repository instructions and the build specification.
2. Run `node scripts/build-preflight.mjs <BUILD-ID>`.
3. Verify predecessor completion and frozen checksums.
4. Inspect current interfaces, exports, migrations, and tests.
5. Resolve drift through compatibility-preserving edits.
6. Mark only the current build `in_progress`.
7. Implement only the current build.
8. Run focused tests.
9. Run full regression and build validation.
10. Create the completion report.
11. Update queue state.
12. Commit and push.
13. Stop.

## Editing policy

Prefer, in order:

1. reuse an existing implementation;
2. extend an existing interface compatibly;
3. add an adapter;
4. add a new version;
5. add a new migration;
6. deprecate old behavior with a compatibility window.

Never delete or rewrite working architecture merely because a specification uses a newer name.

## Conflict policy

When specification and repository differ:

- repository reality determines what currently exists;
- the specification determines the required outcome;
- preserve compatibility unless security or correctness requires a breaking change;
- document every deviation;
- never silently reinterpret scope;
- never overwrite frozen migrations;
- never renumber committed migrations;
- never fake validation.

## Stop conditions

Stop and report instead of guessing when:

- predecessor is incomplete;
- the specification checksum differs;
- migration history has diverged;
- two different files claim the same canonical interface or event;
- a required provider decision is absent;
- a security control cannot be implemented safely;
- validation infrastructure is unavailable.

A stop report must identify the exact blocker, affected files, safe options, and recommended resolution.
