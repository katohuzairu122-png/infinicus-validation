# Migration Allocation Policy

## Rules

1. Migration numbers are discovered, never reserved from memory.
2. Existing committed migrations are immutable.
3. New migrations use the next free contiguous number.
4. A build may use multiple migrations, but the final range is frozen only after validation.
5. Every migration self-registers using the repository convention.
6. Every migration must be safe on empty installation and idempotent rerun.
7. Every build records:
   - predecessor final migration;
   - new range;
   - SHA-256 of all prior frozen migrations;
   - SHA-256 of the new range;
   - empty-install result;
   - rerun result.

## Collision resolution

When two branches allocate overlapping numbers:

- keep the migration numbers from the branch merged first;
- renumber only the unmerged branch's new migrations;
- update internal references and test expectations;
- do not edit already merged migrations;
- rerun the entire migration chain.

## Forbidden behavior

- modifying an earlier migration to “make the new build work”;
- deleting migration history;
- changing filenames without updating self-registration;
- using timestamps or random names if the repository uses ordered numbers;
- marking a migration complete without a live empty-database test.
