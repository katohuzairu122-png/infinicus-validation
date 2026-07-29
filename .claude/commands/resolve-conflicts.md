# Resolve Repository Conflicts

For each conflict, produce a table:

| Conflict | Repository reality | Specification requirement | Safe resolution | Files | Tests |
|---|---|---|---|---|---|

Apply these priorities:

1. security and tenant isolation;
2. frozen migration integrity;
3. data and evidence preservation;
4. backward compatibility;
5. canonical repository exports;
6. minimal scope;
7. naming consistency.

Do not use `--force`, mass deletion, migration rewriting, or wholesale replacement as a default conflict resolution strategy.
