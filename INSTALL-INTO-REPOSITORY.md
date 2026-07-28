# Install This Queue Into the INFINICUS Repository

Extract this package into the root of `infinicus-platform`.

The overlay adds:

```text
CLAUDE-QUEUE-INSTRUCTIONS.md
docs/implementation-queue/
docs/architecture/
docs/audits/
docs/completion-reports/
.claude/commands/
.claude/state/
```

It does not overwrite source-code directories.

## One-time setup

1. Extract into the repository root.
2. Review `CLAUDE-QUEUE-INSTRUCTIONS.md`.
3. Add or merge its mandatory loop into the root `CLAUDE.md`.
4. Commit the queue files.
5. Start Claude Code in the repository root.
6. Run the instruction in `.claude/commands/execute-next-build.md`.

## First build

```text
database-stage-2c
```

Claude must verify whether Stage 2C already exists before creating new migrations. Existing verified code wins; the queue is an execution controller, not permission to duplicate implementation.
