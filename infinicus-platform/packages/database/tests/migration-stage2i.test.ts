/**
 * Structural unit tests for Stage 2I (Outcome Monitoring) migration
 * files. Validates SQL file content without a live database.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const MIGRATIONS_DIR = resolve(__dirname, '../../../infrastructure/database/migrations');

function loadMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), 'utf-8');
}

const STAGE_2I_FILES = [
  '0107_create_om_schema_intake.sql',
  '0108_create_om_monitoring_plans.sql',
  '0109_create_om_action_tracking.sql',
  '0110_create_om_outcome_observations.sql',
  '0111_create_om_targets_thresholds.sql',
  '0112_create_om_variance.sql',
  '0113_create_om_alerts_incidents.sql',
  '0114_create_om_attribution.sql',
  '0115_create_om_reviews.sql',
  '0116_create_om_feedback_packages.sql',
  '0117_create_om_publication.sql',
  '0118_create_om_registry.sql',
  '0119_create_om_indexes.sql',
  '0120_create_om_rls_policies.sql',
  '0121_create_om_triggers_events.sql',
];

describe('Stage 2I migration files exist', () => {
  it.each(STAGE_2I_FILES)('%s is readable', (filename) => {
    const sql = loadMigration(filename);
    expect(sql.length).toBeGreaterThan(100);
  });
});

describe('All Stage 2I migration files are transactional', () => {
  it.each(STAGE_2I_FILES)('%s wraps in BEGIN/COMMIT', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;?\s*$/im);
  });
});

describe('All Stage 2I migration files self-register in _migrations', () => {
  it.each(STAGE_2I_FILES)('%s inserts into _migrations', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toContain('INSERT INTO _migrations (filename) VALUES');
    expect(sql).toContain(filename);
    expect(sql).toContain('ON CONFLICT (filename) DO NOTHING');
  });
});

describe('Frozen migration range is not touched', () => {
  it('the next migration after 0106 is 0107 — no gap, no renumbering', () => {
    expect(STAGE_2I_FILES[0]).toBe('0107_create_om_schema_intake.sql');
  });

  it('frozen 0001-0106 files are untouched by this stage (not part of STAGE_2I_FILES)', () => {
    for (const f of STAGE_2I_FILES) {
      const num = parseInt(f.slice(0, 4), 10);
      expect(num).toBeGreaterThanOrEqual(107);
    }
  });
});

describe('0107 — schema + intake and lineage (Group A)', () => {
  const sql = loadMigration('0107_create_om_schema_intake.sql');

  it('creates outcome_monitoring schema', () => {
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS outcome_monitoring');
  });

  for (const table of [
    'om_intake_packages',
    'om_intake_package_versions',
    'om_intake_source_references',
    'om_intake_status_history',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('intake packages reference the canonical ABA publication package', () => {
    expect(sql).toContain('REFERENCES approved_business_action.aba_publication_packages(id)');
  });

  it('intake packages reference canonical tenancy/platform identity, never a duplicate', () => {
    expect(sql).toContain('REFERENCES tenancy.tenants(id)');
    expect(sql).toContain('REFERENCES tenancy.workspaces(id)');
    expect(sql).toContain('REFERENCES platform.businesses(id)');
    expect(sql).not.toContain('CREATE TABLE tenancy.businesses');
  });

  it('intake packages are idempotent per (business_id, idempotency_key) and (business_id, aba_publication_package_id)', () => {
    expect(sql).toContain('om_intake_packages_idempotency_unique');
    expect(sql).toContain('om_intake_packages_aba_package_unique');
  });

  it('intake packages use the received/validated/accepted/processing/completed/rejected/failed status set', () => {
    expect(sql).toContain("CHECK (status IN (");
    expect(sql).toContain("'received','validated','accepted','processing','completed','rejected','failed'");
  });
});

describe('0108 — monitoring plans (Group B)', () => {
  const sql = loadMigration('0108_create_om_monitoring_plans.sql');
  for (const table of [
    'monitoring_plans', 'monitoring_plan_versions', 'monitoring_plan_metrics', 'monitoring_plan_schedules',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('plans use the draft/active/completed/cancelled status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','active','completed','cancelled'))");
  });

  it('schedules use the one_time/recurring schedule_type enum', () => {
    expect(sql).toContain("CHECK (schedule_type IN ('one_time','recurring'))");
  });

  it('plans are unique per (business_id, plan_code)', () => {
    expect(sql).toContain('monitoring_plans_code_unique');
  });
});

describe('0109 — action tracking (Group C)', () => {
  const sql = loadMigration('0109_create_om_action_tracking.sql');
  for (const table of [
    'monitored_actions', 'monitored_action_versions', 'monitored_action_status_history', 'action_execution_observations',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('monitored actions reference the canonical ABA approved action, never a duplicate', () => {
    expect(sql).toContain('REFERENCES approved_business_action.approved_actions(id)');
  });

  it('monitored actions use the pending/in_progress/completed/cancelled status set', () => {
    expect(sql).toContain("CHECK (status IN ('pending','in_progress','completed','cancelled'))");
  });

  it('documents that execution observations are never a record of having executed anything', () => {
    expect(sql).toContain('never itself a record of having executed anything');
    expect(sql).toContain('Execution authority is not held by this database stage');
  });
});

describe('0110 — outcome observations (Group D)', () => {
  const sql = loadMigration('0110_create_om_outcome_observations.sql');
  for (const table of [
    'outcome_observations', 'outcome_observation_versions', 'outcome_measurements', 'outcome_evidence',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('observations use the draft/recorded/verified/disputed/superseded status set', () => {
    expect(sql).toContain("'draft','recorded','verified','disputed','superseded'");
  });

  it('observation_versions carries its own independent status column (BUILD-12/13/14/15-established design fix)', () => {
    const versionsBlock = sql.slice(sql.indexOf('CREATE TABLE outcome_monitoring.outcome_observation_versions'));
    expect(versionsBlock).toMatch(/status\s+text\s+NOT NULL DEFAULT 'draft'/);
  });

  it('documents that this is where OM exercises observation authority and recorded observations are permanently immutable', () => {
    expect(sql).toContain('OM exercises its observation authority');
    expect(sql).toContain('permanently immutable');
  });

  it('documents that observed outcomes are preserved separately and never silently rewrite an earlier decision', () => {
    expect(sql).toContain('preserved separately from expected outcomes');
    expect(sql).toContain('never a silent rewrite of an earlier decision');
  });

  it('observations are unique per (business_id, observation_code)', () => {
    expect(sql).toContain('outcome_observations_code_unique');
  });
});

describe('0111 — targets and thresholds (Group E)', () => {
  const sql = loadMigration('0111_create_om_targets_thresholds.sql');
  for (const table of [
    'outcome_targets', 'outcome_target_versions', 'outcome_thresholds', 'threshold_breaches',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('targets use the draft/active/retired status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','active','retired'))");
  });

  it('defines all 10 required threshold operators', () => {
    for (const op of ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in', 'contains']) {
      expect(sql).toContain(`'${op}'`);
    }
  });

  it('breaches reference the observation that triggered them', () => {
    expect(sql).toContain('REFERENCES outcome_monitoring.outcome_observations(id)');
  });
});

describe('0112 — variance (Group F)', () => {
  const sql = loadMigration('0112_create_om_variance.sql');
  for (const table of [
    'outcome_variance_runs', 'outcome_variance_results', 'expected_actual_comparisons', 'variance_explanations',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('variance runs use the queued/running/completed/failed status set', () => {
    expect(sql).toContain("CHECK (status IN ('queued','running','completed','failed'))");
  });

  it('comparisons carry paired expected and actual values', () => {
    expect(sql).toContain('expected_value');
    expect(sql).toContain('actual_value');
  });
});

describe('0113 — alerts and incidents (Group G)', () => {
  const sql = loadMigration('0113_create_om_alerts_incidents.sql');
  for (const table of [
    'monitoring_alert_rules', 'monitoring_alert_rule_versions', 'monitoring_alerts', 'monitoring_incidents',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('alerts use the raised/acknowledged/resolved/suppressed status set', () => {
    expect(sql).toContain("CHECK (status IN ('raised','acknowledged','resolved','suppressed'))");
  });

  it('incidents use the open/investigating/resolved/closed status set', () => {
    expect(sql).toContain("CHECK (status IN ('open','investigating','resolved','closed'))");
  });

  it('incidents reference the alert that opened them', () => {
    expect(sql).toContain('REFERENCES outcome_monitoring.monitoring_alerts(id)');
  });
});

describe('0114 — attribution (Group H)', () => {
  const sql = loadMigration('0114_create_om_attribution.sql');
  for (const table of [
    'outcome_attribution_runs', 'outcome_attribution_factors', 'outcome_attribution_results',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('attribution runs use the queued/running/completed/failed status set', () => {
    expect(sql).toContain("CHECK (status IN ('queued','running','completed','failed'))");
  });

  it('documents explicit attribution uncertainty', () => {
    expect(sql).toContain('attribution uncertainty');
  });

  it('results bound attributed_weight and uncertainty to [0,1]', () => {
    expect(sql).toContain('attributed_weight >= 0 AND attributed_weight <= 1');
    expect(sql).toContain('uncertainty >= 0 AND uncertainty <= 1');
  });
});

describe('0115 — reviews (Group I)', () => {
  const sql = loadMigration('0115_create_om_reviews.sql');
  for (const table of [
    'outcome_reviews', 'outcome_review_findings', 'outcome_review_actions', 'outcome_review_status_history',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('reviews use the draft/in_review/completed/cancelled status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','in_review','completed','cancelled'))");
  });

  it('reviews are unique per (business_id, review_code)', () => {
    expect(sql).toContain('outcome_reviews_code_unique');
  });

  it('has no stray unescaped apostrophe inside COMMENT ON TABLE strings (BUILD-13/14/15 lesson)', () => {
    const commentBlocks = [...sql.matchAll(/COMMENT ON TABLE[^\n]*\n\s*'(.*?)';/gs)];
    for (const m of commentBlocks) {
      expect(m[1]).not.toMatch(/'/);
    }
  });
});

describe('0116 — feedback packages (Group J)', () => {
  const sql = loadMigration('0116_create_om_feedback_packages.sql');
  for (const table of [
    'learning_feedback_packages', 'learning_feedback_package_versions', 'learning_feedback_evidence',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('feedback packages use the draft/ready/published status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','ready','published'))");
  });

  it('feedback packages are unique per (business_id, package_code)', () => {
    expect(sql).toContain('learning_feedback_packages_code_unique');
  });
});

describe('0117 — publication (Group K)', () => {
  const sql = loadMigration('0117_create_om_publication.sql');
  for (const table of [
    'om_publication_packages', 'om_publication_package_versions', 'om_publication_events',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('publication packages target only continuous_learning (the sole authorized Stage 2I downstream layer)', () => {
    expect(sql).toContain("CHECK (target_layer IN ('continuous_learning'))");
  });

  it('publication packages use the draft/ready/dispatched/acknowledged/rejected/revoked lifecycle', () => {
    expect(sql).toContain("'draft','ready','dispatched','acknowledged','rejected','revoked'");
  });

  it('publication packages are idempotent per (business_id, idempotency_key)', () => {
    expect(sql).toContain('om_publication_packages_idempotency_unique');
  });
});

describe('0118 — registry and deployment (Group L)', () => {
  const sql = loadMigration('0118_create_om_registry.sql');
  for (const table of [
    'om_component_registry', 'om_component_registry_versions', 'om_deployments', 'om_deployment_rollbacks',
  ]) {
    it(`creates outcome_monitoring.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE outcome_monitoring.${table}`);
    });
  }

  it('deployments use the pending/active/rolled_back/superseded activation states', () => {
    expect(sql).toContain("'pending','active','rolled_back','superseded'");
  });
});

describe('0119 — indexes', () => {
  const sql = loadMigration('0119_create_om_indexes.sql');

  it('creates at least 200 indexes', () => {
    const matches = sql.match(/CREATE INDEX/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(200);
  });

  it('has no duplicate index names', () => {
    const names = [...sql.matchAll(/CREATE INDEX (\w+)/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('0120 — RLS enabled and forced on every table', () => {
  const sql = loadMigration('0120_create_om_rls_policies.sql');

  it('has at least 45 ENABLE ROW LEVEL SECURITY statements (per BUILD-16 spec minimum table count)', () => {
    const matches = sql.match(/^ALTER TABLE outcome_monitoring\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(45);
  });

  it('has exactly as many FORCE ROW LEVEL SECURITY statements as ENABLE statements', () => {
    const enableMatches = sql.match(/^ALTER TABLE outcome_monitoring\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    const forceMatches = sql.match(/^ALTER TABLE outcome_monitoring\.\w+ FORCE ROW LEVEL SECURITY;/gim) ?? [];
    expect(forceMatches.length).toBe(enableMatches.length);
  });

  it('uses the Stage 2D/2E/2F/2G/2H null-safe fail-closed tenant/workspace predicate', () => {
    expect(sql).toContain("current_setting('app.tenant_id', true)::uuid");
    expect(sql).toContain("current_setting('app.workspace_id', true)::uuid");
  });

  it('has one CREATE POLICY per table (tenant isolation policy count matches ENABLE count)', () => {
    const enableMatches = sql.match(/ENABLE ROW LEVEL SECURITY;/g) ?? [];
    const policyMatches = sql.match(/CREATE POLICY \w+_tenant_isolation/g) ?? [];
    expect(policyMatches.length).toBe(enableMatches.length);
  });
});

describe('0121 — triggers, append-only enforcement, lifecycle guards, outbox events', () => {
  const sql = loadMigration('0121_create_om_triggers_events.sql');

  it('defines the shared forbid_mutation() function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION outcome_monitoring.forbid_mutation()');
  });

  it('attaches forbid_mutation to a DO-block loop over append-only tables (dynamic, not hardcoded per trigger)', () => {
    expect(sql).toContain('FOREACH t IN ARRAY ARRAY[');
    expect(sql).toContain('CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON outcome_monitoring.%1$s');
  });

  it('the append-only table array contains at least 25 entries', () => {
    const arrayMatch = sql.match(/ARRAY\[([\s\S]*?)\]/);
    expect(arrayMatch).not.toBeNull();
    const entries = (arrayMatch![1].match(/'[a-z_]+'/g) ?? []);
    expect(entries.length).toBeGreaterThanOrEqual(25);
  });

  it('excludes outcome_observation_versions from the blanket append-only list (BUILD-12/13/14/15-established design fix)', () => {
    const arrayMatch = sql.match(/ARRAY\[([\s\S]*?)\]/);
    const arrayBody = arrayMatch![1];
    expect(arrayBody).not.toContain("'outcome_observation_versions'");
  });

  for (const guard of [
    'enforce_observation_immutability',
    'enforce_observation_version_immutability',
    'enforce_publication_transition',
  ]) {
    it(`defines the ${guard} lifecycle/immutability guard function and trigger`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION outcome_monitoring.${guard}()`);
      expect(sql).toContain(`CREATE TRIGGER ${guard}`);
    });
  }

  it('defines the emit_outbox_event helper (mirrors approved_business_action.emit_outbox_event)', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION outcome_monitoring.emit_outbox_event(');
    expect(sql).toContain('INSERT INTO events.outbox_events');
  });

  for (const evt of [
    'emit_intake_received', 'emit_monitoring_started', 'emit_observation_recorded', 'emit_target_breached',
    'emit_variance_calculated', 'emit_alert_raised', 'emit_incident_opened', 'emit_review_completed',
    'emit_feedback_published', 'emit_data_published',
  ]) {
    it(`defines the ${evt} outbox wrapper function`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION outcome_monitoring.${evt}(`);
    });
  }

  it('emit_data_published rejects target layers outside continuous_learning', () => {
    expect(sql).toContain("IF p_target_layer NOT IN ('continuous_learning') THEN");
  });

  for (const trigger of [
    'om_intake_packages', 'monitoring_plans', 'monitored_actions', 'outcome_observations', 'outcome_targets',
    'outcome_variance_runs', 'monitoring_alert_rules', 'monitoring_alerts', 'monitoring_incidents',
    'outcome_attribution_runs', 'outcome_reviews', 'learning_feedback_packages', 'om_publication_packages',
    'om_component_registry', 'om_deployments',
  ]) {
    it(`has a set_updated_at trigger on the mutable table ${trigger}`, () => {
      expect(sql).toContain(`ON outcome_monitoring.${trigger} FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
    });
  }
});

describe('repository and export files exist', () => {
  const REPO_DIR = resolve(__dirname, '../src/repositories/om');
  const REPO_FILES = [
    'OMIntakeRepository.ts',
    'MonitoringPlanRepository.ts',
    'MonitoredActionRepository.ts',
    'OutcomeObservationRepository.ts',
    'OutcomeTargetRepository.ts',
    'OutcomeVarianceRepository.ts',
    'MonitoringAlertRepository.ts',
    'MonitoringIncidentRepository.ts',
    'OutcomeAttributionRepository.ts',
    'OutcomeReviewRepository.ts',
    'LearningFeedbackPackageRepository.ts',
    'OMPublicationRepository.ts',
    'OMComponentRegistryRepository.ts',
    'errors.ts',
    'index.ts',
  ];

  it.each(REPO_FILES)('%s exists', (filename) => {
    expect(existsSync(resolve(REPO_DIR, filename))).toBe(true);
  });

  it('main database package index.ts exports all 13 OM repositories', () => {
    const mainIndex = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf-8');
    for (const repo of [
      'OMIntakeRepository', 'MonitoringPlanRepository', 'MonitoredActionRepository', 'OutcomeObservationRepository',
      'OutcomeTargetRepository', 'OutcomeVarianceRepository', 'MonitoringAlertRepository', 'MonitoringIncidentRepository',
      'OutcomeAttributionRepository', 'OutcomeReviewRepository', 'LearningFeedbackPackageRepository',
      'OMPublicationRepository', 'OMComponentRegistryRepository',
    ]) {
      expect(mainIndex).toContain(repo);
    }
  });
});

describe('handoff contract exports exist', () => {
  const CONTRACTS_DIR = resolve(__dirname, '../../handoff-contracts/src');

  it('aba-to-om.ts remains complete and unchanged in version (BUILD-15 already satisfies BUILD-16 §6)', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'aba-to-om.ts'), 'utf-8');
    expect(sql).toContain('export function validateABAToOMHandoff');
    expect(sql).toContain("ABA_TO_OM_CONTRACT_VERSION = '1.0.0'");
  });

  it('om-to-cl.ts exports validateOMToCLHandoff, is versioned 1.0.0, and is complete', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'om-to-cl.ts'), 'utf-8');
    expect(sql).toContain('export function validateOMToCLHandoff');
    expect(sql).toContain("OM_TO_CL_CONTRACT_VERSION = '1.0.0'");
    expect(sql).not.toContain('TODO: add fields');
  });

  it('om-to-cl.ts enforces the authority boundary via forbidden fields', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'om-to-cl.ts'), 'utf-8');
    for (const field of ['learningUpdate', 'modelUpdate', 'policyUpdate', 'decisionOverride', 'executionResult']) {
      expect(sql).toContain(`'${field}'`);
    }
  });

  it('om-to-cl.ts restricts target layer to continuous_learning', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'om-to-cl.ts'), 'utf-8');
    expect(sql).toContain("CL_REQUIRED_TARGET_LAYER = 'continuous_learning'");
  });

  it('om-to-cl.ts only accepts a finalized (ready) feedback package', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'om-to-cl.ts'), 'utf-8');
    expect(sql).toContain("READY_FEEDBACK_STATUSES = ['ready']");
  });
});

describe('event-contracts include the 10 required om.* event types', () => {
  it('LayerEventType union contains all required OM events', () => {
    const sql = readFileSync(resolve(__dirname, '../../event-contracts/src/index.ts'), 'utf-8');
    for (const evt of [
      'om.intake.received', 'om.monitoring.started', 'om.observation.recorded', 'om.target.breached',
      'om.variance.calculated', 'om.alert.raised', 'om.incident.opened', 'om.review.completed',
      'om.feedback.published', 'om.data.published',
    ]) {
      expect(sql).toContain(`'${evt}'`);
    }
  });
});
