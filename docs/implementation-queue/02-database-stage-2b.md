# INFINICUS DATABASE STAGE 2B — DATA ACQUISITION SCHEMA EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey:

1. `CLAUDE.md`
2. Database Stage 2A documentation
3. Existing database package conventions
4. Existing migration runner and test setup

Do not modify completed Stage 2A migrations unless a defect must be corrected.

## Objective

Create Database Stage 2B only: the complete Data Acquisition schema.

This stage must implement persistent database support for DA-01 through DA-25.

Do not create the Business Operations schema yet.

Do not start frontend development.

Do not convert all Data Acquisition blocks to TypeScript in this stage.

Stop after the Data Acquisition schema, migrations, tests, documentation, and validation are complete.

---

# 1. REQUIRED POSTGRESQL SCHEMA

Create:

```sql
data_acquisition
```

All tenant-owned tables must use the Stage 2A tenancy model and Row-Level Security conventions.

Use existing shared references to:

```text
tenancy.tenants
tenancy.workspaces
platform.businesses
identity.users
identity.service_accounts
files.file_objects
events.outbox_events
audit.audit_events
```

Do not duplicate shared entities.

---

# 2. SHARED DATA ACQUISITION COLUMNS

Use these columns where applicable:

```text
id uuid primary key default gen_random_uuid()
tenant_id uuid not null
workspace_id uuid not null
business_id uuid
status text not null
version integer not null default 1
source_system text not null default 'INFINICUS'
source_record_id text
correlation_id uuid not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
created_by uuid
deleted_at timestamptz
```

Rules:

- `version > 0`
- tenant and workspace foreign keys required
- business foreign key required only when acquisition is business-specific
- correlation IDs required for operational records
- no raw secrets
- no binary file bodies
- no unbounded cascading deletes across acquisition history

---

# 3. REQUIRED TABLES

Create the following tables.

## DA-02 — Sources

```sql
data_acquisition.data_sources
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
name
source_code citext
source_type
owner_type
owner_id nullable
access_mode
jurisdiction
sensitivity_level
description
configuration jsonb
status
version
source_system
source_record_id
correlation_id
created_at
updated_at
created_by
deleted_at
```

Allowed source types:

```text
manual
file
document
api
database
webhook
stream
application
sensor
external_dataset
```

Allowed statuses:

```text
draft
active
paused
suspended
retired
failed
```

Constraints:

- unique source code within tenant and workspace
- configuration must be valid JSON object
- no raw credentials inside configuration

---

## DA-03 — Connectors

```sql
data_acquisition.connectors
```

Required fields:

```text
id
tenant_id
workspace_id
data_source_id
name
connector_type
protocol
connector_version
capabilities jsonb
configuration_reference text
health_status
last_health_check_at
status
version
correlation_id
created_at
updated_at
created_by
deleted_at
```

Allowed connector types:

```text
rest_api
graphql
webhook
postgres
mysql
mssql
sqlite
sftp
object_storage
file_upload
event_stream
custom
```

Health statuses:

```text
unknown
healthy
degraded
unhealthy
offline
```

Do not store secrets in `configuration_reference`.

---

## DA-04 — Credential References

```sql
data_acquisition.credential_references
```

Required fields:

```text
id
tenant_id
workspace_id
data_source_id nullable
connector_id nullable
credential_name
secret_provider
secret_reference
scopes jsonb
expires_at
rotation_due_at
last_rotated_at
status
created_at
updated_at
created_by
revoked_at
```

Rules:

- store reference only
- no plaintext secrets
- at least one of `data_source_id` or `connector_id` must be present
- secret reference must never equal a raw credential field
- revoked records remain historical

---

## DA-05 — Collection Schedules

```sql
data_acquisition.collection_schedules
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
data_source_id
connector_id nullable
name
schedule_type
cron_expression nullable
interval_seconds nullable
timezone
collection_window_start nullable
collection_window_end nullable
retry_limit
timeout_seconds
is_enabled
next_run_at nullable
last_run_at nullable
status
version
correlation_id
created_at
updated_at
created_by
deleted_at
```

Schedule types:

```text
manual
cron
interval
webhook
stream
one_time
```

Rules:

- cron type requires cron expression
- interval type requires positive interval seconds
- retry limit non-negative
- timeout positive

---

## DA-05 to DA-11 — Collection Runs

```sql
data_acquisition.collection_runs
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
data_source_id
connector_id nullable
schedule_id nullable
collection_type
state
started_at nullable
completed_at nullable
checkpoint jsonb
request_metadata jsonb
response_metadata jsonb
records_received integer
records_accepted integer
records_rejected integer
bytes_received bigint
error_code nullable
error_message nullable
attempt_number
correlation_id
causation_id nullable
created_at
updated_at
created_by nullable
```

Collection types:

```text
webhook
file
document
api
database
manual
stream
```

States:

```text
planned
scheduled
collecting
collected
validated
published
failed
quarantined
cancelled
```

Constraints:

- counts non-negative
- accepted + rejected cannot exceed received
- completed timestamp required for terminal states
- started timestamp required after collection begins

---

## DA-06 — Webhook Receipts

```sql
data_acquisition.webhook_receipts
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
data_source_id
connector_id nullable
collection_run_id
external_event_id nullable
request_id nullable
signature_status
idempotency_key
headers jsonb
payload jsonb
payload_hash
received_at
processed_at nullable
status
correlation_id
created_at
```

Signature statuses:

```text
not_required
pending
valid
invalid
```

Constraints:

- unique idempotency key per data source
- invalid signatures cannot be marked processed successfully
- preserve payload hash

---

## DA-07 — File and Document Intakes

```sql
data_acquisition.file_intakes
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
data_source_id
collection_run_id
file_object_id
document_type nullable
original_filename
media_type
size_bytes
sha256_hash
malware_scan_status
parse_status
page_count nullable
metadata jsonb
status
correlation_id
created_at
updated_at
created_by
```

Scan statuses:

```text
pending
clean
infected
failed
not_supported
```

Parse statuses:

```text
pending
parsed
partially_parsed
failed
not_required
```

No binary content in this table.

---

## DA-08 — API Collection Runs

```sql
data_acquisition.api_collection_runs
```

Required fields:

```text
id
collection_run_id unique
http_method
endpoint_reference
request_parameters jsonb
pagination_strategy
pages_requested
pages_completed
rate_limit_remaining nullable
rate_limit_reset_at nullable
response_status nullable
response_hash nullable
created_at
updated_at
```

Do not store access tokens.

---

## DA-09 — Database Collection Runs

```sql
data_acquisition.database_collection_runs
```

Required fields:

```text
id
collection_run_id unique
database_type
query_reference
checkpoint_before jsonb
checkpoint_after jsonb
batch_size
batches_completed
rows_read
transaction_isolation nullable
created_at
updated_at
```

Do not store raw database passwords or full sensitive connection strings.

---

## DA-10 — Manual Submissions

```sql
data_acquisition.manual_submissions
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
data_source_id
collection_run_id
submitted_by
submission_type
payload jsonb
revision_number
parent_submission_id nullable
submission_notes nullable
status
correlation_id
created_at
updated_at
```

Rules:

- revision number starts at 1
- parent submission cannot reference itself
- preserve revision history

---

## DA-11 — Stream Events

```sql
data_acquisition.stream_events
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
data_source_id
collection_run_id nullable
stream_name
partition_key nullable
partition_number nullable
event_offset nullable
external_event_id nullable
event_time
received_at
payload jsonb
payload_hash
ordering_key nullable
replay_status
status
correlation_id
causation_id nullable
created_at
```

Unique event constraints should support idempotency where external event ID exists.

---

## DA-12 — Detected Schemas

```sql
data_acquisition.detected_schemas
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
data_source_id
collection_run_id nullable
schema_name
schema_version
structure jsonb
sample_size
confidence numeric
detection_method
is_approved
approved_by nullable
approved_at nullable
status
correlation_id
created_at
updated_at
```

Confidence constrained between 0 and 1.

---

## DA-12 — Detected Fields

```sql
data_acquisition.detected_fields
```

Required fields:

```text
id
detected_schema_id
field_path
inferred_type
is_nullable
observed_count
null_count
distinct_count nullable
minimum_value jsonb nullable
maximum_value jsonb nullable
sample_values jsonb
confidence numeric
status
created_at
```

Unique field path per detected schema.

---

## DA-13 — Validation Policies

```sql
data_acquisition.validation_policies
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
name
code citext
schema_reference_id nullable
rules jsonb
severity_default
is_active
version
created_at
updated_at
created_by
```

---

## DA-13 — Validation Results

```sql
data_acquisition.validation_results
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
collection_run_id
validation_policy_id nullable
record_reference text nullable
is_valid
error_count
warning_count
result_details jsonb
validated_at
correlation_id
created_at
```

---

## DA-13 — Validation Issues

```sql
data_acquisition.validation_issues
```

Required fields:

```text
id
validation_result_id
rule_code
field_path nullable
severity
issue_type
message
observed_value jsonb nullable
expected_value jsonb nullable
resolution_status
created_at
resolved_at nullable
resolved_by nullable
```

Severities:

```text
info
warning
error
critical
```

---

## DA-14 — Cleaning Runs

```sql
data_acquisition.cleaning_runs
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
collection_run_id
policy_reference nullable
operations jsonb
records_processed
records_modified
records_quarantined
before_hash nullable
after_hash nullable
status
correlation_id
started_at
completed_at nullable
created_at
```

---

## DA-14 — Cleaning Actions

```sql
data_acquisition.cleaning_actions
```

Required fields:

```text
id
cleaning_run_id
record_reference nullable
field_path nullable
action_type
before_value jsonb nullable
after_value jsonb nullable
reason
confidence nullable
created_at
```

Never destroy the before-value evidence.

---

## DA-15 — Normalization Runs

```sql
data_acquisition.normalization_runs
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
collection_run_id
normalization_profile
operations jsonb
records_processed
records_normalized
status
correlation_id
started_at
completed_at nullable
created_at
```

---

## DA-15 — Normalization Mappings

```sql
data_acquisition.normalization_mappings
```

Required fields:

```text
id
tenant_id
workspace_id
mapping_type
source_value text
canonical_value text
locale nullable
unit_from nullable
unit_to nullable
currency_from nullable
currency_to nullable
effective_from nullable
effective_to nullable
status
created_at
updated_at
created_by
```

---

## DA-16 — Entity Resolution Results

```sql
data_acquisition.entity_resolution_results
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
collection_run_id
source_record_reference
candidate_entity_type
candidate_entity_id nullable
match_method
match_score numeric
resolution_status
resolved_entity_id nullable
reviewed_by nullable
reviewed_at nullable
evidence jsonb
correlation_id
created_at
updated_at
```

Match score between 0 and 1.

Resolution statuses:

```text
matched
possible_match
new_entity
rejected
review_required
```

---

## DA-16 — Entity Match Candidates

```sql
data_acquisition.entity_match_candidates
```

Required fields:

```text
id
entity_resolution_result_id
candidate_entity_id
candidate_entity_type
match_score
matching_features jsonb
rank
created_at
```

---

## DA-17 — Duplicate Groups

```sql
data_acquisition.duplicate_groups
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
collection_run_id nullable
entity_type
duplicate_type
fingerprint nullable
status
canonical_record_reference nullable
confidence numeric
created_at
updated_at
```

Duplicate types:

```text
exact
fuzzy
source_duplicate
cross_source
suspected
```

---

## DA-17 — Duplicate Group Members

```sql
data_acquisition.duplicate_group_members
```

Required fields:

```text
id
duplicate_group_id
record_reference
source_id nullable
similarity_score
is_canonical
created_at
```

Do not delete duplicate evidence.

---

## DA-18 — Data Classifications

```sql
data_acquisition.data_classifications
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
collection_run_id nullable
record_reference
domain
entity_type nullable
operational_use nullable
sensitivity_level
retention_category
classification_method
confidence numeric
review_status
classified_at
classified_by nullable
correlation_id
created_at
```

Sensitivity levels:

```text
public
internal
confidential
restricted
highly_restricted
```

---

## DA-19 — Sensitive Data Actions

```sql
data_acquisition.sensitive_data_actions
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
data_classification_id
record_reference
field_path nullable
action_type
policy_reference nullable
before_hash nullable
after_hash nullable
reason
performed_at
performed_by nullable
correlation_id
created_at
```

Action types:

```text
masked
redacted
tokenized
encrypted
restricted
quarantined
deleted_by_policy
```

Do not store removed plaintext in action logs.

---

## DA-20 — Data Quality Scores

```sql
data_acquisition.data_quality_scores
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
data_source_id
collection_run_id nullable
scope_type
scope_reference nullable
completeness numeric
validity numeric
consistency numeric
timeliness numeric
uniqueness numeric
conformity numeric
overall_score numeric
weights jsonb
score_details jsonb
scored_at
correlation_id
created_at
```

All scores constrained between 0 and 1.

---

## DA-21 — Missing Data Actions

```sql
data_acquisition.missing_data_actions
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
collection_run_id
record_reference nullable
field_path
missingness_type
action_type
imputed_value jsonb nullable
confidence nullable
reason
status
performed_at nullable
performed_by nullable
correlation_id
created_at
updated_at
```

Action types:

```text
impute
defer
quarantine
reject
request_source
accept_missing
```

---

## DA-22 — Source Reliability Scores

```sql
data_acquisition.source_reliability_scores
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
data_source_id
period_start
period_end
quality_score
timeliness_score
availability_score
consistency_score
verification_score
failure_rate
overall_reliability
score_details jsonb
status
scored_at
correlation_id
created_at
```

All score fields constrained between 0 and 1.

---

## DA-23 — Provenance Records

```sql
data_acquisition.provenance_records
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
data_source_id
collection_run_id nullable
record_reference
source_reference
source_hash nullable
transformation_chain jsonb
evidence_references jsonb
parent_provenance_id nullable
lineage_depth
created_at
correlation_id
```

Rules:

- immutable after creation through application role
- parent cannot reference itself
- lineage depth non-negative

---

## DA-23 — Transformation Records

```sql
data_acquisition.transformation_records
```

Required fields:

```text
id
provenance_record_id
transformation_type
transformation_version
input_hash nullable
output_hash nullable
parameters jsonb
performed_by_type
performed_by_id nullable
performed_at
created_at
```

---

## DA-24 — Publication Packages

```sql
data_acquisition.publication_packages
```

Required fields:

```text
id
tenant_id
workspace_id
business_id nullable
package_type
package_version
target_layer
target_block
data_reference jsonb
record_count
quality_score
reliability_score
schema_reference_id nullable
provenance_reference_ids jsonb
limitations jsonb
status
published_at nullable
correlation_id
created_at
updated_at
created_by nullable
```

Targets initially supported:

```text
business_operations
business_intelligence
```

Statuses:

```text
draft
ready
published
blocked
failed
revoked
```

---

## DA-24 — Publication Deliveries

```sql
data_acquisition.publication_deliveries
```

Required fields:

```text
id
publication_package_id
destination_type
destination_reference
delivery_status
attempt_count
last_attempt_at nullable
delivered_at nullable
failure_reason nullable
created_at
updated_at
```

---

## DA-25 — Layer Assemblies

```sql
data_acquisition.layer_assemblies
```

Required fields:

```text
id
release_version
environment
block_manifest jsonb
validation_result jsonb
state
created_at
created_by nullable
```

---

## DA-25 — Deployments

```sql
data_acquisition.layer_deployments
```

Required fields:

```text
id
layer_assembly_id
release_version
environment
adapter_type
deployment_reference nullable
state
deployed_at
deployed_by nullable
rollback_reference_id nullable
created_at
```

---

## DA-25 — Rollbacks

```sql
data_acquisition.layer_rollbacks
```

Required fields:

```text
id
layer_deployment_id
reason
rollback_version
state
created_at
created_by nullable
```

---

# 4. FOREIGN KEYS

Add foreign keys to Stage 2A tables.

Examples:

```text
tenant_id → tenancy.tenants.id
workspace_id → tenancy.workspaces.id
business_id → platform.businesses.id
created_by → identity.users.id
data_source_id → data_acquisition.data_sources.id
connector_id → data_acquisition.connectors.id
collection_run_id → data_acquisition.collection_runs.id
file_object_id → files.file_objects.id
```

Deletion behavior:

- restrict critical history
- cascade only dependent join/detail records
- set null when historical records must survive
- never cascade-delete provenance, audit, quality, or event history from business entities

---

# 5. INDEXES

Create indexes for practical query patterns:

```text
tenant_id
workspace_id
business_id
data_source_id
connector_id
collection_run_id
status
correlation_id
created_at
updated_at
received_at
published_at
event_time
idempotency_key
payload_hash
source_record_reference
field_path
overall_score
overall_reliability
target_layer
target_block
```

Use composite tenant-scoped indexes.

Examples:

```sql
(tenant_id, workspace_id, status)
(tenant_id, data_source_id, created_at desc)
(tenant_id, collection_run_id)
(tenant_id, correlation_id)
(tenant_id, target_layer, status)
```

Avoid redundant indexes already covered by unique constraints.

---

# 6. ROW-LEVEL SECURITY

Enable RLS on every tenant-owned Data Acquisition table.

Use Stage 2A transaction-local settings:

```text
app.tenant_id
app.workspace_id
app.user_id
```

Requirements:

- no tenant context means no access
- tenant A cannot read or mutate tenant B
- workspace scope enforced
- all inserts require matching tenant/workspace context
- detail tables without direct tenant columns must be protected through safe parent joins or receive tenant columns explicitly
- use consistent RLS helper functions from Stage 2A when available

Do not create broad `USING (true)` application policies.

---

# 7. IMMUTABILITY RULES

Make these append-only or application-immutable:

```text
webhook_receipts payload evidence
stream_events
validation_issues history
cleaning_actions
sensitive_data_actions
provenance_records
transformation_records
publication delivery attempt history
```

Historical records may receive status-resolution metadata only where explicitly required.

Do not permit arbitrary payload mutation after publication.

---

# 8. UPDATED_AT TRIGGERS

Apply existing Stage 2A `updated_at` trigger function to mutable tables.

Do not apply update triggers to append-only tables unless they contain explicitly mutable resolution status.

---

# 9. EVENT OUTBOX INTEGRATION

Add database functions or repository behavior for atomic event publication through:

```sql
events.outbox_events
```

At minimum, emit event records for:

```text
da.source.registered
da.connector.registered
da.collection.started
da.collection.completed
da.collection.failed
da.validation.completed
da.data.quarantined
da.data.quality_scored
da.data.published
```

Do not build the external event broker in Stage 2B.

Only persist outbox events transactionally.

---

# 10. DATABASE PACKAGE REPOSITORIES

Create repository interfaces or adapters for the first critical Data Acquisition entities:

```text
DataSourceRepository
ConnectorRepository
CollectionRunRepository
ValidationResultRepository
DataQualityScoreRepository
ProvenanceRepository
PublicationPackageRepository
```

Requirements:

- all operations require tenant transaction context
- no direct global pool usage for tenant-owned queries
- parameterized SQL only
- no raw secret logging
- typed return values
- controlled not-found errors
- correlation ID preservation

Do not implement all 25 block services yet.

---

# 11. SHARED TYPES

Update shared packages only where required.

Add Data Acquisition identifiers and enums centrally:

```text
DataSourceId
ConnectorId
CollectionRunId
PublicationPackageId
CollectionState
DataSourceType
SensitivityLevel
PublicationStatus
```

Do not create duplicate versions across packages.

---

# 12. MIGRATION ORDER

Use the existing migration convention.

Suggested logical order:

```text
create data_acquisition schema
create sources and connectors
create credential references and schedules
create collection runs and intake tables
create schema and validation tables
create cleaning and normalization tables
create entity resolution and duplicate tables
create classification and sensitive-data tables
create quality, missing-data, and reliability tables
create provenance and transformation tables
create publication and deployment tables
create constraints and indexes
create RLS policies
create triggers
create event helper functions
```

Migrations must apply from a clean database after Stage 2A migrations.

---

# 13. TESTS

Create real database tests for:

## Structure

- schema exists
- all required tables exist
- required columns exist
- required foreign keys exist
- indexes exist
- RLS enabled

## Constraints

- duplicate source code in same tenant/workspace rejected
- same source code allowed in different tenant
- invalid source type rejected
- invalid collection state rejected
- invalid signature state rejected
- score outside 0–1 rejected
- negative counts rejected
- accepted + rejected greater than received rejected
- duplicate webhook idempotency key rejected
- duplicate detected field path rejected
- self-parent provenance rejected
- plaintext-secret-like invalid test case rejected when enforceable

## Tenant isolation

- tenant A cannot read tenant B sources
- tenant A cannot update tenant B collection runs
- tenant A cannot delete tenant B records
- workspace isolation enforced
- missing tenant context returns no rows or controlled error

## Collection lifecycle

- create source
- create connector
- create collection run
- store intake record
- store validation result
- store quality score
- store provenance
- create publication package

## Event outbox

- source registration writes outbox event
- collection completion writes outbox event
- publication writes outbox event
- transaction rollback removes both domain record and outbox event

## Repository tests

- parameterized CRUD
- tenant context required
- controlled not-found behavior
- correlation ID preserved

Use a dedicated test database only.

---

# 14. DOCUMENTATION

Create or update:

```text
docs/database-stage-2b-data-acquisition.md
docs/data-acquisition-schema-map.md
docs/data-acquisition-rls.md
docs/data-acquisition-event-outbox.md
packages/database/README.md
```

Document:

- table-to-block mapping from DA-02 through DA-25
- schema ownership
- key relationships
- collection lifecycle
- quarantine behavior
- quality and reliability scoring persistence
- provenance immutability
- publication handoff to BO and BI
- RLS usage
- repository usage
- migration and test commands
- what remains for Stage 2C

---

# 15. VALIDATION COMMANDS

Run all applicable commands:

```bash
pnpm install
pnpm workspace:validate
pnpm --filter @infinicus/database lint
pnpm --filter @infinicus/database typecheck
pnpm --filter @infinicus/database test
pnpm --filter @infinicus/database build
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Also run Data Acquisition migration integration tests against a dedicated test database.

Do not use production credentials.

Do not claim success unless commands actually pass.

---

# 16. PROHIBITED WORK

Do not start:

- Business Operations schema
- Business Intelligence schema
- Digital Twin schema
- Simulation schema
- AI Decision Intelligence schema
- Approved Business Action schema
- Outcome Monitoring schema
- Continuous Learning schema
- full Data Acquisition TypeScript block conversion
- frontend pages
- authentication UI
- external API connectors
- event broker deployment
- production deployment

---

# 17. STOP CONDITION

Stop after:

1. Data Acquisition migrations exist;
2. all required tables, indexes, constraints, RLS policies, and triggers exist;
3. critical repositories exist;
4. outbox persistence works;
5. tests pass;
6. documentation is complete;
7. completion report is produced.

Do not continue into Stage 2C.

---

# 18. COMPLETION REPORT FORMAT

Return:

```text
DATABASE STAGE 2B REPORT

Created:
- migrations
- schema
- tables
- foreign keys
- indexes
- constraints
- RLS policies
- triggers
- repositories
- shared types
- event outbox integration
- tests
- documentation

Validation:
- command
- result

Schema totals:
- tables created
- indexes created
- foreign keys created
- RLS-enabled tables
- tests passing

Security:
- tenant isolation status
- workspace isolation status
- secret-reference handling status
- provenance immutability status

Data flow verified:
- source registration
- connector registration
- collection run
- validation
- quality score
- provenance
- publication package
- outbox event

Not started:
- Business Operations schema
- remaining layer schemas
- block TypeScript conversion
- frontend expansion

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Database Stage 2C — Business Operations schema
```
