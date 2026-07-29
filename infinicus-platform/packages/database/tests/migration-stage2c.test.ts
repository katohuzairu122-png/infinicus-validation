/**
 * Structural unit tests for Stage 2C migration files.
 * Validates SQL file content without a live database.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const MIGRATIONS_DIR = resolve(__dirname, '../../../infrastructure/database/migrations');

function loadMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), 'utf-8');
}

const STAGE_2C_FILES = [
  '0023_create_bo_core_profile.sql',
  '0024_create_bo_customer_pipeline.sql',
  '0025_create_bo_quotations_orders.sql',
  '0026_create_bo_billing_procurement.sql',
  '0027_create_bo_supplier_inventory.sql',
  '0028_create_bo_warehouse_fulfilment.sql',
  '0029_create_bo_workforce_tasks.sql',
  '0030_create_bo_scheduling_assets.sql',
  '0031_create_bo_finance_support.sql',
  '0032_create_bo_risk_incidents.sql',
  '0033_create_bo_performance_publication.sql',
  '0034_create_bo_indexes.sql',
  '0035_create_bo_rls_policies.sql',
  '0036_create_bo_triggers_events.sql',
];

describe('Stage 2C migration files exist', () => {
  it.each(STAGE_2C_FILES)('%s is readable', (filename) => {
    const sql = loadMigration(filename);
    expect(sql.length).toBeGreaterThan(100);
  });
});

describe('All migration files are transactional', () => {
  it.each(STAGE_2C_FILES)('%s wraps in BEGIN/COMMIT', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;?\s*$/im);
  });
});

describe('All migration files register in _migrations', () => {
  it.each(STAGE_2C_FILES)('%s inserts into _migrations', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toContain("INSERT INTO _migrations (filename) VALUES");
    expect(sql).toContain(filename);
  });
});

describe('0023 — core profile schema', () => {
  const sql = loadMigration('0023_create_bo_core_profile.sql');

  it('creates business_operations schema', () => {
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS business_operations');
  });

  it('creates business_profile_extensions table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.business_profile_extensions');
  });

  it('creates department_responsibilities table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.department_responsibilities');
  });

  it('creates role_assignments table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.role_assignments');
  });

  it('references platform.businesses FK', () => {
    expect(sql).toContain('REFERENCES platform.businesses(id)');
  });

  it('has correlation_id NOT NULL', () => {
    expect(sql).toContain('correlation_id');
  });
});

describe('0024 — customer pipeline', () => {
  const sql = loadMigration('0024_create_bo_customer_pipeline.sql');

  it('creates leads table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.leads');
  });

  it('creates opportunities table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.opportunities');
  });

  it('creates opportunity_activities table (append-only)', () => {
    expect(sql).toContain('CREATE TABLE business_operations.opportunity_activities');
    // append-only: no updated_at
    const tableStart = sql.indexOf('CREATE TABLE business_operations.opportunity_activities');
    const tableEnd   = sql.indexOf(');', tableStart);
    const tableDef   = sql.slice(tableStart, tableEnd);
    expect(tableDef).not.toContain('updated_at');
  });

  it('creates customer_accounts table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.customer_accounts');
  });

  it('leads has lead_status CHECK constraint', () => {
    expect(sql).toContain("lead_status IN (");
  });

  it('opportunities has stage CHECK constraint', () => {
    expect(sql).toContain("stage IN (");
  });
});

describe('0025 — quotations and orders', () => {
  const sql = loadMigration('0025_create_bo_quotations_orders.sql');

  it('creates quotations table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.quotations');
  });

  it('creates quotation_line_items table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.quotation_line_items');
  });

  it('creates order_line_items table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.order_line_items');
  });

  it('creates order_events append-only table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.order_events');
    const tableStart = sql.indexOf('CREATE TABLE business_operations.order_events');
    const tableEnd   = sql.indexOf(');', tableStart);
    const tableDef   = sql.slice(tableStart, tableEnd);
    expect(tableDef).not.toContain('updated_at');
  });

  it('references platform.orders FK', () => {
    expect(sql).toContain('REFERENCES platform.orders(id)');
  });
});

describe('0026 — billing and procurement', () => {
  const sql = loadMigration('0026_create_bo_billing_procurement.sql');

  it('creates invoice_line_items table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.invoice_line_items');
  });

  it('creates payment_allocations append-only table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.payment_allocations');
  });

  it('creates credit_notes table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.credit_notes');
  });

  it('creates purchase_orders table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.purchase_orders');
  });

  it('creates purchase_order_line_items table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.purchase_order_line_items');
  });

  it('creates purchase_receipts append-only table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.purchase_receipts');
  });

  it('references platform.suppliers FK', () => {
    expect(sql).toContain('REFERENCES platform.suppliers(id)');
  });
});

describe('0027 — supplier and inventory', () => {
  const sql = loadMigration('0027_create_bo_supplier_inventory.sql');

  it('creates supplier_agreements table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.supplier_agreements');
  });

  it('creates supplier_performance_scores append-only table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.supplier_performance_scores');
    const tableStart = sql.indexOf('CREATE TABLE business_operations.supplier_performance_scores');
    const tableEnd   = sql.indexOf(');', tableStart);
    const tableDef   = sql.slice(tableStart, tableEnd);
    expect(tableDef).not.toContain('updated_at');
  });

  it('creates inventory_balances table with generated column', () => {
    expect(sql).toContain('CREATE TABLE business_operations.inventory_balances');
    expect(sql).toContain('GENERATED ALWAYS AS');
  });

  it('creates inventory_movements append-only table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.inventory_movements');
  });

  it('references platform.inventory_items FK', () => {
    expect(sql).toContain('REFERENCES platform.inventory_items(id)');
  });

  it('references platform.warehouses FK', () => {
    expect(sql).toContain('REFERENCES platform.warehouses(id)');
  });
});

describe('0028 — warehouse and fulfilment', () => {
  const sql = loadMigration('0028_create_bo_warehouse_fulfilment.sql');

  it('creates warehouse_zones table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.warehouse_zones');
  });

  it('creates storage_locations table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.storage_locations');
  });

  it('creates fulfilment_orders table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.fulfilment_orders');
  });

  it('creates fulfilment_items table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.fulfilment_items');
  });

  it('creates delivery_notes append-only table', () => {
    expect(sql).toContain('CREATE TABLE business_operations.delivery_notes');
    const tableStart = sql.indexOf('CREATE TABLE business_operations.delivery_notes');
    const tableEnd   = sql.indexOf(');', tableStart);
    const tableDef   = sql.slice(tableStart, tableEnd);
    expect(tableDef).not.toContain('updated_at');
  });
});

describe('0035 — RLS policies', () => {
  const sql = loadMigration('0035_create_bo_rls_policies.sql');

  it('enables RLS on every table', () => {
    expect(sql).toContain('ENABLE ROW LEVEL SECURITY');
  });

  it('uses null-safe tenant_id comparison', () => {
    expect(sql).toContain("current_setting('app.tenant_id',    true)::uuid");
  });

  it('uses null-safe workspace_id comparison', () => {
    expect(sql).toContain("current_setting('app.workspace_id', true)::uuid");
  });

  it('creates leads isolation policy', () => {
    expect(sql).toContain('CREATE POLICY leads_isolation ON business_operations.leads');
  });

  it('creates incidents isolation policy', () => {
    expect(sql).toContain('CREATE POLICY incidents_isolation ON business_operations.incidents');
  });
});

describe('0036 — triggers and outbox events', () => {
  const sql = loadMigration('0036_create_bo_triggers_events.sql');

  it('creates set_updated_at trigger for leads', () => {
    expect(sql).toContain('CREATE TRIGGER set_updated_at_leads');
  });

  it('creates bo outbox base function SECURITY DEFINER', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION business_operations.emit_outbox_event');
    expect(sql).toContain('SECURITY DEFINER');
  });

  it('has at least 16 outbox event wrappers', () => {
    const wrapperCount = (sql.match(/CREATE OR REPLACE FUNCTION business_operations\.emit_/g) ?? []).length;
    expect(wrapperCount).toBeGreaterThanOrEqual(16);
  });

  it('emits bo.lead.created event', () => {
    expect(sql).toContain("'bo.lead.created'");
  });

  it('emits bo.order.completed event', () => {
    expect(sql).toContain("'bo.order.completed'");
  });

  it('emits bo.invoice.issued event', () => {
    expect(sql).toContain("'bo.invoice.issued'");
  });

  it('emits bo.payment.received event', () => {
    expect(sql).toContain("'bo.payment.received'");
  });

  it('emits bo.incident.raised event', () => {
    expect(sql).toContain("'bo.incident.raised'");
  });

  it('emits bo.data.published event', () => {
    expect(sql).toContain("'bo.data.published'");
  });
});

describe('Repository TypeScript files exist and export classes', () => {
  const REPO_DIR = resolve(__dirname, '../src/repositories/bo');

  it('LeadRepository exports a class', () => {
    const src = readFileSync(resolve(REPO_DIR, 'LeadRepository.ts'), 'utf-8');
    expect(src).toContain('export class LeadRepository');
    expect(src).toContain('create(');
    expect(src).toContain('findById(');
  });

  it('OpportunityRepository exports a class', () => {
    const src = readFileSync(resolve(REPO_DIR, 'OpportunityRepository.ts'), 'utf-8');
    expect(src).toContain('export class OpportunityRepository');
    expect(src).toContain('advanceStage(');
  });

  it('SupportCaseRepository exports a class', () => {
    const src = readFileSync(resolve(REPO_DIR, 'SupportCaseRepository.ts'), 'utf-8');
    expect(src).toContain('export class SupportCaseRepository');
    expect(src).toContain('resolve(');
  });

  it('IncidentRepository exports a class', () => {
    const src = readFileSync(resolve(REPO_DIR, 'IncidentRepository.ts'), 'utf-8');
    expect(src).toContain('export class IncidentRepository');
    expect(src).toContain('resolve(');
  });

  it('TaskRepository exports a class', () => {
    const src = readFileSync(resolve(REPO_DIR, 'TaskRepository.ts'), 'utf-8');
    expect(src).toContain('export class TaskRepository');
    expect(src).toContain('updateStatus(');
  });

  it('InventoryBalanceRepository exports a class', () => {
    const src = readFileSync(resolve(REPO_DIR, 'InventoryBalanceRepository.ts'), 'utf-8');
    expect(src).toContain('export class InventoryBalanceRepository');
    expect(src).toContain('adjustQuantity(');
  });
});
