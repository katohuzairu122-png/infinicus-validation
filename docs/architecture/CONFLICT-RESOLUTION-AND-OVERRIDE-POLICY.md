# Conflict Resolution and Override Policy

## Purpose

This policy allows Claude to continue by editing the existing repository instead of restarting it, while preventing destructive overrides.

## Conflict classes

### C1 — Migration number conflict

Example: a specification expected migration `0050`, but another build already created `0050`.

Resolution:

1. never modify or renumber committed migration files;
2. discover the highest current migration;
3. allocate the next free contiguous number;
4. update only the new build specification metadata and completion report;
5. record the originally expected and actual range;
6. rerun empty-install and idempotency tests.

### C2 — Stale TypeScript interface

Example: the specification names a method or field that has changed in the repository.

Resolution order:

1. retain the current canonical interface;
2. add the required capability as an optional or additive field when safe;
3. create a compatibility adapter for the older shape;
4. introduce a new explicit version for a breaking shape;
5. update exports and tests;
6. deprecate, but do not immediately delete, the older interface.

### C3 — Duplicate event name

Resolution:

1. search the canonical event registry;
2. reuse an existing semantically equivalent event;
3. do not create synonyms;
4. document the mapping;
5. add compatibility tests for producers and consumers.

### C4 — Duplicate repository or service

Resolution:

1. identify the canonical implementation by exports, usage, and tests;
2. extend the canonical implementation;
3. convert the duplicate into a thin re-export or adapter;
4. remove duplication only when no consumer remains and tests prove safety.

### C5 — Browser namespace or API mismatch

Resolution:

1. preserve the existing namespace;
2. add an adapter under the new platform surface;
3. keep old public methods callable;
4. add compatibility tests;
5. do not rename bundles or globals without a transition layer.

### C6 — Database schema mismatch

Resolution:

1. never mutate historical migrations;
2. add a forward migration;
3. use views, aliases, compatibility functions, or transitional columns when required;
4. backfill safely and idempotently;
5. add rollback or recovery documentation;
6. prove tenant isolation after the change.

### C7 — Provider or infrastructure ambiguity

Examples: identity provider, cloud host, billing provider, secret store.

Resolution:

- do not invent a production provider;
- create a provider-neutral interface and local/test adapter only if the build permits it;
- record the unresolved production choice;
- block production completion until a provider is selected and validated.

### C8 — Security conflict

Security overrides convenience.

If existing behavior violates tenant isolation, secret handling, authorization, privacy, or audit requirements:

1. disable the unsafe behavior;
2. add a compatibility-safe migration or adapter when possible;
3. document the breaking security correction;
4. add regression tests;
5. require explicit approval before restoring weaker behavior.

## Override authority

Claude may override a stale specification detail only when all are true:

- repository inspection proves the detail is stale;
- the required architectural outcome is preserved;
- compatibility is maintained or a versioned migration path is provided;
- tests cover the override;
- the completion report names the override;
- frozen historical files remain unchanged.

Claude may not override:

- layer authority boundaries;
- tenant isolation;
- append-only evidence rules;
- atomic outbox requirements;
- frozen migrations;
- explicit build scope;
- security and privacy controls;
- required validation.
