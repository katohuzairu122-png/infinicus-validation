# INFINICUS DATABASE STAGE 2A — EXECUTION PROMPT

You are working inside the root of the `infinicus-platform` monorepo.

Read and obey the root `CLAUDE.md` before making any changes.

## Objective

Create Database Stage 2A only:

1. platform schema;
2. identity schema;
3. tenancy schema;
4. audit schema;
5. events schema;
6. files schema;
7. canonical enterprise entity foundation;
8. migrations;
9. indexes;
10. foreign keys;
11. tenant-isolation controls;
12. database tests.

Do not create full layer-specific schemas yet.

Do not build frontend pages.

Do not add external integrations.

Do not migrate the 198 layer blocks in this stage.

Stop after Stage 2A passes validation.

---

## Existing Repository Assumptions

The monorepo already contains:

```text
packages/database
packages/shared-types
packages/event-contracts
packages/handoff-contracts
apps/web
apps/admin
apps/api
layers/*
infrastructure/database
tests
```

The database package already contains:

- database client;
- migration runner;
- pool wrapper;
- Stage 1 foundation;
- structural tests.

Inspect existing files before modifying anything.

Do not overwrite working Stage 1 code unnecessarily.

---

## Database Technology

Use PostgreSQL-compatible SQL.

The implementation must remain compatible with Neon PostgreSQL.

Use SQL migrations as the source of truth.

Do not rely on browser storage.

Do not store secrets inside migrations or source files.

Use environment variables:

```text
DATABASE_URL
DIRECT_DATABASE_URL
```

---

## Required Schema Names

Create these PostgreSQL schemas:

```sql
platform
identity
tenancy
audit
events
files
```

Do not create layer-specific schemas such as:

```text
data_acquisition
business_operations
business_intelligence
digital_twin
simulation
decision_intelligence
approved_actions
outcome_monitoring
continuous_learning
```

Those belong to later database stages.

---

## Migration Structure

Use ordered, reversible migrations.

Recommended structure:

```text
packages/database/
├── migrations/
│   ├── 0001_create_extensions.sql
│   ├── 0002_create_platform_schema.sql
│   ├── 0003_create_identity_schema.sql
│   ├── 0004_create_tenancy_schema.sql
│   ├── 0005_create_audit_schema.sql
│   ├── 0006_create_events_schema.sql
│   ├── 0007_create_files_schema.sql
│   ├── 0008_create_canonical_entities.sql
│   ├── 0009_create_indexes.sql
│   ├── 0010_create_rls_policies.sql
│   └── 0011_create_updated_at_triggers.sql
├── src/
├── tests/
└── package.json
```

Use the repository’s existing migration naming convention when one already exists.

Do not create duplicate migration systems.

---

## Required PostgreSQL Extensions

Use only extensions that are available on standard PostgreSQL or Neon.

Add only where required:

```sql
pgcrypto
citext
```

Use `gen_random_uuid()` for UUID generation.

Do not add vector extensions in Stage 2A.

---

# 1. PLATFORM SCHEMA

Create:

```sql
platform.businesses
platform.organization_units
platform.departments
platform.locations
platform.system_settings
platform.feature_flags
```

## platform.businesses

Required columns:

```text
id uuid primary key
tenant_id uuid not null
workspace_id uuid not null
legal_name text not null
trading_name text
business_code citext not null
industry text
legal_structure text
business_model text
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

Constraints:

- unique business code within tenant;
- status check;
- version greater than zero;
- tenant and workspace foreign keys;
- correlation ID required.

Allowed statuses:

```text
draft
active
suspended
closed
archived
```

## platform.organization_units

Required columns:

```text
id
tenant_id
workspace_id
business_id
parent_unit_id
name
code
unit_type
status
version
correlation_id
created_at
updated_at
created_by
deleted_at
```

Allowed unit types:

```text
company
division
branch
department
team
location
```

Prevent direct self-parenting.

## platform.departments

Required columns:

```text
id
tenant_id
workspace_id
business_id
organization_unit_id
name
code
description
status
version
correlation_id
created_at
updated_at
created_by
deleted_at
```

## platform.locations

Required columns:

```text
id
tenant_id
workspace_id
business_id
organization_unit_id
name
location_type
country_code
region
city
address_line_1
address_line_2
postal_code
timezone
status
version
correlation_id
created_at
updated_at
created_by
deleted_at
```

## platform.system_settings

Use key-value records scoped by:

```text
platform
tenant
workspace
business
```

Store structured values using `jsonb`.

## platform.feature_flags

Required capabilities:

- global flag;
- tenant override;
- workspace override;
- business override;
- enabled state;
- structured configuration;
- activation and expiry timestamps.

---

# 2. IDENTITY SCHEMA

Create:

```sql
identity.users
identity.user_profiles
identity.service_accounts
identity.api_key_references
identity.sessions
```

## identity.users

Required columns:

```text
id uuid primary key
email citext not null unique
email_verified_at timestamptz
password_hash text
status text not null
last_login_at timestamptz
created_at
updated_at
deleted_at
```

Do not store plaintext passwords.

Allowed statuses:

```text
pending
active
suspended
disabled
deleted
```

## identity.user_profiles

Required columns:

```text
user_id primary key
display_name
first_name
last_name
phone_number
locale
timezone
avatar_file_id
created_at
updated_at
```

## identity.service_accounts

Required columns:

```text
id
tenant_id
workspace_id
name
description
status
last_used_at
created_at
updated_at
created_by
```

## identity.api_key_references

Store references and hashes only.

Required columns:

```text
id
service_account_id
key_prefix
key_hash
scopes jsonb
expires_at
revoked_at
last_used_at
created_at
created_by
```

Never store raw API keys.

## identity.sessions

Required columns:

```text
id
user_id
session_token_hash
ip_address inet
user_agent
expires_at
revoked_at
created_at
updated_at
```

Never store raw session tokens.

---

# 3. TENANCY SCHEMA

Create:

```sql
tenancy.tenants
tenancy.workspaces
tenancy.memberships
tenancy.roles
tenancy.permissions
tenancy.role_permissions
tenancy.membership_roles
tenancy.invitations
```

## tenancy.tenants

Required columns:

```text
id
name
slug citext
status
plan_code
default_timezone
default_currency
created_at
updated_at
created_by
deleted_at
```

Allowed statuses:

```text
trial
active
suspended
closed
```

## tenancy.workspaces

Required columns:

```text
id
tenant_id
name
slug citext
status
created_at
updated_at
created_by
deleted_at
```

Unique workspace slug within tenant.

## tenancy.memberships

Required columns:

```text
id
tenant_id
workspace_id
user_id
status
joined_at
created_at
updated_at
created_by
```

Unique membership per user and workspace.

Allowed statuses:

```text
invited
active
suspended
removed
```

## tenancy.roles

Required columns:

```text
id
tenant_id nullable
code citext
name
description
scope
is_system
created_at
updated_at
```

Supported scopes:

```text
platform
tenant
workspace
business
```

Seed only role definitions, not production users.

Initial system roles:

```text
platform_owner
platform_administrator
business_owner
business_administrator
manager
analyst
operator
reviewer
auditor
read_only
```

## tenancy.permissions

Required columns:

```text
id
code citext unique
resource
action
description
created_at
```

## tenancy.role_permissions

Composite uniqueness:

```text
role_id
permission_id
```

## tenancy.membership_roles

Required columns:

```text
membership_id
role_id
business_id nullable
assigned_at
assigned_by
```

## tenancy.invitations

Required columns:

```text
id
tenant_id
workspace_id
email citext
invitation_token_hash
status
expires_at
accepted_at
created_at
created_by
```

Never store raw invitation tokens.

---

# 4. AUDIT SCHEMA

Create:

```sql
audit.audit_events
audit.entity_versions
audit.access_events
```

## audit.audit_events

Required columns:

```text
id
tenant_id
workspace_id
business_id nullable
actor_type
actor_id nullable
action
entity_type
entity_id nullable
before_data jsonb
after_data jsonb
metadata jsonb
correlation_id
ip_address inet
user_agent
occurred_at
```

Actor types:

```text
user
service_account
system
integration
```

Audit records must be append-only.

Do not create update or delete application paths for audit events.

## audit.entity_versions

Required columns:

```text
id
tenant_id
workspace_id
business_id nullable
entity_type
entity_id
entity_version
snapshot jsonb
change_type
correlation_id
created_at
created_by
```

Unique:

```text
entity_type
entity_id
entity_version
```

## audit.access_events

Track:

- login;
- logout;
- failed authentication;
- permission denial;
- sensitive-data access;
- API-key usage;
- session revocation.

---

# 5. EVENTS SCHEMA

Create:

```sql
events.outbox_events
events.inbox_events
events.dead_letter_events
events.event_subscriptions
events.event_delivery_attempts
```

## events.outbox_events

Required columns:

```text
id
event_type
event_version
tenant_id
workspace_id
business_id nullable
correlation_id
causation_id nullable
aggregate_type
aggregate_id
payload jsonb
headers jsonb
status
attempt_count
available_at
occurred_at
published_at nullable
created_at
```

Allowed statuses:

```text
pending
processing
published
failed
dead_lettered
```

## events.inbox_events

Required capabilities:

- idempotent consumer processing;
- unique event and consumer combination;
- received timestamp;
- processed timestamp;
- failure tracking.

## events.dead_letter_events

Preserve:

- original event;
- failure reason;
- attempt count;
- first failure;
- final failure;
- replay state.

## events.event_subscriptions

Store:

- subscriber name;
- event pattern;
- destination type;
- destination reference;
- status;
- retry policy.

## events.event_delivery_attempts

Store every attempt separately.

Do not overwrite attempt history.

---

# 6. FILES SCHEMA

Create:

```sql
files.file_objects
files.file_versions
files.file_links
files.file_access_events
```

## files.file_objects

Required columns:

```text
id
tenant_id
workspace_id
business_id nullable
storage_provider
bucket_name
object_key
original_filename
media_type
size_bytes
sha256_hash
classification
status
created_at
updated_at
created_by
deleted_at
```

Do not store binary file contents in PostgreSQL.

## files.file_versions

Required columns:

```text
id
file_object_id
version
object_key
size_bytes
sha256_hash
created_at
created_by
```

Unique:

```text
file_object_id
version
```

## files.file_links

Associate files with platform entities:

```text
file_object_id
entity_type
entity_id
relationship_type
created_at
created_by
```

## files.file_access_events

Append-only file access records.

---

# 7. CANONICAL ENTERPRISE ENTITY FOUNDATION

Create the minimum authoritative tables required for future layer schemas.

Create:

```sql
platform.customers
platform.suppliers
platform.employees
platform.products
platform.services
platform.orders
platform.invoices
platform.payments
platform.inventory_items
platform.warehouses
platform.assets
platform.operational_events
platform.metrics
platform.simulations
platform.decisions
platform.approved_actions
platform.outcomes
platform.learning_items
```

These are foundation tables, not complete domain implementations.

Use shared columns:

```text
id
tenant_id
workspace_id
business_id
status
version
source_system
source_record_id
correlation_id
created_at
updated_at
created_by
deleted_at where applicable
```

Add only essential domain fields required to establish identity and relationships.

Examples:

## customers

```text
customer_type
display_name
email
phone_number
external_reference
```

## suppliers

```text
name
supplier_code
email
phone_number
risk_status
```

## employees

```text
user_id nullable
employee_code
display_name
employment_status
organization_unit_id nullable
department_id nullable
```

## products

```text
product_code
name
description
unit_of_measure
currency_code
standard_price
standard_cost
```

## services

```text
service_code
name
description
currency_code
standard_price
```

## orders

```text
customer_id nullable
order_number
order_date
currency_code
total_amount
operational_status
```

Use operational statuses:

```text
planned
authorized
executed
completed
failed
reversed
```

## invoices

```text
customer_id nullable
order_id nullable
invoice_number
issue_date
due_date
currency_code
total_amount
outstanding_amount
```

## payments

```text
customer_id nullable
invoice_id nullable
payment_reference
payment_date
currency_code
amount
operational_status
```

## inventory_items

```text
product_id nullable
sku
name
unit_of_measure
```

## warehouses

```text
location_id nullable
warehouse_code
name
```

## assets

```text
asset_code
name
asset_type
location_id nullable
condition_status
```

## operational_events

```text
event_type
entity_type
entity_id
payload jsonb
occurred_at
```

## metrics

```text
metric_code
metric_name
metric_value numeric
unit
measured_at
dimensions jsonb
```

## simulations

```text
simulation_type
input_reference jsonb
result_reference jsonb
started_at
completed_at
```

## decisions

```text
decision_type
recommendation jsonb
confidence numeric
generated_at
```

Confidence must be constrained between 0 and 1.

## approved_actions

```text
decision_id nullable
action_type
action_payload jsonb
approval_status
approved_at
approved_by
```

## outcomes

```text
approved_action_id nullable
outcome_type
expected_value jsonb
observed_value jsonb
evaluated_at
```

## learning_items

```text
outcome_id nullable
learning_type
summary
confidence numeric
reliability numeric
applicability_scope jsonb
```

Confidence and reliability must be constrained between 0 and 1.

---

# 8. INDEXES

Create indexes for:

```text
tenant_id
workspace_id
business_id
status
correlation_id
created_at
updated_at
source_record_id
event_type
event status
available_at
foreign-key columns
soft-deletion filters
```

Use composite indexes where query patterns require tenant scoping.

Examples:

```sql
(tenant_id, workspace_id)
(tenant_id, business_id)
(tenant_id, workspace_id, status)
(tenant_id, correlation_id)
```

Avoid creating duplicate or unused indexes.

---

# 9. TENANT ISOLATION

Enable PostgreSQL Row-Level Security on tenant-owned tables.

Tenant-owned tables include all tables containing `tenant_id`.

Use transaction-local PostgreSQL settings:

```sql
app.tenant_id
app.workspace_id
app.user_id
```

Policies must ensure:

```text
tenant_id = current_setting('app.tenant_id', true)::uuid
```

Where workspace scoping applies, also enforce:

```text
workspace_id = current_setting('app.workspace_id', true)::uuid
```

Create helper SQL functions only when they reduce duplication safely.

Do not use permissive policies that allow access when tenant context is missing.

The database package must expose a transaction helper that:

1. begins a transaction;
2. applies tenant, workspace, and user context with `SET LOCAL`;
3. executes the callback;
4. commits on success;
5. rolls back on failure.

---

# 10. UPDATED_AT HANDLING

Create a reusable trigger function for `updated_at`.

Apply it only to mutable tables.

Do not apply it to append-only audit or event-attempt tables.

---

# 11. DELETION AND RETENTION RULES

Use soft deletion where appropriate:

```text
users
tenants
workspaces
businesses
customers
suppliers
employees
products
services
files
```

Do not soft-delete append-only audit and event history.

Define deletion behavior explicitly:

- `restrict` for critical parent records;
- `cascade` only for dependent join records;
- `set null` where historical records must survive.

Do not use broad cascading deletion across business history.

---

# 12. SHARED TYPES

Update `packages/shared-types` only as required.

Add or confirm:

```ts
BaseRecord
OperationalStatus
TenantId
WorkspaceId
BusinessId
CorrelationId
```

Do not duplicate these types inside the database package.

Create database row types only where generated or maintained consistently.

---

# 13. DATABASE PACKAGE API

The database package must expose:

```ts
getDatabasePool()
closeDatabasePool()
runMigrations()
withTransaction()
withTenantTransaction()
```

`withTenantTransaction()` must require:

```ts
tenantId
workspaceId
userId
```

Do not allow tenant-owned queries through a helper that omits tenant context.

---

# 14. DATABASE TESTS

Create tests for:

## Migration tests

- migrations apply from an empty database;
- migrations are ordered;
- repeated migration execution is safe;
- required schemas exist;
- required tables exist.

## Constraint tests

- duplicate tenant slug is rejected;
- duplicate workspace slug within tenant is rejected;
- duplicate business code within tenant is rejected;
- invalid status is rejected;
- confidence outside 0–1 is rejected;
- invalid operational state is rejected;
- required foreign keys are enforced;
- direct organization-unit self-parenting is rejected.

## Tenant-isolation tests

- tenant A cannot read tenant B records;
- tenant A cannot update tenant B records;
- tenant A cannot delete tenant B records;
- missing tenant context returns no tenant-owned rows or raises a controlled error;
- workspace scope is enforced;
- privileged migration role is separated from application role assumptions.

## Event tests

- outbox event is inserted;
- inbox idempotency prevents duplicate consumer processing;
- event delivery attempts remain append-only;
- dead-letter records preserve failure details.

## Audit tests

- audit events are insertable;
- audit events cannot be updated through the application role;
- audit events cannot be deleted through the application role.

## File tests

- duplicate file version number is rejected;
- file hash and metadata persist;
- file links maintain entity references without storing binary content.

Use isolated test data.

Do not rely on production credentials.

---

# 15. SEED DATA

Create development-only seeds for:

- initial system roles;
- initial permissions;
- role-permission mappings.

Do not create a real platform owner account.

Do not create real passwords or API keys.

Seed execution must be explicitly separate from production migrations.

---

# 16. DOCUMENTATION

Create or update:

```text
packages/database/README.md
docs/database-stage-2a.md
docs/database-schema-map.md
docs/tenant-isolation.md
docs/database-backup-restore.md
```

The documentation must include:

- schema ownership;
- table purpose;
- tenancy model;
- RLS behavior;
- transaction-context usage;
- migration commands;
- test commands;
- backup assumptions;
- restore procedure outline;
- what remains for Stage 2B.

---

# 17. VALIDATION COMMANDS

Run:

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

Use the actual database package name if it differs.

Run migration and integration tests only against a dedicated development or test database.

Do not run destructive tests against production.

Do not claim completion unless all applicable commands pass.

---

# 18. PROHIBITED WORK

Do not start:

- Data Acquisition-specific tables;
- Business Operations-specific tables;
- Business Intelligence-specific tables;
- Digital Twin-specific tables;
- Simulation-specific tables;
- AI Decision Intelligence-specific tables;
- Approved Business Action-specific tables;
- Outcome Monitoring-specific tables;
- Continuous Learning-specific tables;
- block TypeScript conversion;
- event-bus infrastructure deployment;
- authentication UI;
- frontend pages;
- external connectors.

Stage 2A establishes shared persistence only.

---

# 19. STOP CONDITION

Stop after:

1. Stage 2A migrations are created;
2. shared database helpers are implemented;
3. RLS policies are implemented;
4. tests pass;
5. documentation is updated;
6. the completion report is produced.

Do not continue into Stage 2B.

---

# 20. COMPLETION REPORT FORMAT

Return:

```text
DATABASE STAGE 2A REPORT

Created:
- migrations
- schemas
- tables
- indexes
- constraints
- RLS policies
- triggers
- seed files
- database helpers
- tests
- documentation

Validation:
- command
- result

Schema totals:
- schemas created
- tables created
- RLS-enabled tables
- indexes created
- tests passing

Security:
- tenant isolation status
- workspace isolation status
- audit immutability status
- raw-secret storage status

Not started:
- Data Acquisition schema
- Business Operations schema
- remaining layer schemas
- block TypeScript conversion
- frontend expansion

Risks or unresolved issues:
- exact issue
- impact
- recommended resolution

Next recommended task:
- Database Stage 2B — Data Acquisition schema
```
