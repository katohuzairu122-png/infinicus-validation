# Integration Contract

1. Attach ADI-01 through ADI-04 first.
2. Inject a read-only `readSnapshot(query, context)` adapter for the existing Digital Twin publication interface.
3. Return a published snapshot with `snapshotId`, `twinId`, `version`, boundaries, `publishedAt`, `schemaVersion` and state.
4. ADI-05 registers provider `adi05.business_digital_twin` with ADI-04.
5. ADI-05 never calls a Digital Twin create, update or publish operation.
6. Invalid boundary or unpublished snapshots are rejected rather than corrected.
7. The original Digital Twin and Decision Intelligence scripts remain untouched.
