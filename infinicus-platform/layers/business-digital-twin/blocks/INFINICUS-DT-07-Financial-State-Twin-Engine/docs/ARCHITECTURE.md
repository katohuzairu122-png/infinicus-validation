# Architecture

## Processing Sequence

1. Receive DT-06 financial handoff.
2. Register financial accounts.
3. Attach accounts to organizational units.
4. Register period-based financial state values.
5. Classify source type, assumptions, lineage, and confidence.
6. Calculate financial profile.
7. Validate currency and balance consistency.
8. Create immutable financial snapshot.
9. Preserve organization context.
10. Prepare DT-08 customer and demand handoff.

## Responsibility Boundary

DT-07 represents financial state.

It does not execute accounting transactions or alter external ledgers.
