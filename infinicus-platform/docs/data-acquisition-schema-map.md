# Data Acquisition Schema Map

## Schema Ownership

All tables in this document reside in the `data_acquisition` schema.

External references (FKs to Stage 2A):

| Reference | Target Schema | Table |
|-----------|--------------|-------|
| `tenant_id` | `tenancy` | `tenants` |
| `workspace_id` | `tenancy` | `workspaces` |
| `business_id` | `platform` | `businesses` |
| `created_by`, `resolved_by`, `classified_by` | `identity` | `users` |
| `file_object_id` | `files` | `file_objects` |
| Outbox events | `events` | `outbox_events` |

## FK Hierarchy

```
tenancy.tenants
    └─► data_sources (ON DELETE RESTRICT)
            └─► connectors (ON DELETE RESTRICT)
            │       └─► credential_references (ON DELETE RESTRICT)
            └─► credential_references (ON DELETE RESTRICT)
            └─► collection_schedules (ON DELETE RESTRICT)
            └─► collection_runs (ON DELETE RESTRICT)
                    ├─► webhook_receipts (ON DELETE RESTRICT)
                    ├─► file_intakes (ON DELETE RESTRICT)
                    ├─► api_collection_runs (ON DELETE CASCADE)
                    ├─► database_collection_runs (ON DELETE CASCADE)
                    ├─► manual_submissions (ON DELETE RESTRICT)
                    ├─► stream_events (ON DELETE SET NULL)
                    ├─► detected_schemas (ON DELETE SET NULL)
                    │       └─► detected_fields (ON DELETE CASCADE)
                    ├─► validation_results (ON DELETE RESTRICT)
                    │       └─► validation_issues (ON DELETE CASCADE)
                    ├─► cleaning_runs (ON DELETE RESTRICT)
                    │       └─► cleaning_actions (ON DELETE CASCADE)
                    ├─► normalization_runs (ON DELETE RESTRICT)
                    ├─► entity_resolution_results (ON DELETE RESTRICT)
                    │       └─► entity_match_candidates (ON DELETE CASCADE)
                    └─► missing_data_actions (ON DELETE RESTRICT)

data_classifications
    └─► sensitive_data_actions (ON DELETE RESTRICT)

provenance_records (self-referential parent, ON DELETE RESTRICT)
    └─► transformation_records (ON DELETE CASCADE)

publication_packages
    └─► publication_deliveries (ON DELETE RESTRICT)

layer_assemblies
    └─► layer_deployments (self-rollback FK, ON DELETE SET NULL)
            └─► layer_rollbacks (ON DELETE RESTRICT)
```

## RLS-Enabled Tables (27)

Tables with `ENABLE ROW LEVEL SECURITY` using `app.tenant_id` + `app.workspace_id`:

1. `data_sources`
2. `connectors`
3. `credential_references`
4. `collection_schedules`
5. `collection_runs`
6. `webhook_receipts`
7. `file_intakes`
8. `manual_submissions`
9. `stream_events`
10. `detected_schemas`
11. `detected_fields` (tenant-only policy — no workspace_id column)
12. `validation_policies`
13. `validation_results`
14. `validation_issues` (tenant-only policy)
15. `cleaning_runs`
16. `cleaning_actions` (tenant-only policy)
17. `normalization_runs`
18. `normalization_mappings`
19. `entity_resolution_results`
20. `duplicate_groups`
21. `data_classifications`
22. `sensitive_data_actions`
23. `data_quality_scores`
24. `missing_data_actions`
25. `source_reliability_scores`
26. `provenance_records`
27. `publication_packages`

## Non-Tenant Tables (no RLS)

Detail rows scoped to their parent via FK; protected through parent's RLS:
- `api_collection_runs`
- `database_collection_runs`
- `entity_match_candidates`
- `duplicate_group_members`
- `transformation_records`
- `publication_deliveries`

Cross-tenant deployment metadata (not scoped to a tenant):
- `layer_assemblies`
- `layer_deployments`
- `layer_rollbacks`

## Append-Only / Immutable Tables

These tables have no `updated_at` trigger and must not be updated after insert:
- `webhook_receipts` (payload evidence)
- `stream_events`
- `cleaning_actions` (before_value evidence)
- `sensitive_data_actions` (no plaintext removal evidence)
- `provenance_records`
- `transformation_records`
- `validation_issues` (resolution via resolvedAt/resolvedBy, no edits to message/severity)
- `entity_match_candidates`
- `duplicate_group_members`
