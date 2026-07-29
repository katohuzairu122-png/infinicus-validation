# Database Stage 2C — Business Operations Schema

## Status

**COMPLETE — VALIDATED — FROZEN** (2026-07-21)

Frozen migration range after Stage 2C: **0001–0036**

## Overview

Stage 2C creates the `business_operations` schema with 48 tables supporting the
Business Operations layer (BO). It transforms validated Data Acquisition
records into traceable operational business records, extending Stage 2A's
canonical entities (`platform.orders`, `platform.invoices`, `platform.payments`,
`platform.customers`, `platform.suppliers`, `platform.employees`,
`platform.inventory_items`, `platform.warehouses`) rather than duplicating
them. All tables enforce Row-Level Security with null-safe tenant + workspace
isolation, and 16 outbox event functions publish BO domain events through the
Stage 2A `events.outbox_events` backbone.

## Migration Sequence

| File | Contents |
|------|----------|
| `0023_create_bo_core_profile.sql` | `business_operations` schema + `business_profile_extensions`, `department_responsibilities`, `role_assignments` |
| `0024_create_bo_customer_pipeline.sql` | `leads`, `opportunities`, `opportunity_activities`, `customer_accounts` |
| `0025_create_bo_quotations_orders.sql` | `quotations`, `quotation_line_items`, `order_line_items`, `order_events` |
| `0026_create_bo_billing_procurement.sql` | `invoice_line_items`, `payment_allocations`, `credit_notes`, `purchase_orders`, `purchase_order_line_items`, `purchase_receipts` |
| `0027_create_bo_supplier_inventory.sql` | `supplier_agreements`, `supplier_performance_scores`, `inventory_balances`, `inventory_movements` |
| `0028_create_bo_warehouse_fulfilment.sql` | `warehouse_zones`, `storage_locations`, `fulfilment_orders`, `fulfilment_items`, `delivery_notes` |
| `0029_create_bo_workforce_tasks.sql` | `employee_assignments`, `work_schedules`, `tasks`, `task_assignments`, `workflow_instances` |
| `0030_create_bo_scheduling_assets.sql` | `resource_bookings`, `maintenance_schedules`, `maintenance_records`, `asset_inspections` |
| `0031_create_bo_finance_support.sql` | `expense_claims`, `expense_items`, `support_cases`, `case_activities` |
| `0032_create_bo_risk_incidents.sql` | `compliance_controls`, `risk_assessments`, `incidents`, `incident_escalations` |
| `0033_create_bo_performance_publication.sql` | `operational_performance_records`, `bo_publication_packages`, `bo_handoff_records`, `bo_layer_assemblies`, `bo_layer_deployments` |
| `0034_create_bo_indexes.sql` | 193 explicit indexes across all 48 tables (275 total incl. PK/unique-backed) |
| `0035_create_bo_rls_policies.sql` | RLS enabled + tenant-isolation policies on all 48 tables |
| `0036_create_bo_triggers_events.sql` | 33 `updated_at` triggers + 16 SECURITY DEFINER outbox event functions |

Frozen migrations 0001–0022 were not modified.

## Canonical Entity Integration (no duplication)

Stage 2C does not re-create customers, orders, invoices, payments, suppliers,
employees, inventory items or warehouses. Those are Stage 2A canonical
entities in the `platform` schema. BO tables attach operational detail via
foreign keys, e.g.:

- `order_line_items.order_id` → `platform.orders(id)`
- `invoice_line_items.invoice_id` → `platform.invoices(id)`
- `payment_allocations.payment_id` → `platform.payments(id)`
- `customer_accounts.customer_id` → `platform.customers(id)`
- `purchase_orders.supplier_id` → `platform.suppliers(id)`
- `purchase_orders.approved_by` → `platform.employees(id)`
- `inventory_balances.inventory_item_id` → `platform.inventory_items(id)`
- `inventory_balances.warehouse_id` → `platform.warehouses(id)`

## Row-Level Security

All 48 tables have RLS enabled with the null-safe pattern established in
Stage 2A/2B:

```sql
USING (
  tenant_id    = current_setting('app.tenant_id',    true)::uuid
AND workspace_id = current_setting('app.workspace_id', true)::uuid
)
```

Application access goes through `withTenantTransaction(ctx, fn)`, which sets
transaction-local `app.tenant_id`, `app.workspace_id`, `app.user_id`.
Cross-tenant reads and writes are rejected (verified live — see Validation).

## Outbox Events

16 SECURITY DEFINER functions in the `business_operations` schema emit typed
events into `events.outbox_events` (the application role has no direct grant
on the outbox table):

`bo.lead.created`, `bo.lead.converted`, `bo.opportunity.stage_changed`,
`bo.quotation.sent`, `bo.order.authorized`, `bo.order.completed`,
`bo.invoice.issued`, `bo.payment.received`, `bo.purchase_order.approved`,
`bo.inventory.movement_recorded`, `bo.fulfilment.dispatched`,
`bo.support_case.opened`, `bo.support_case.resolved`, `bo.incident.raised`,
`bo.incident.resolved`, `bo.data.published`

`bo.data.published` supports the downstream Business Intelligence handoff
(`bo_publication_packages` → BI) without implementing Stage 2D.

## Source Lineage to Data Acquisition

Operational records carry `source_system`, `source_record_id` and
`correlation_id` columns following the canonical BaseRecord contract, and
`bo_publication_packages` / `bo_handoff_records` preserve upstream DA
publication identity, keeping every operational record traceable back to
`data_acquisition.publication_packages`.

## Repository Adapters (`packages/database/src/repositories/bo/`)

| Repository | Methods |
|---|---|
| `LeadRepository` | create, findById, listByStatus, updateStatus, convert |
| `OpportunityRepository` | create, findById, listByStage, advanceStage, close |
| `PurchaseOrderRepository` | create, findById, listByStatus, approve, updateStatus |
| `SupportCaseRepository` | create, findById, listOpen, resolve, assign |
| `IncidentRepository` | create, findById, listOpen, updateStatus, resolve |
| `TaskRepository` | create, findById, listOpen, updateStatus |
| `InventoryBalanceRepository` | create, findByItemAndWarehouse, adjustQuantity, listBelowReorder |

All repositories require a `TenantContext` and execute inside
`withTenantTransaction` — tenant isolation is enforced in every persistent
query. Numeric columns are parsed with `parseFloat(String(...))` because pg
returns `numeric` as string. Lifecycle transitions are validated; invalid
transitions throw typed errors (`InvalidTransitionError`), and missing rows
throw `NotFoundError` rather than returning null silently.

## Validation Results (re-verified at freeze, 2026-07-21)

Live database: local PostgreSQL 16.13, database `infinicus_test`, roles
`app_test_user` (RLS enforced) / `infinicus_test_admin` (BYPASSRLS). All 36
migrations applied cleanly from empty.

| Check | Command | Result |
|---|---|---|
| Structural + live tests | `pnpm --filter @infinicus/database test` | **456/456 passed** (7 files: 97 Stage 2C structural, 36 BO live integration, 146 Stage 2B, 53 DA live integration, 114 Stage 2A, 6 migration-0001, 4 tx helpers) |
| Lint | `pnpm lint` | 21/21 tasks, 0 errors (5 pre-existing console warnings in `migrate.ts`) |
| Typecheck | `pnpm typecheck` | 1/1 tasks, clean |
| Build | `pnpm build` | 21/21 tasks, clean |
| Live schema | psql verification | 48 tables, 48 RLS-enabled, 48 policies, 33 triggers, 17 functions, 275 indexes |
| Migration integrity | git history | Stage 2C commit touched only 0023–0036; 0001–0022 unchanged |

The 36 live BO integration tests cover: tenant isolation, cross-tenant
rejection (reads and writes), outbox event emission, idempotent re-ingestion,
invalid lifecycle-transition rejection, FK enforcement
(`purchase_orders.approved_by` → `platform.employees`), and repository CRUD
against RLS-enforced connections.

## Running Migrations

```bash
DATABASE_URL=postgresql://... npx tsx -e "import('./packages/database/src/migrate.ts').then(m => m.runMigrations())"
```

## Running Tests

```bash
# structural only
pnpm --filter @infinicus/database test

# with live database
DATABASE_URL=postgresql://app_user:***@host/db \
ADMIN_DATABASE_URL=postgresql://admin:***@host/db \
pnpm --filter @infinicus/database test
```

Credentials come from environment variables only — never committed.

## What Remains for Stage 2D / Stage 3

- Business Intelligence schema (`business_intelligence`)
- BI consumers for `bo.data.published` events
- Not started in Stage 2C.
