# Execute Next Build

1. Read `.claude/state/implementation-status.json`.
2. Resolve `currentBuild`.
3. Verify every dependency is `complete`.
4. Set current build to `in_progress`.
5. Read its prompt and required references.
6. Inspect existing implementation before writing code.
7. Implement only the defined scope.
8. Run all prompt validation commands.
9. Generate the completion report.
10. Update queue state and stop.

Never redesign, combine phases, skip tests, or modify frozen migrations.
