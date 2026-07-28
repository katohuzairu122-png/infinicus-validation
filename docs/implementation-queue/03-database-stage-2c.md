# INFINICUS DATABASE STAGE 2C — BUSINESS OPERATIONS IMPLEMENTATION PROMPT

## Objective

Implement Business Operations persistence only.

Canonical schema:

```text
business_operations
```

Canonical business identity:

```text
platform.businesses
```

Do not create `bo` or `tenancy.businesses`.

Migrations `0001–0022` are frozen. Start from the next actual migration number, expected `0023`.

## Required table groups

### Business profile and context

```text
business_profiles
business_profile_versions
operating_contexts
operating_context_versions
business_locations
business_units
```

### Products, services, and pricing

```text
products
product_versions
services
service_versions
price_lists
price_list_items
```

### Customers and relationships

```text
customers
customer_profiles
customer_segments
customer_segment_memberships
business_relationships
relationship_contacts
```

### Sales and finance

```text
sales_channels
orders
order_items
order_status_history
quotes
quote_items
invoices
invoice_items
payments
payment_allocations
refunds
```

### Procurement

```text
suppliers
supplier_profiles
purchase_orders
purchase_order_items
goods_receipts
supplier_invoices
supplier_payments
```

### Inventory and fulfilment

```text
inventory_items
inventory_locations
inventory_balances
inventory_movements
stock_adjustments
fulfilment_orders
fulfilment_items
shipments
shipment_items
```

### Workforce and workflows

```text
workers
worker_assignments
work_schedules
workflow_definitions
workflow_instances
workflow_steps
workflow_step_executions
tasks
task_assignments
```

### Assets, incidents, risks, and controls

```text
assets
asset_assignments
maintenance_records
operational_incidents
operational_risks
operational_controls
```

### Publication and handoff

```text
operational_publication_packages
operational_publication_items
operational_handoff_receipts
operational_handoff_acknowledgements
operational_handoff_rejections
```

Consolidation is allowed only when existing BO architecture already combines responsibilities. Document every consolidation.

## Suggested migration sequence

```text
0023_business_operations_schema.sql
0024_business_profiles_and_context.sql
0025_products_services_and_pricing.sql
0026_customers_and_relationships.sql
0027_sales_orders_invoices_payments.sql
0028_procurement_and_suppliers.sql
0029_inventory_and_fulfilment.sql
0030_workforce_and_workflows.sql
0031_assets_incidents_risks_controls.sql
0032_operational_publication_and_handoffs.sql
0033_business_operations_indexes.sql
0034_business_operations_rls.sql
0035_business_operations_triggers.sql
0036_business_operations_event_functions.sql
```

Calculate actual numbering before creation.

## Core rules

### Profiles

- One active profile per business.
- Immutable version history.
- Source publication and provenance retained.
- Low-confidence intake cannot overwrite protected legal identity.

### Orders

```text
draft → confirmed → in_progress → fulfilled → completed
```

Cancellation and refund transitions must be explicit. Reject invalid transitions.

### Payments

Use `NUMERIC` for money. Preserve authorization, capture, allocation, refund, and failure history.

### Inventory

Every quantity change must create a traceable inventory movement. Prevent untracked balance mutation.

### Procurement

Keep purchase order, receipt, supplier invoice, and supplier payment independently traceable.

### Workflows

Activated workflow definition versions are immutable. Instances reference one version.

### Publication

Packages must include target layer, period where applicable, record count, quality, limitations, provenance, version, and status.

## Constraints and indexes

Add named constraints for:

- positive monetary values and quantities
- valid currencies, percentages, scores, and date ranges
- valid state values
- unique active profile
- unique profile and package versions
- unique order, invoice, and PO numbers within business
- unique inventory balance key
- handoff/package idempotency

Index tenant, workspace, business, status, dates, customer, supplier, product, inventory, workflow, publication, source reference, correlation, and handoff identifiers.

## Foreign keys

Reference:

```text
tenancy.tenants
tenancy.workspaces
platform.businesses
identity actors where applicable
```

Avoid broad cascade deletion on financial, operational, execution, evidence, or audit history.

## RLS

Enable RLS on every tenant-owned table.

Enforce tenant, workspace, and business scope. Missing context fails closed. Application role must not bypass RLS.

## Triggers

Use `updated_at` only on mutable tables. Keep history, version, financial evidence, and publication evidence immutable.

## Event publication

Create transaction-safe functions or repository helpers for:

```text
bo.business_profile.updated
bo.order.created
bo.order.completed
bo.payment.recorded
bo.inventory.adjusted
bo.data.published
```

Reuse the canonical Stage 2A outbox implementation. Preserve event version, tenant/workspace/business, aggregate, correlation, and causation.

## Repositories

Implement at minimum:

```text
BusinessProfileRepository
OrderRepository
PaymentRepository
InventoryRepository
WorkflowRepository
OperationalPublicationRepository
OperationalHandoffRepository
```

Use typed records, parameterized SQL, tenant transactions, controlled errors, and no direct cross-layer table access.

## Live PostgreSQL 16 tests

Cover:

- profile creation and versioning
- protected identity fields
- order creation and valid/invalid transitions
- invoices, payments, allocations, and refunds
- supplier, PO, receipt, invoice, and payment flow
- inventory movements, balances, adjustments, and concurrency
- workflow definition versioning and instances
- publication, handoff acknowledgement/rejection, and idempotency
- event outbox atomicity
- tenant and workspace isolation
- fail-closed behavior
- application-role RLS
- transaction rollback

Target at least 80 meaningful live integration tests.

## Structural verification

Verify schema, tables, columns, constraints, FKs, indexes, RLS, policies, triggers, event functions, repositories, migrations, and public exports.

## Documentation

Create:

```text
docs/database/stage-2c-business-operations.md
docs/database/business-operations-schema.md
docs/database/business-operations-rls.md
docs/database/business-operations-events.md
docs/database/business-operations-repositories.md
docs/database/business-operations-test-plan.md
```

## Validation

```bash
pnpm install
pnpm workspace:validate
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @infinicus/database test:integration
```

Apply all migrations from an empty PostgreSQL 16 database and rerun to prove idempotency.

## Prohibited work

Do not implement Stage 2D or later schemas, frontend, relay workers, vertical-slice consumers, integrations, or edits to frozen migrations.

## Stop condition

Stop after schema, tables, constraints, indexes, RLS, triggers, events, repositories, live tests, idempotency, documentation, and migration freeze are complete.

Do not begin Stage 2D.

## Completion report

Return the exact migration range, files, schema totals, table totals, constraints, FKs, indexes, RLS tables, triggers, event functions, repositories, test results, security verification, limitations, and:

```text
Next recommended task:
Database Stage 2D — Business Intelligence
```
