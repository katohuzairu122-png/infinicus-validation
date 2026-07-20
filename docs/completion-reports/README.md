# Completion Reports

Every completed build requires one report:

```text
<build-id>-report.md
```

A report is verification evidence, not a progress note.

It must include:

- exact scope completed;
- exact files created/modified;
- migration range and freeze status when applicable;
- commands executed;
- test totals and failures/skips;
- RLS/security checks;
- idempotency and rollback checks;
- unresolved defects;
- next eligible build.

Do not delete or rewrite prior completion reports. Corrections receive an appended amendment.
