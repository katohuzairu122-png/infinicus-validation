# Validate Current Build

Read the current build prompt and run every required validation command.

Record:

- commands executed;
- pass/fail result;
- migrations applied;
- migration idempotency;
- tests passed/failed/skipped;
- RLS and isolation result;
- build result;
- unresolved defects.

A required validation that is unavailable is a failure, not a pass.
