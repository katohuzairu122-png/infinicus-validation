# Execute Staged Build

1. Read `CLAUDE-MASTER-EXECUTION-INSTRUCTIONS.md`.
2. Read the current build specification and predecessor completion report.
3. Run:
   ```bash
   node scripts/build-preflight.mjs <BUILD-ID>
   node scripts/allocate-next-migration.mjs
   ```
4. Read:
   - `docs/architecture/CONFLICT-RESOLUTION-AND-OVERRIDE-POLICY.md`
   - `docs/architecture/MIGRATION-ALLOCATION-POLICY.md`
   - `docs/architecture/INTERFACE-COMPATIBILITY-POLICY.md`
5. Preserve existing code and use adapters or new versions for drift.
6. Implement one build only.
7. Run focused and full validation.
8. Create a completion report that includes:
   - conflicts found;
   - overrides applied;
   - adapters introduced;
   - actual migration range;
   - compatibility evidence;
   - frozen-file verification.
9. Commit, push, update PR, and stop.
