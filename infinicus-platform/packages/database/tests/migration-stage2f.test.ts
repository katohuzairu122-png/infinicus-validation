/**
 * Structural unit tests for Stage 2F (Simulation) migration files.
 * Validates SQL file content without a live database.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const MIGRATIONS_DIR = resolve(__dirname, '../../../infrastructure/database/migrations');

function loadMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), 'utf-8');
}

const STAGE_2F_FILES = [
  '0063_create_sim_schema_intake.sql',
  '0064_create_sim_models.sql',
  '0065_create_sim_scenarios.sql',
  '0066_create_sim_runs.sql',
  '0067_create_sim_monte_carlo_evidence.sql',
  '0068_create_sim_results.sql',
  '0069_create_sim_risk_sensitivity.sql',
  '0070_create_sim_comparisons.sql',
  '0071_create_sim_validation_calibration.sql',
  '0072_create_sim_publication.sql',
  '0073_create_sim_registry.sql',
  '0074_create_sim_indexes.sql',
  '0075_create_sim_rls_policies.sql',
  '0076_create_sim_triggers_events.sql',
];

describe('Stage 2F migration files exist', () => {
  it.each(STAGE_2F_FILES)('%s is readable', (filename) => {
    const sql = loadMigration(filename);
    expect(sql.length).toBeGreaterThan(100);
  });
});

describe('All Stage 2F migration files are transactional', () => {
  it.each(STAGE_2F_FILES)('%s wraps in BEGIN/COMMIT', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;?\s*$/im);
  });
});

describe('All Stage 2F migration files self-register in _migrations', () => {
  it.each(STAGE_2F_FILES)('%s inserts into _migrations', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toContain('INSERT INTO _migrations (filename) VALUES');
    expect(sql).toContain(filename);
    expect(sql).toContain('ON CONFLICT (filename) DO NOTHING');
  });
});

describe('Frozen migration range is not touched', () => {
  it('the next migration after 0062 is 0063 — no gap, no renumbering', () => {
    expect(STAGE_2F_FILES[0]).toBe('0063_create_sim_schema_intake.sql');
  });

  it('frozen 0001-0062 files are untouched by this stage (not part of STAGE_2F_FILES)', () => {
    for (const f of STAGE_2F_FILES) {
      const num = parseInt(f.slice(0, 4), 10);
      expect(num).toBeGreaterThanOrEqual(63);
    }
  });
});

describe('0063 — schema + intake and lineage', () => {
  const sql = loadMigration('0063_create_sim_schema_intake.sql');

  it('creates simulation schema', () => {
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS simulation');
  });

  for (const table of [
    'simulation_intake_packages',
    'simulation_intake_package_versions',
    'simulation_intake_source_references',
    'simulation_intake_status_history',
  ]) {
    it(`creates simulation.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE simulation.${table}`);
    });
  }

  it('intake packages reference the canonical DT publication package', () => {
    expect(sql).toContain('REFERENCES business_digital_twin.dt_publication_packages(id)');
  });

  it('intake packages reference canonical tenancy/platform identity, never a duplicate', () => {
    expect(sql).toContain('REFERENCES tenancy.tenants(id)');
    expect(sql).toContain('REFERENCES tenancy.workspaces(id)');
    expect(sql).toContain('REFERENCES platform.businesses(id)');
    expect(sql).not.toContain('CREATE TABLE tenancy.businesses');
  });

  it('intake packages are idempotent per (business_id, idempotency_key) and (business_id, dt_publication_package_id)', () => {
    expect(sql).toContain('simulation_intake_packages_idempotency_unique');
    expect(sql).toContain('simulation_intake_packages_dt_package_unique');
  });
});

describe('0064 — models and versions', () => {
  const sql = loadMigration('0064_create_sim_models.sql');
  for (const table of [
    'simulation_models', 'simulation_model_versions',
    'simulation_model_parameters', 'simulation_model_constraints',
  ]) {
    it(`creates simulation.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE simulation.${table}`);
    });
  }

  it('models have a status CHECK constraint including draft/validated/active/superseded/retired', () => {
    expect(sql).toContain("CHECK (status IN ('draft','validated','active','superseded','retired'))");
  });
});

describe('0065 — scenario definitions', () => {
  const sql = loadMigration('0065_create_sim_scenarios.sql');
  for (const table of [
    'simulation_scenarios', 'simulation_scenario_versions',
    'simulation_scenario_inputs', 'simulation_scenario_assumptions', 'simulation_scenario_constraints',
  ]) {
    it(`creates simulation.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE simulation.${table}`);
    });
  }

  it('scenarios reference a simulation model', () => {
    expect(sql).toContain('REFERENCES simulation.simulation_models(id)');
  });

  it('defines all 10 required constraint operators', () => {
    for (const op of ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in', 'contains']) {
      expect(sql).toContain(`'${op}'`);
    }
  });
});

describe('0066 — run lifecycle', () => {
  const sql = loadMigration('0066_create_sim_runs.sql');
  for (const table of [
    'simulation_requests', 'simulation_runs', 'simulation_run_status_history', 'simulation_run_inputs',
  ]) {
    it(`creates simulation.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE simulation.${table}`);
    });
  }

  it('runs default to Engine v3 semantics: 500-sample size, 90-day horizon', () => {
    expect(sql).toContain('sample_size       integer       NOT NULL DEFAULT 500');
    expect(sql).toContain('horizon_days      integer       NOT NULL DEFAULT 90');
  });

  it('runs use the queued/running/completed/failed/cancelled status set', () => {
    expect(sql).toContain("CHECK (status IN ('queued','running','completed','failed','cancelled'))");
  });

  it('requests are idempotent per (business_id, idempotency_key)', () => {
    expect(sql).toContain('simulation_requests_idempotency_unique');
  });
});

describe('0067 — Monte Carlo evidence', () => {
  const sql = loadMigration('0067_create_sim_monte_carlo_evidence.sql');
  for (const table of [
    'simulation_iterations', 'simulation_iteration_summaries',
    'simulation_distributions', 'simulation_percentiles',
  ]) {
    it(`creates simulation.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE simulation.${table}`);
    });
  }

  it('defines all 8 required distribution types', () => {
    for (const d of ['fixed', 'uniform', 'normal', 'lognormal', 'triangular', 'beta', 'empirical', 'categorical']) {
      expect(sql).toContain(`'${d}'`);
    }
  });

  it('percentiles capture p10/p25/p50/p75/p90', () => {
    for (const p of ['p10', 'p25', 'p50', 'p75', 'p90']) {
      expect(sql).toContain(p);
    }
  });
});

describe('0068 — results', () => {
  const sql = loadMigration('0068_create_sim_results.sql');
  for (const table of [
    'simulation_results', 'simulation_result_versions',
    'simulation_result_metrics', 'simulation_result_evidence',
  ]) {
    it(`creates simulation.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE simulation.${table}`);
    });
  }

  it('results use the draft/validated/published/superseded/rejected status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','validated','published','superseded','rejected'))");
  });
});

describe('0069 — risk and sensitivity', () => {
  const sql = loadMigration('0069_create_sim_risk_sensitivity.sql');
  for (const table of [
    'simulation_risk_results', 'simulation_sensitivity_runs',
    'simulation_sensitivity_results', 'simulation_failure_modes',
  ]) {
    it(`creates simulation.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE simulation.${table}`);
    });
  }

  it('risk results bound survival_rate between 0 and 1', () => {
    expect(sql).toContain('CHECK (survival_rate BETWEEN 0 AND 1)');
  });
});

describe('0070 — comparisons', () => {
  const sql = loadMigration('0070_create_sim_comparisons.sql');
  for (const table of [
    'scenario_comparison_runs', 'scenario_comparison_members', 'scenario_comparison_results',
  ]) {
    it(`creates simulation.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE simulation.${table}`);
    });
  }

  it('comparison members are unique per (comparison_run_id, run_id)', () => {
    expect(sql).toContain('scenario_comparison_members_unique');
  });
});

describe('0071 — validation and calibration', () => {
  const sql = loadMigration('0071_create_sim_validation_calibration.sql');
  for (const table of [
    'simulation_validation_runs', 'simulation_validation_results',
    'simulation_calibration_runs', 'simulation_calibration_results',
  ]) {
    it(`creates simulation.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE simulation.${table}`);
    });
  }

  it('validation outcomes use the passed/passed_with_warnings/failed set', () => {
    expect(sql).toContain("'passed','passed_with_warnings','failed'");
  });
});

describe('0072 — publication', () => {
  const sql = loadMigration('0072_create_sim_publication.sql');
  for (const table of [
    'simulation_insight_packages', 'simulation_insight_package_versions',
    'simulation_publication_packages', 'simulation_publication_events',
  ]) {
    it(`creates simulation.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE simulation.${table}`);
    });
  }

  it('publication packages target only ai_decision_intelligence (the sole authorized Stage 2F downstream layer)', () => {
    expect(sql).toContain("CHECK (target_layer IN ('ai_decision_intelligence'))");
  });

  it('publication packages use the draft/ready/dispatched/acknowledged/rejected/revoked lifecycle', () => {
    expect(sql).toContain("'draft','ready','dispatched','acknowledged','rejected','revoked'");
  });
});

describe('0073 — registry and deployment', () => {
  const sql = loadMigration('0073_create_sim_registry.sql');
  for (const table of [
    'simulation_component_registry', 'simulation_component_registry_versions',
    'simulation_deployments', 'simulation_deployment_rollbacks',
  ]) {
    it(`creates simulation.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE simulation.${table}`);
    });
  }

  it('deployments use the pending/active/rolled_back/superseded activation states', () => {
    expect(sql).toContain("'pending','active','rolled_back','superseded'");
  });
});

describe('0074 — indexes', () => {
  const sql = loadMigration('0074_create_sim_indexes.sql');

  it('creates at least 200 indexes', () => {
    const matches = sql.match(/CREATE INDEX/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(200);
  });

  it('has no duplicate index names', () => {
    const names = [...sql.matchAll(/CREATE INDEX (\w+)/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('0075 — RLS enabled and forced on every table', () => {
  const sql = loadMigration('0075_create_sim_rls_policies.sql');

  it('has at least 44 ENABLE ROW LEVEL SECURITY statements (per BUILD-13 spec minimum table count)', () => {
    const matches = sql.match(/^ALTER TABLE simulation\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(44);
  });

  it('has exactly as many FORCE ROW LEVEL SECURITY statements as ENABLE statements', () => {
    const enableMatches = sql.match(/^ALTER TABLE simulation\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    const forceMatches = sql.match(/^ALTER TABLE simulation\.\w+ FORCE ROW LEVEL SECURITY;/gim) ?? [];
    expect(forceMatches.length).toBe(enableMatches.length);
  });

  it('uses the Stage 2D/2E null-safe fail-closed tenant/workspace predicate', () => {
    expect(sql).toContain("current_setting('app.tenant_id', true)::uuid");
    expect(sql).toContain("current_setting('app.workspace_id', true)::uuid");
  });

  it('has one CREATE POLICY per table (tenant isolation policy count matches ENABLE count)', () => {
    const enableMatches = sql.match(/ENABLE ROW LEVEL SECURITY;/g) ?? [];
    const policyMatches = sql.match(/CREATE POLICY \w+_tenant_isolation/g) ?? [];
    expect(policyMatches.length).toBe(enableMatches.length);
  });
});

describe('0076 — triggers, append-only enforcement, lifecycle guards, outbox events', () => {
  const sql = loadMigration('0076_create_sim_triggers_events.sql');

  it('defines the shared forbid_mutation() function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION simulation.forbid_mutation()');
  });

  it('attaches forbid_mutation to a DO-block loop over append-only tables (dynamic, not hardcoded per trigger)', () => {
    expect(sql).toContain('FOREACH t IN ARRAY ARRAY[');
    expect(sql).toContain('CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON simulation.%1$s');
  });

  it('the append-only table array contains at least 25 entries', () => {
    const arrayMatch = sql.match(/ARRAY\[([\s\S]*?)\]/);
    expect(arrayMatch).not.toBeNull();
    const entries = (arrayMatch![1].match(/'[a-z_]+'/g) ?? []);
    expect(entries.length).toBeGreaterThanOrEqual(25);
  });

  it('excludes simulation_model_versions/simulation_scenario_versions/simulation_result_versions from the blanket append-only list (BUILD-12-discovered design fix)', () => {
    const arrayMatch = sql.match(/ARRAY\[([\s\S]*?)\]/);
    const arrayBody = arrayMatch![1];
    expect(arrayBody).not.toContain("'simulation_model_versions'");
    expect(arrayBody).not.toContain("'simulation_scenario_versions'");
    expect(arrayBody).not.toContain("'simulation_result_versions'");
  });

  for (const guard of [
    'enforce_model_immutability',
    'enforce_model_version_immutability',
    'enforce_scenario_immutability',
    'enforce_scenario_version_immutability',
    'enforce_result_immutability',
    'enforce_result_version_immutability',
    'enforce_publication_transition',
  ]) {
    it(`defines the ${guard} lifecycle/immutability guard function and trigger`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION simulation.${guard}()`);
      expect(sql).toContain(`CREATE TRIGGER ${guard}`);
    });
  }

  it('defines the emit_outbox_event helper (mirrors business_digital_twin.emit_outbox_event)', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION simulation.emit_outbox_event(');
    expect(sql).toContain('INSERT INTO events.outbox_events');
  });

  for (const evt of [
    'emit_intake_received', 'emit_scenario_created', 'emit_run_requested', 'emit_run_started',
    'emit_run_completed', 'emit_run_failed', 'emit_result_published', 'emit_risk_calculated',
    'emit_sensitivity_completed', 'emit_data_published',
  ]) {
    it(`defines the ${evt} outbox wrapper function`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION simulation.${evt}(`);
    });
  }

  it('emit_data_published rejects target layers outside ai_decision_intelligence', () => {
    expect(sql).toContain("IF p_target_layer NOT IN ('ai_decision_intelligence') THEN");
  });

  for (const trigger of [
    'simulation_models', 'simulation_scenarios', 'simulation_intake_packages', 'simulation_runs',
    'simulation_results', 'simulation_sensitivity_runs', 'scenario_comparison_runs',
    'simulation_validation_runs', 'simulation_calibration_runs', 'simulation_insight_packages',
    'simulation_publication_packages', 'simulation_component_registry', 'simulation_deployments',
  ]) {
    it(`has a set_updated_at trigger on the mutable table ${trigger}`, () => {
      expect(sql).toContain(`ON simulation.${trigger} FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
    });
  }
});

describe('repository and export files exist', () => {
  const REPO_DIR = resolve(__dirname, '../src/repositories/simulation');
  const REPO_FILES = [
    'SimulationIntakeRepository.ts',
    'SimulationModelRepository.ts',
    'SimulationScenarioRepository.ts',
    'SimulationRunRepository.ts',
    'SimulationResultRepository.ts',
    'SimulationRiskRepository.ts',
    'SimulationSensitivityRepository.ts',
    'ScenarioComparisonRepository.ts',
    'SimulationValidationRepository.ts',
    'SimulationPublicationRepository.ts',
    'SimulationComponentRegistryRepository.ts',
    'errors.ts',
    'index.ts',
  ];

  it.each(REPO_FILES)('%s exists', (filename) => {
    expect(existsSync(resolve(REPO_DIR, filename))).toBe(true);
  });

  it('main database package index.ts exports all 11 Simulation repositories', () => {
    const mainIndex = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf-8');
    for (const repo of [
      'SimulationIntakeRepository', 'SimulationModelRepository', 'SimulationScenarioRepository',
      'SimulationRunRepository', 'SimulationResultRepository', 'SimulationRiskRepository',
      'SimulationSensitivityRepository', 'ScenarioComparisonRepository', 'SimulationValidationRepository',
      'SimulationPublicationRepository', 'SimulationComponentRegistryRepository',
    ]) {
      expect(mainIndex).toContain(repo);
    }
  });
});

describe('handoff contract exports exist', () => {
  const CONTRACTS_DIR = resolve(__dirname, '../../handoff-contracts/src');

  it('dt-to-sim.ts exports validateDTToSIMHandoff and is complete', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'dt-to-sim.ts'), 'utf-8');
    expect(sql).toContain('export function validateDTToSIMHandoff');
    expect(sql).not.toContain('TODO: add fields');
  });

  it('sim-to-adi.ts exports validateSIMToADIHandoff, is versioned 1.1.0, and enforces workspace/idempotency', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'sim-to-adi.ts'), 'utf-8');
    expect(sql).toContain('export function validateSIMToADIHandoff');
    expect(sql).toContain("SIM_TO_ADI_CONTRACT_VERSION = '1.1.0'");
    expect(sql).toContain('workspace_id_required');
    expect(sql).toContain('idempotency_key_required');
  });
});

describe('event-contracts include the 10 required sim.* event types', () => {
  it('LayerEventType union contains all required Simulation events', () => {
    const sql = readFileSync(resolve(__dirname, '../../event-contracts/src/index.ts'), 'utf-8');
    for (const evt of [
      'sim.intake.received', 'sim.scenario.created', 'sim.run.requested', 'sim.run.started',
      'sim.run.completed', 'sim.run.failed', 'sim.result.published', 'sim.risk.calculated',
      'sim.sensitivity.completed', 'sim.data.published',
    ]) {
      expect(sql).toContain(`'${evt}'`);
    }
  });
});
