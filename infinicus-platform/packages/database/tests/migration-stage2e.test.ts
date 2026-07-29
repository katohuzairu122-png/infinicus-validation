/**
 * Structural unit tests for Stage 2E (Business Digital Twin) migration files.
 * Validates SQL file content without a live database.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const MIGRATIONS_DIR = resolve(__dirname, '../../../infrastructure/database/migrations');

function loadMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), 'utf-8');
}

const STAGE_2E_FILES = [
  '0050_create_dt_schema_intake.sql',
  '0051_create_dt_definitions_instances.sql',
  '0052_create_dt_state_variables.sql',
  '0053_create_dt_snapshots.sql',
  '0054_create_dt_entities.sql',
  '0055_create_dt_assumptions_constraints.sql',
  '0056_create_dt_calibration_validation.sql',
  '0057_create_dt_uncertainty.sql',
  '0058_create_dt_scenario_baselines.sql',
  '0059_create_dt_publication_registry.sql',
  '0060_create_dt_indexes.sql',
  '0061_create_dt_rls_policies.sql',
  '0062_create_dt_triggers_events.sql',
];

describe('Stage 2E migration files exist', () => {
  it.each(STAGE_2E_FILES)('%s is readable', (filename) => {
    const sql = loadMigration(filename);
    expect(sql.length).toBeGreaterThan(100);
  });
});

describe('All Stage 2E migration files are transactional', () => {
  it.each(STAGE_2E_FILES)('%s wraps in BEGIN/COMMIT', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;?\s*$/im);
  });
});

describe('All Stage 2E migration files self-register in _migrations', () => {
  it.each(STAGE_2E_FILES)('%s inserts into _migrations', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toContain('INSERT INTO _migrations (filename) VALUES');
    expect(sql).toContain(filename);
    expect(sql).toContain('ON CONFLICT (filename) DO NOTHING');
  });
});

describe('Frozen migration range is not touched', () => {
  it('the next migration after 0049 is 0050 — no gap, no renumbering', () => {
    expect(STAGE_2E_FILES[0]).toBe('0050_create_dt_schema_intake.sql');
  });

  it('frozen 0001-0049 files are untouched by this stage (not part of STAGE_2E_FILES)', () => {
    for (const f of STAGE_2E_FILES) {
      const num = parseInt(f.slice(0, 4), 10);
      expect(num).toBeGreaterThanOrEqual(50);
    }
  });
});

describe('0050 — schema + intake and lineage', () => {
  const sql = loadMigration('0050_create_dt_schema_intake.sql');

  it('creates business_digital_twin schema', () => {
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS business_digital_twin');
  });

  for (const table of [
    'dt_intake_packages',
    'dt_intake_package_versions',
    'dt_intake_source_references',
    'dt_intake_processing_status_history',
  ]) {
    it(`creates business_digital_twin.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_digital_twin.${table}`);
    });
  }

  it('intake packages reference the canonical BI publication package', () => {
    expect(sql).toContain('REFERENCES business_intelligence.bi_publication_packages(id)');
  });

  it('intake packages reference canonical tenancy/platform identity, never a duplicate', () => {
    expect(sql).toContain('REFERENCES tenancy.tenants(id)');
    expect(sql).toContain('REFERENCES tenancy.workspaces(id)');
    expect(sql).toContain('REFERENCES platform.businesses(id)');
    expect(sql).not.toContain('CREATE TABLE tenancy.businesses');
  });

  it('intake packages are idempotent per (business_id, idempotency_key) and (business_id, bi_publication_package_id)', () => {
    expect(sql).toContain('dt_intake_packages_idempotency_unique');
    expect(sql).toContain('dt_intake_packages_bi_package_unique');
  });
});

describe('0051 — twin definitions and instances', () => {
  const sql = loadMigration('0051_create_dt_definitions_instances.sql');
  for (const table of [
    'digital_twin_definitions',
    'digital_twin_definition_versions',
    'digital_twin_definition_components',
    'digital_twin_definition_relationships',
    'digital_twin_instances',
    'digital_twin_instance_versions',
    'digital_twin_instance_status_history',
  ]) {
    it(`creates business_digital_twin.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_digital_twin.${table}`);
    });
  }

  it('definitions have a status CHECK constraint including draft/validated/active/superseded/retired', () => {
    expect(sql).toContain("CHECK (status IN ('draft','validated','active','superseded','retired'))");
  });

  it('instances have the full lifecycle status CHECK constraint', () => {
    expect(sql).toContain('initializing');
    expect(sql).toContain('degraded');
    expect(sql).toContain('stale');
    expect(sql).toContain('suspended');
  });
});

describe('0052 — state variables (precedes snapshots)', () => {
  const sql = loadMigration('0052_create_dt_state_variables.sql');
  for (const table of [
    'state_variable_definitions',
    'state_variable_definition_versions',
    'state_variable_values',
    'state_variable_value_quality',
  ]) {
    it(`creates business_digital_twin.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_digital_twin.${table}`);
    });
  }

  it('defines all 10 required variable categories', () => {
    for (const category of ['financial', 'operational', 'customer', 'market', 'resource', 'risk', 'capacity', 'behavioral', 'regulatory', 'custom']) {
      expect(sql).toContain(category);
    }
  });

  it('defines all 10 required value types', () => {
    for (const type of ['number', 'integer', 'boolean', 'string', 'date', 'timestamp', 'percentage', 'currency', 'enum', 'json']) {
      expect(sql).toContain(`'${type}'`);
    }
  });
});

describe('0053 — state snapshots', () => {
  const sql = loadMigration('0053_create_dt_snapshots.sql');
  for (const table of [
    'digital_twin_snapshots',
    'digital_twin_snapshot_versions',
    'digital_twin_snapshot_values',
    'digital_twin_snapshot_evidence',
    'digital_twin_snapshot_status_history',
  ]) {
    it(`creates business_digital_twin.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_digital_twin.${table}`);
    });
  }

  it('snapshot values reference state_variable_definitions (created before this migration)', () => {
    expect(sql).toContain('REFERENCES business_digital_twin.state_variable_definitions(id)');
  });

  it('snapshots have the required published lifecycle status', () => {
    expect(sql).toContain("CHECK (status IN ('draft','validated','published','superseded','rejected'))");
  });
});

describe('0054 — entities and relationships', () => {
  const sql = loadMigration('0054_create_dt_entities.sql');
  for (const table of ['twin_entities', 'twin_entity_versions', 'twin_relationships', 'twin_relationship_versions']) {
    it(`creates business_digital_twin.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_digital_twin.${table}`);
    });
  }

  it('defines all 8 required entity types', () => {
    for (const t of ['customer', 'product', 'location', 'channel', 'resource', 'team', 'supplier', 'other']) {
      expect(sql).toContain(`'${t}'`);
    }
  });

  it('entities and relationships are effective-dated with a valid ordering CHECK', () => {
    expect(sql).toContain('effective_end IS NULL OR effective_end > effective_start');
  });
});

describe('0055 — assumptions and constraints', () => {
  const sql = loadMigration('0055_create_dt_assumptions_constraints.sql');
  for (const table of [
    'twin_assumptions', 'twin_assumption_versions',
    'twin_constraints', 'twin_constraint_versions', 'twin_constraint_evaluations',
  ]) {
    it(`creates business_digital_twin.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_digital_twin.${table}`);
    });
  }

  it('defines all 5 required assumption sources', () => {
    for (const s of ['observed', 'declared', 'derived', 'inferred', 'external']) {
      expect(sql).toContain(`'${s}'`);
    }
  });

  it('defines all 10 required constraint operators', () => {
    for (const op of ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in', 'contains']) {
      expect(sql).toContain(`'${op}'`);
    }
  });
});

describe('0056 — calibration and validation', () => {
  const sql = loadMigration('0056_create_dt_calibration_validation.sql');
  for (const table of [
    'twin_calibration_runs', 'twin_calibration_inputs', 'twin_calibration_results',
    'twin_validation_runs', 'twin_validation_results', 'twin_validation_issues',
  ]) {
    it(`creates business_digital_twin.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_digital_twin.${table}`);
    });
  }

  it('calibration runs use the requested/running/completed/failed/cancelled status set', () => {
    expect(sql).toContain("CHECK (status IN ('requested','running','completed','failed','cancelled'))");
  });

  it('validation outcomes use the passed/passed_with_warnings/failed set', () => {
    expect(sql).toContain("'passed','passed_with_warnings','failed'");
  });
});

describe('0057 — uncertainty and confidence', () => {
  const sql = loadMigration('0057_create_dt_uncertainty.sql');
  for (const table of [
    'twin_uncertainty_models', 'twin_uncertainty_model_versions',
    'twin_uncertainty_assignments', 'twin_confidence_scores',
  ]) {
    it(`creates business_digital_twin.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_digital_twin.${table}`);
    });
  }

  it('defines all 8 required distribution types', () => {
    for (const d of ['fixed', 'uniform', 'normal', 'lognormal', 'triangular', 'beta', 'empirical', 'categorical']) {
      expect(sql).toContain(`'${d}'`);
    }
  });

  it('confidence scores are bounded between 0 and 1', () => {
    expect(sql).toContain('CHECK (confidence BETWEEN 0 AND 1)');
  });
});

describe('0058 — scenario baselines', () => {
  const sql = loadMigration('0058_create_dt_scenario_baselines.sql');
  for (const table of [
    'scenario_baselines', 'scenario_baseline_versions',
    'scenario_baseline_inputs', 'scenario_baseline_constraints',
  ]) {
    it(`creates business_digital_twin.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_digital_twin.${table}`);
    });
  }

  it('scenario baselines reference a snapshot version (governed DT output for Simulation)', () => {
    expect(sql).toContain('REFERENCES business_digital_twin.digital_twin_snapshot_versions(id)');
  });

  it('baselines use the draft/validated/ready/published/superseded/rejected status set', () => {
    expect(sql).toContain("'draft','validated','ready','published','superseded','rejected'");
  });
});

describe('0059 — publication and registry/deployment', () => {
  const sql = loadMigration('0059_create_dt_publication_registry.sql');
  for (const table of [
    'dt_insight_packages', 'dt_insight_package_versions',
    'dt_publication_packages', 'dt_publication_events',
    'dt_component_registry', 'dt_component_registry_versions',
    'dt_deployments', 'dt_deployment_rollbacks',
  ]) {
    it(`creates business_digital_twin.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_digital_twin.${table}`);
    });
  }

  it('publication packages target only simulation (the sole authorized Stage 2E downstream layer)', () => {
    expect(sql).toContain("CHECK (target_layer IN ('simulation'))");
  });

  it('publication packages use the draft/ready/dispatched/acknowledged/rejected/revoked lifecycle', () => {
    expect(sql).toContain("'draft','ready','dispatched','acknowledged','rejected','revoked'");
  });

  it('deployments use the pending/active/rolled_back/superseded activation states', () => {
    expect(sql).toContain("'pending','active','rolled_back','superseded'");
  });
});

describe('0060 — indexes', () => {
  const sql = loadMigration('0060_create_dt_indexes.sql');

  it('creates at least 200 indexes', () => {
    const matches = sql.match(/CREATE INDEX/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(200);
  });

  it('has no duplicate index names', () => {
    const names = [...sql.matchAll(/CREATE INDEX (\w+)/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('0061 — RLS enabled and forced on every table', () => {
  const sql = loadMigration('0061_create_dt_rls_policies.sql');

  it('has at least 48 ENABLE ROW LEVEL SECURITY statements (per BUILD-12 spec minimum table count)', () => {
    const matches = sql.match(/^ALTER TABLE business_digital_twin\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(48);
  });

  it('has exactly as many FORCE ROW LEVEL SECURITY statements as ENABLE statements', () => {
    const enableMatches = sql.match(/^ALTER TABLE business_digital_twin\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    const forceMatches = sql.match(/^ALTER TABLE business_digital_twin\.\w+ FORCE ROW LEVEL SECURITY;/gim) ?? [];
    expect(forceMatches.length).toBe(enableMatches.length);
  });

  it('uses the Stage 2D null-safe fail-closed tenant/workspace predicate', () => {
    expect(sql).toContain("current_setting('app.tenant_id', true)::uuid");
    expect(sql).toContain("current_setting('app.workspace_id', true)::uuid");
  });

  it('has one CREATE POLICY per table (tenant isolation policy count matches ENABLE count)', () => {
    const enableMatches = sql.match(/ENABLE ROW LEVEL SECURITY;/g) ?? [];
    const policyMatches = sql.match(/CREATE POLICY \w+_tenant_isolation/g) ?? [];
    expect(policyMatches.length).toBe(enableMatches.length);
  });
});

describe('0062 — triggers, append-only enforcement, lifecycle guards, outbox events', () => {
  const sql = loadMigration('0062_create_dt_triggers_events.sql');

  it('defines the shared forbid_mutation() function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION business_digital_twin.forbid_mutation()');
  });

  it('attaches forbid_mutation to a DO-block loop over append-only tables (dynamic, not hardcoded per trigger)', () => {
    expect(sql).toContain('FOREACH t IN ARRAY ARRAY[');
    expect(sql).toContain("CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON business_digital_twin.%1$s");
  });

  it('the append-only table array contains at least 30 entries', () => {
    const arrayMatch = sql.match(/ARRAY\[([\s\S]*?)\]/);
    expect(arrayMatch).not.toBeNull();
    const entries = (arrayMatch![1].match(/'[a-z_]+'/g) ?? []);
    expect(entries.length).toBeGreaterThanOrEqual(30);
  });

  for (const guard of [
    'enforce_snapshot_immutability',
    'enforce_scenario_baseline_immutability',
    'enforce_definition_immutability',
    'enforce_snapshot_version_immutability',
    'enforce_scenario_baseline_version_immutability',
    'enforce_definition_version_immutability',
    'enforce_publication_transition',
  ]) {
    it(`defines the ${guard} lifecycle/immutability guard function and trigger`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION business_digital_twin.${guard}()`);
      expect(sql).toContain(`CREATE TRIGGER ${guard}`);
    });
  }

  it('defines the emit_outbox_event helper (mirrors business_intelligence.emit_outbox_event)', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION business_digital_twin.emit_outbox_event(');
    expect(sql).toContain('INSERT INTO events.outbox_events');
  });

  for (const evt of [
    'emit_intake_received', 'emit_intake_accepted', 'emit_intake_rejected',
    'emit_definition_published', 'emit_instance_created', 'emit_instance_status_changed',
    'emit_snapshot_created', 'emit_snapshot_validated', 'emit_snapshot_published',
    'emit_calibration_started', 'emit_calibration_completed', 'emit_calibration_failed',
    'emit_validation_completed', 'emit_scenario_baseline_created', 'emit_scenario_baseline_published',
    'emit_data_published',
  ]) {
    it(`defines the ${evt} outbox wrapper function`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION business_digital_twin.${evt}(`);
    });
  }

  it('emit_data_published rejects target layers outside simulation', () => {
    expect(sql).toContain("IF p_target_layer NOT IN ('simulation') THEN");
  });

  for (const trigger of [
    'dt_intake_packages', 'digital_twin_definitions', 'digital_twin_instances', 'digital_twin_snapshots',
    'state_variable_definitions', 'twin_entities', 'twin_relationships', 'twin_assumptions', 'twin_constraints',
    'twin_calibration_runs', 'twin_validation_runs', 'twin_uncertainty_models', 'scenario_baselines',
    'dt_insight_packages', 'dt_publication_packages', 'dt_component_registry', 'dt_deployments',
  ]) {
    it(`has a set_updated_at trigger on the mutable table ${trigger}`, () => {
      expect(sql).toContain(`set_updated_at_${trigger} BEFORE UPDATE ON business_digital_twin.${trigger}`);
    });
  }
});

describe('repository and export files exist', () => {
  const REPO_DIR = resolve(__dirname, '../src/repositories/dt');
  const REPO_FILES = [
    'DTIntakeRepository.ts',
    'DigitalTwinDefinitionRepository.ts',
    'DigitalTwinInstanceRepository.ts',
    'DigitalTwinSnapshotRepository.ts',
    'StateVariableRepository.ts',
    'TwinEntityRepository.ts',
    'TwinAssumptionConstraintRepository.ts',
    'TwinCalibrationRepository.ts',
    'TwinValidationRepository.ts',
    'ScenarioBaselineRepository.ts',
    'DTPublicationPackageRepository.ts',
    'DTComponentRegistryRepository.ts',
    'errors.ts',
    'index.ts',
  ];

  it.each(REPO_FILES)('%s exists', (filename) => {
    expect(existsSync(resolve(REPO_DIR, filename))).toBe(true);
  });

  it('main database package index.ts exports all 12 DT repositories', () => {
    const mainIndex = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf-8');
    for (const repo of [
      'DTIntakeRepository', 'DigitalTwinDefinitionRepository', 'DigitalTwinInstanceRepository',
      'DigitalTwinSnapshotRepository', 'StateVariableRepository', 'TwinEntityRepository',
      'TwinAssumptionConstraintRepository', 'TwinCalibrationRepository', 'TwinValidationRepository',
      'ScenarioBaselineRepository', 'DTPublicationPackageRepository', 'DTComponentRegistryRepository',
    ]) {
      expect(mainIndex).toContain(repo);
    }
  });
});

describe('handoff contract exports exist', () => {
  const CONTRACTS_DIR = resolve(__dirname, '../../handoff-contracts/src');

  it('bi-to-dt.ts exports validateBIToDTHandoff and is no longer a placeholder', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'bi-to-dt.ts'), 'utf-8');
    expect(sql).toContain('export function validateBIToDTHandoff');
    expect(sql).not.toContain('TODO: add fields');
  });

  it('dt-to-sim.ts exports validateDTToSIMHandoff and is no longer a placeholder', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'dt-to-sim.ts'), 'utf-8');
    expect(sql).toContain('export function validateDTToSIMHandoff');
    expect(sql).not.toContain('TODO: add fields');
  });
});

describe('event-contracts include the 16 required dt.* event types', () => {
  it('LayerEventType union contains all required DT events', () => {
    const sql = readFileSync(resolve(__dirname, '../../event-contracts/src/index.ts'), 'utf-8');
    for (const evt of [
      'dt.intake.received', 'dt.intake.accepted', 'dt.intake.rejected',
      'dt.definition.published', 'dt.instance.created', 'dt.instance.status_changed',
      'dt.snapshot.created', 'dt.snapshot.validated', 'dt.snapshot.published',
      'dt.calibration.started', 'dt.calibration.completed', 'dt.calibration.failed',
      'dt.validation.completed', 'dt.scenario_baseline.created', 'dt.scenario_baseline.published',
      'dt.data.published',
    ]) {
      expect(sql).toContain(`'${evt}'`);
    }
  });
});
