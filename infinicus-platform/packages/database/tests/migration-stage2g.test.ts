/**
 * Structural unit tests for Stage 2G (AI Decision Intelligence) migration files.
 * Validates SQL file content without a live database.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const MIGRATIONS_DIR = resolve(__dirname, '../../../infrastructure/database/migrations');

function loadMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), 'utf-8');
}

const STAGE_2G_FILES = [
  '0077_create_adi_schema_intake.sql',
  '0078_create_adi_decision_questions.sql',
  '0079_create_adi_decision_cases.sql',
  '0080_create_adi_reasoning_runs.sql',
  '0081_create_adi_decision_evidence.sql',
  '0082_create_adi_decision_alternatives.sql',
  '0083_create_adi_decision_recommendations.sql',
  '0084_create_adi_confidence_limitations.sql',
  '0085_create_adi_policies_governance.sql',
  '0086_create_adi_monitoring_requirements.sql',
  '0087_create_adi_publication.sql',
  '0088_create_adi_registry.sql',
  '0089_create_adi_indexes.sql',
  '0090_create_adi_rls_policies.sql',
  '0091_create_adi_triggers_events.sql',
];

describe('Stage 2G migration files exist', () => {
  it.each(STAGE_2G_FILES)('%s is readable', (filename) => {
    const sql = loadMigration(filename);
    expect(sql.length).toBeGreaterThan(100);
  });
});

describe('All Stage 2G migration files are transactional', () => {
  it.each(STAGE_2G_FILES)('%s wraps in BEGIN/COMMIT', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;?\s*$/im);
  });
});

describe('All Stage 2G migration files self-register in _migrations', () => {
  it.each(STAGE_2G_FILES)('%s inserts into _migrations', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toContain('INSERT INTO _migrations (filename) VALUES');
    expect(sql).toContain(filename);
    expect(sql).toContain('ON CONFLICT (filename) DO NOTHING');
  });
});

describe('Frozen migration range is not touched', () => {
  it('the next migration after 0076 is 0077 — no gap, no renumbering', () => {
    expect(STAGE_2G_FILES[0]).toBe('0077_create_adi_schema_intake.sql');
  });

  it('frozen 0001-0076 files are untouched by this stage (not part of STAGE_2G_FILES)', () => {
    for (const f of STAGE_2G_FILES) {
      const num = parseInt(f.slice(0, 4), 10);
      expect(num).toBeGreaterThanOrEqual(77);
    }
  });
});

describe('0077 — schema + intake and lineage (Group A)', () => {
  const sql = loadMigration('0077_create_adi_schema_intake.sql');

  it('creates ai_decision_intelligence schema', () => {
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS ai_decision_intelligence');
  });

  for (const table of [
    'adi_intake_packages',
    'adi_intake_package_versions',
    'adi_intake_source_references',
    'adi_intake_status_history',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('intake packages reference the canonical Simulation publication package', () => {
    expect(sql).toContain('REFERENCES simulation.simulation_publication_packages(id)');
  });

  it('intake packages reference canonical tenancy/platform identity, never a duplicate', () => {
    expect(sql).toContain('REFERENCES tenancy.tenants(id)');
    expect(sql).toContain('REFERENCES tenancy.workspaces(id)');
    expect(sql).toContain('REFERENCES platform.businesses(id)');
    expect(sql).not.toContain('CREATE TABLE tenancy.businesses');
  });

  it('intake packages are idempotent per (business_id, idempotency_key) and (business_id, simulation_publication_package_id)', () => {
    expect(sql).toContain('adi_intake_packages_idempotency_unique');
    expect(sql).toContain('adi_intake_packages_sim_package_unique');
  });

  it('intake packages use the received/validated/accepted/processing/completed/rejected/failed status set', () => {
    expect(sql).toContain("CHECK (status IN (");
    expect(sql).toContain("'received','validated','accepted','processing','completed','rejected','failed'");
  });
});

describe('0078 — decision questions (Group B)', () => {
  const sql = loadMigration('0078_create_adi_decision_questions.sql');
  for (const table of [
    'decision_questions', 'decision_question_versions', 'decision_objectives', 'decision_constraints',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('questions have a status CHECK constraint including draft/validated/active/superseded/retired', () => {
    expect(sql).toContain("CHECK (status IN ('draft','validated','active','superseded','retired'))");
  });

  it('defines all 10 required constraint operators', () => {
    for (const op of ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in', 'contains']) {
      expect(sql).toContain(`'${op}'`);
    }
  });

  it('objectives bound weight between 0 and 1', () => {
    expect(sql).toContain('weight BETWEEN 0 AND 1');
  });
});

describe('0079 — decision cases (Group C)', () => {
  const sql = loadMigration('0079_create_adi_decision_cases.sql');
  for (const table of [
    'decision_cases', 'decision_case_versions', 'decision_case_status_history', 'decision_case_inputs',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('cases reference a decision question', () => {
    expect(sql).toContain('REFERENCES ai_decision_intelligence.decision_questions(id)');
  });

  it('cases optionally reference the originating ADI intake package', () => {
    expect(sql).toContain('REFERENCES ai_decision_intelligence.adi_intake_packages(id)');
  });

  it('cases use the 7-value open/reasoning/evidence_gathered/alternatives_generated/recommended/closed/cancelled status set', () => {
    expect(sql).toContain("'open','reasoning','evidence_gathered','alternatives_generated','recommended','closed','cancelled'");
  });

  it('documents the authority boundary: ADI evaluates and recommends, never approves or executes', () => {
    expect(sql).toContain('ADI evaluates and recommends');
    expect(sql).toContain('never approves or executes');
  });

  it('cases are unique per (business_id, case_code)', () => {
    expect(sql).toContain('decision_cases_code_unique');
  });
});

describe('0080 — reasoning runs (Group D)', () => {
  const sql = loadMigration('0080_create_adi_reasoning_runs.sql');
  for (const table of [
    'reasoning_requests', 'reasoning_runs', 'reasoning_run_steps', 'reasoning_run_status_history',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('requests are idempotent per (business_id, idempotency_key)', () => {
    expect(sql).toContain('reasoning_requests_idempotency_unique');
  });

  it('runs use the queued/running/completed/failed/cancelled status set', () => {
    expect(sql).toContain("CHECK (status IN ('queued','running','completed','failed','cancelled'))");
  });

  it('run steps use the governed step_type enum', () => {
    expect(sql).toContain("'evidence_review','alternative_generation','risk_assessment','confidence_calculation','policy_evaluation','other'");
  });

  it('documents that reasoning steps are structured summaries, never raw hidden chain-of-thought', () => {
    expect(sql).toContain('never raw hidden chain-of-thought');
  });

  it('run steps are unique per (reasoning_run_id, step_number)', () => {
    expect(sql).toContain('reasoning_run_steps_unique');
  });
});

describe('0081 — decision evidence (Group E)', () => {
  const sql = loadMigration('0081_create_adi_decision_evidence.sql');
  for (const table of [
    'decision_evidence', 'decision_evidence_versions', 'decision_evidence_links', 'decision_evidence_quality',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('evidence uses the governed evidence_type enum', () => {
    expect(sql).toContain("'simulation_result','digital_twin_snapshot','business_intelligence_finding','external','other'");
  });

  it('documents that evidence is never fabricated, only referenced', () => {
    expect(sql).toContain('Never fabricates upstream evidence');
  });

  it('evidence links use the alternative/recommendation/reasoning_step linked-entity enum', () => {
    expect(sql).toContain("'alternative','recommendation','reasoning_step'");
  });

  it('evidence links reference decision_evidence_versions (not the header) — matches decision_evidence_quality convention', () => {
    expect(sql).toContain('evidence_version_id   uuid          NOT NULL REFERENCES ai_decision_intelligence.decision_evidence_versions(id)');
  });

  it('evidence versions bound confidence between 0 and 1', () => {
    expect(sql).toContain('confidence BETWEEN 0 AND 1');
  });

  it('evidence is unique per (case_id, evidence_code)', () => {
    expect(sql).toContain('decision_evidence_code_unique');
  });
});

describe('0082 — decision alternatives (Group F)', () => {
  const sql = loadMigration('0082_create_adi_decision_alternatives.sql');
  for (const table of [
    'decision_alternatives', 'decision_alternative_versions', 'alternative_outcome_estimates', 'alternative_risk_profiles',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('alternatives have a status CHECK constraint including draft/validated/active/superseded/retired', () => {
    expect(sql).toContain("CHECK (status IN ('draft','validated','active','superseded','retired'))");
  });

  it('risk profiles use the low/medium/high/critical severity enum', () => {
    expect(sql).toContain("CHECK (severity IN ('low','medium','high','critical'))");
  });

  it('documents that outcome estimates never fabricate Simulation evidence', () => {
    expect(sql).toContain('never fabricated Simulation evidence');
  });
});

describe('0083 — decision recommendations (Group G)', () => {
  const sql = loadMigration('0083_create_adi_decision_recommendations.sql');
  for (const table of [
    'decision_recommendations', 'decision_recommendation_versions',
    'recommendation_rationales', 'recommendation_implementation_steps',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('recommendations use the draft/validated/published/superseded/rejected status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','validated','published','superseded','rejected'))");
  });

  it('recommendation_versions carries its own independent status column (BUILD-12/13-established design fix)', () => {
    const versionsBlock = sql.slice(sql.indexOf('CREATE TABLE ai_decision_intelligence.decision_recommendation_versions'));
    expect(versionsBlock).toMatch(/status\s+text\s+NOT NULL DEFAULT 'draft'/);
  });

  it('documents that ADI never approves or executes recommendations', () => {
    expect(sql).toContain('ADI never approves or executes it');
  });

  it('documents that published recommendations are immutable', () => {
    expect(sql).toContain('Published recommendations are immutable');
  });

  it('documents that implementation steps are never executed by ADI — execution authority belongs to ABA', () => {
    expect(sql).toContain('execution authority belongs to ABA');
  });

  it('recommendations are unique per (case_id, recommendation_code)', () => {
    expect(sql).toContain('decision_recommendations_code_unique');
  });
});

describe('0084 — confidence and limitations (Group H)', () => {
  const sql = loadMigration('0084_create_adi_confidence_limitations.sql');
  for (const table of [
    'decision_confidence_scores', 'decision_uncertainties', 'decision_limitations', 'decision_assumptions',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('confidence scores bound confidence between 0 and 1', () => {
    expect(sql).toContain('confidence BETWEEN 0 AND 1');
  });

  it('uncertainties use the low/medium/high impact enum', () => {
    expect(sql).toContain("CHECK (impact IN ('low','medium','high'))");
  });

  it('assumptions use the observed/declared/derived/inferred/external source enum', () => {
    expect(sql).toContain("'observed','declared','derived','inferred','external'");
  });

  it('all four tables reference decision_recommendation_versions (evidence tied to a specific recommendation version)', () => {
    const matches = sql.match(/REFERENCES ai_decision_intelligence\.decision_recommendation_versions\(id\)/g) ?? [];
    expect(matches.length).toBe(4);
  });
});

describe('0085 — policies and governance (Group I)', () => {
  const sql = loadMigration('0085_create_adi_policies_governance.sql');
  for (const table of [
    'decision_policies', 'decision_policy_versions', 'decision_policy_evaluations', 'decision_guardrail_violations',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('policies have a status CHECK constraint including draft/active/retired/superseded', () => {
    expect(sql).toContain("CHECK (status IN ('draft','active','retired','superseded'))");
  });

  it('guardrail violations use the low/medium/high/critical severity enum', () => {
    expect(sql).toContain("CHECK (severity IN ('low','medium','high','critical'))");
  });

  it('documents that guardrail violations are permanent audit evidence, never edited or hidden', () => {
    expect(sql).toContain('never edited or hidden');
  });

  it('policies are unique per (business_id, policy_code)', () => {
    expect(sql).toContain('decision_policies_code_unique');
  });
});

describe('0086 — monitoring requirements (Group J)', () => {
  const sql = loadMigration('0086_create_adi_monitoring_requirements.sql');
  for (const table of [
    'decision_monitoring_requirements', 'decision_monitoring_metrics', 'decision_review_schedules',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('monitoring requirements use the draft/active/retired status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','active','retired'))");
  });

  it('review schedules use the scheduled/completed/skipped status set', () => {
    expect(sql).toContain("CHECK (status IN ('scheduled','completed','skipped'))");
  });

  it('documents that ADI declares what should be watched but never records outcomes itself — that is Outcome Monitoring’s authority', () => {
    expect(sql).toContain('the authority of Outcome Monitoring');
  });

  it('has no stray unescaped apostrophe inside COMMENT ON TABLE strings (BUILD-13 lesson)', () => {
    const commentBlocks = [...sql.matchAll(/COMMENT ON TABLE[^\n]*\n\s*'(.*?)';/gs)];
    for (const m of commentBlocks) {
      expect(m[1]).not.toMatch(/'/);
    }
  });
});

describe('0087 — publication (Group K)', () => {
  const sql = loadMigration('0087_create_adi_publication.sql');
  for (const table of [
    'adi_insight_packages', 'adi_insight_package_versions', 'adi_publication_packages', 'adi_publication_events',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('publication packages target only approved_business_action (the sole authorized Stage 2G downstream layer)', () => {
    expect(sql).toContain("CHECK (target_layer IN ('approved_business_action'))");
  });

  it('publication packages use the draft/ready/dispatched/acknowledged/rejected/revoked lifecycle', () => {
    expect(sql).toContain("'draft','ready','dispatched','acknowledged','rejected','revoked'");
  });

  it('documents that publication persists the recommendation declaration only, never an approval or execution outcome', () => {
    expect(sql).toContain('never an approval or execution outcome');
  });

  it('publication packages are idempotent per (business_id, idempotency_key)', () => {
    expect(sql).toContain('adi_publication_packages_idempotency_unique');
  });
});

describe('0088 — registry and deployment (Group L)', () => {
  const sql = loadMigration('0088_create_adi_registry.sql');
  for (const table of [
    'adi_component_registry', 'adi_component_registry_versions', 'adi_deployments', 'adi_deployment_rollbacks',
  ]) {
    it(`creates ai_decision_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE ai_decision_intelligence.${table}`);
    });
  }

  it('deployments use the pending/active/rolled_back/superseded activation states', () => {
    expect(sql).toContain("'pending','active','rolled_back','superseded'");
  });
});

describe('0089 — indexes', () => {
  const sql = loadMigration('0089_create_adi_indexes.sql');

  it('creates at least 200 indexes', () => {
    const matches = sql.match(/CREATE INDEX/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(200);
  });

  it('has no duplicate index names', () => {
    const names = [...sql.matchAll(/CREATE INDEX (\w+)/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('0090 — RLS enabled and forced on every table', () => {
  const sql = loadMigration('0090_create_adi_rls_policies.sql');

  it('has at least 47 ENABLE ROW LEVEL SECURITY statements (per BUILD-14 spec minimum table count)', () => {
    const matches = sql.match(/^ALTER TABLE ai_decision_intelligence\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(47);
  });

  it('has exactly as many FORCE ROW LEVEL SECURITY statements as ENABLE statements', () => {
    const enableMatches = sql.match(/^ALTER TABLE ai_decision_intelligence\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    const forceMatches = sql.match(/^ALTER TABLE ai_decision_intelligence\.\w+ FORCE ROW LEVEL SECURITY;/gim) ?? [];
    expect(forceMatches.length).toBe(enableMatches.length);
  });

  it('uses the Stage 2D/2E/2F null-safe fail-closed tenant/workspace predicate', () => {
    expect(sql).toContain("current_setting('app.tenant_id', true)::uuid");
    expect(sql).toContain("current_setting('app.workspace_id', true)::uuid");
  });

  it('has one CREATE POLICY per table (tenant isolation policy count matches ENABLE count)', () => {
    const enableMatches = sql.match(/ENABLE ROW LEVEL SECURITY;/g) ?? [];
    const policyMatches = sql.match(/CREATE POLICY \w+_tenant_isolation/g) ?? [];
    expect(policyMatches.length).toBe(enableMatches.length);
  });
});

describe('0091 — triggers, append-only enforcement, lifecycle guards, outbox events', () => {
  const sql = loadMigration('0091_create_adi_triggers_events.sql');

  it('defines the shared forbid_mutation() function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION ai_decision_intelligence.forbid_mutation()');
  });

  it('attaches forbid_mutation to a DO-block loop over append-only tables (dynamic, not hardcoded per trigger)', () => {
    expect(sql).toContain('FOREACH t IN ARRAY ARRAY[');
    expect(sql).toContain('CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON ai_decision_intelligence.%1$s');
  });

  it('the append-only table array contains at least 25 entries', () => {
    const arrayMatch = sql.match(/ARRAY\[([\s\S]*?)\]/);
    expect(arrayMatch).not.toBeNull();
    const entries = (arrayMatch![1].match(/'[a-z_]+'/g) ?? []);
    expect(entries.length).toBeGreaterThanOrEqual(25);
  });

  it('excludes decision_recommendation_versions from the blanket append-only list (BUILD-12/13-established design fix)', () => {
    const arrayMatch = sql.match(/ARRAY\[([\s\S]*?)\]/);
    const arrayBody = arrayMatch![1];
    expect(arrayBody).not.toContain("'decision_recommendation_versions'");
  });

  for (const guard of [
    'enforce_recommendation_immutability',
    'enforce_recommendation_version_immutability',
    'enforce_publication_transition',
  ]) {
    it(`defines the ${guard} lifecycle/immutability guard function and trigger`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION ai_decision_intelligence.${guard}()`);
      expect(sql).toContain(`CREATE TRIGGER ${guard}`);
    });
  }

  it('defines the emit_outbox_event helper (mirrors simulation.emit_outbox_event)', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_outbox_event(');
    expect(sql).toContain('INSERT INTO events.outbox_events');
  });

  for (const evt of [
    'emit_intake_received', 'emit_reasoning_started', 'emit_reasoning_completed', 'emit_reasoning_failed',
    'emit_alternative_evaluated', 'emit_recommendation_generated', 'emit_confidence_calculated',
    'emit_guardrail_violated', 'emit_decision_published', 'emit_data_published',
  ]) {
    it(`defines the ${evt} outbox wrapper function`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION ai_decision_intelligence.${evt}(`);
    });
  }

  it('emit_data_published rejects target layers outside approved_business_action', () => {
    expect(sql).toContain("IF p_target_layer NOT IN ('approved_business_action') THEN");
  });

  for (const trigger of [
    'adi_intake_packages', 'decision_questions', 'decision_cases', 'reasoning_runs', 'decision_evidence',
    'decision_alternatives', 'decision_recommendations', 'decision_policies', 'decision_monitoring_requirements',
    'decision_review_schedules', 'adi_insight_packages', 'adi_publication_packages', 'adi_component_registry',
    'adi_deployments',
  ]) {
    it(`has a set_updated_at trigger on the mutable table ${trigger}`, () => {
      expect(sql).toContain(`ON ai_decision_intelligence.${trigger} FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
    });
  }
});

describe('repository and export files exist', () => {
  const REPO_DIR = resolve(__dirname, '../src/repositories/adi');
  const REPO_FILES = [
    'ADIIntakeRepository.ts',
    'DecisionQuestionRepository.ts',
    'DecisionCaseRepository.ts',
    'ReasoningRunRepository.ts',
    'DecisionEvidenceRepository.ts',
    'DecisionAlternativeRepository.ts',
    'DecisionRecommendationRepository.ts',
    'DecisionConfidenceRepository.ts',
    'DecisionPolicyRepository.ts',
    'DecisionMonitoringRequirementRepository.ts',
    'ADIPublicationRepository.ts',
    'ADIComponentRegistryRepository.ts',
    'errors.ts',
    'index.ts',
  ];

  it.each(REPO_FILES)('%s exists', (filename) => {
    expect(existsSync(resolve(REPO_DIR, filename))).toBe(true);
  });

  it('main database package index.ts exports all 12 ADI repositories', () => {
    const mainIndex = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf-8');
    for (const repo of [
      'ADIIntakeRepository', 'DecisionQuestionRepository', 'DecisionCaseRepository', 'ReasoningRunRepository',
      'DecisionEvidenceRepository', 'DecisionAlternativeRepository', 'DecisionRecommendationRepository',
      'DecisionConfidenceRepository', 'DecisionPolicyRepository', 'DecisionMonitoringRequirementRepository',
      'ADIPublicationRepository', 'ADIComponentRegistryRepository',
    ]) {
      expect(mainIndex).toContain(repo);
    }
  });
});

describe('handoff contract exports exist', () => {
  const CONTRACTS_DIR = resolve(__dirname, '../../handoff-contracts/src');

  it('sim-to-adi.ts remains complete and unchanged in version (BUILD-13 already satisfies BUILD-14 §6)', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'sim-to-adi.ts'), 'utf-8');
    expect(sql).toContain('export function validateSIMToADIHandoff');
    expect(sql).toContain("SIM_TO_ADI_CONTRACT_VERSION = '1.1.0'");
  });

  it('adi-to-aba.ts exports validateADIToABAHandoff, is versioned 1.0.0, and is complete', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'adi-to-aba.ts'), 'utf-8');
    expect(sql).toContain('export function validateADIToABAHandoff');
    expect(sql).toContain("ADI_TO_ABA_CONTRACT_VERSION = '1.0.0'");
    expect(sql).not.toContain('TODO: add fields');
  });

  it('adi-to-aba.ts enforces the authority boundary via forbidden fields', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'adi-to-aba.ts'), 'utf-8');
    for (const field of ['approval', 'executionResult', 'outcome', 'learningUpdate']) {
      expect(sql).toContain(`'${field}'`);
    }
  });

  it('adi-to-aba.ts restricts target layer to approved_business_action', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'adi-to-aba.ts'), 'utf-8');
    expect(sql).toContain("REQUIRED_TARGET_LAYER = 'approved_business_action'");
  });
});

describe('event-contracts include the 10 required adi.* event types', () => {
  it('LayerEventType union contains all required ADI events', () => {
    const sql = readFileSync(resolve(__dirname, '../../event-contracts/src/index.ts'), 'utf-8');
    for (const evt of [
      'adi.intake.received', 'adi.reasoning.started', 'adi.reasoning.completed', 'adi.reasoning.failed',
      'adi.alternative.evaluated', 'adi.recommendation.generated', 'adi.confidence.calculated',
      'adi.guardrail.violated', 'adi.decision.published', 'adi.data.published',
    ]) {
      expect(sql).toContain(`'${evt}'`);
    }
  });

  it('documents that adi.decision.generated is superseded by adi.recommendation.generated', () => {
    const sql = readFileSync(resolve(__dirname, '../../event-contracts/src/index.ts'), 'utf-8');
    expect(sql).toContain('superseded');
  });
});
