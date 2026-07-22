/**
 * Structural unit tests for Stage 2J (Continuous Learning) migration
 * files. Validates SQL file content without a live database.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const MIGRATIONS_DIR = resolve(__dirname, '../../../infrastructure/database/migrations');

function loadMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), 'utf-8');
}

const STAGE_2J_FILES = [
  '0122_create_cl_schema_intake.sql',
  '0123_create_cl_learning_cases.sql',
  '0124_create_cl_feedback.sql',
  '0125_create_cl_lessons.sql',
  '0126_create_cl_patterns.sql',
  '0127_create_cl_model_evaluation.sql',
  '0128_create_cl_policy_evaluation.sql',
  '0129_create_cl_improvement_proposals.sql',
  '0130_create_cl_approval_release.sql',
  '0131_create_cl_knowledge_registry.sql',
  '0132_create_cl_feedback_publication.sql',
  '0133_create_cl_registry.sql',
  '0134_create_cl_indexes.sql',
  '0135_create_cl_rls_policies.sql',
  '0136_create_cl_triggers_events.sql',
];

describe('Stage 2J migration files exist', () => {
  it.each(STAGE_2J_FILES)('%s is readable', (filename) => {
    const sql = loadMigration(filename);
    expect(sql.length).toBeGreaterThan(100);
  });
});

describe('All Stage 2J migration files are transactional', () => {
  it.each(STAGE_2J_FILES)('%s wraps in BEGIN/COMMIT', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;?\s*$/im);
  });
});

describe('All Stage 2J migration files self-register in _migrations', () => {
  it.each(STAGE_2J_FILES)('%s inserts into _migrations', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toContain('INSERT INTO _migrations (filename) VALUES');
    expect(sql).toContain(filename);
    expect(sql).toContain('ON CONFLICT (filename) DO NOTHING');
  });
});

describe('Frozen migration range is not touched', () => {
  it('the next migration after 0121 is 0122 — no gap, no renumbering', () => {
    expect(STAGE_2J_FILES[0]).toBe('0122_create_cl_schema_intake.sql');
  });

  it('frozen 0001-0121 files are untouched by this stage (not part of STAGE_2J_FILES)', () => {
    for (const f of STAGE_2J_FILES) {
      const num = parseInt(f.slice(0, 4), 10);
      expect(num).toBeGreaterThanOrEqual(122);
    }
  });
});

describe('0122 — schema + intake and lineage (Group A)', () => {
  const sql = loadMigration('0122_create_cl_schema_intake.sql');

  it('creates continuous_learning schema', () => {
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS continuous_learning');
  });

  for (const table of [
    'cl_intake_packages',
    'cl_intake_package_versions',
    'cl_intake_source_references',
    'cl_intake_status_history',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('intake packages reference the canonical OM publication package', () => {
    expect(sql).toContain('REFERENCES outcome_monitoring.om_publication_packages(id)');
  });

  it('intake packages reference canonical tenancy/platform identity, never a duplicate', () => {
    expect(sql).toContain('REFERENCES tenancy.tenants(id)');
    expect(sql).toContain('REFERENCES tenancy.workspaces(id)');
    expect(sql).toContain('REFERENCES platform.businesses(id)');
    expect(sql).not.toContain('CREATE TABLE tenancy.businesses');
  });

  it('intake packages are idempotent per (business_id, idempotency_key) and (business_id, om_publication_package_id)', () => {
    expect(sql).toContain('cl_intake_packages_idempotency_unique');
    expect(sql).toContain('cl_intake_packages_om_package_unique');
  });

  it('intake packages use the received/validated/accepted/processing/completed/rejected/failed status set', () => {
    expect(sql).toContain("CHECK (status IN (");
    expect(sql).toContain("'received','validated','accepted','processing','completed','rejected','failed'");
  });
});

describe('0123 — learning cases (Group B)', () => {
  const sql = loadMigration('0123_create_cl_learning_cases.sql');
  for (const table of [
    'learning_cases', 'learning_case_versions', 'learning_case_status_history', 'learning_case_evidence',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('cases use the draft/active/completed/cancelled status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','active','completed','cancelled'))");
  });

  it('evidence uses the governed evidence_type enum', () => {
    expect(sql).toContain("'observation','feedback','review_finding','external','other'");
  });

  it('cases are unique per (business_id, case_code)', () => {
    expect(sql).toContain('learning_cases_code_unique');
  });
});

describe('0124 — feedback (Group C)', () => {
  const sql = loadMigration('0124_create_cl_feedback.sql');
  for (const table of [
    'learning_feedback_records', 'learning_feedback_versions', 'learning_feedback_links', 'learning_feedback_quality',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('feedback records use the draft/active/superseded status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','active','superseded'))");
  });

  it('quality scores are bounded to [0,1]', () => {
    expect(sql).toContain('quality_score >= 0 AND quality_score <= 1');
  });
});

describe('0125 — lessons (Group D)', () => {
  const sql = loadMigration('0125_create_cl_lessons.sql');
  for (const table of [
    'learned_lessons', 'learned_lesson_versions', 'lesson_evidence', 'lesson_applicability',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('lessons use the draft/validated/published/retired status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','validated','published','retired'))");
  });

  it('lessons are unique per (business_id, lesson_code)', () => {
    expect(sql).toContain('learned_lessons_code_unique');
  });
});

describe('0126 — patterns (Group E)', () => {
  const sql = loadMigration('0126_create_cl_patterns.sql');
  for (const table of [
    'learning_patterns', 'learning_pattern_versions', 'pattern_observations', 'pattern_confidence_scores',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('patterns use the draft/confirmed/retired status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','confirmed','retired'))");
  });

  it('confidence scores are bounded to [0,1]', () => {
    expect(sql).toContain('confidence >= 0 AND confidence <= 1');
  });
});

describe('0127 — model evaluation (Group F)', () => {
  const sql = loadMigration('0127_create_cl_model_evaluation.sql');
  for (const table of [
    'model_evaluation_runs', 'model_evaluation_results', 'model_drift_records', 'model_bias_records',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('evaluation runs use the queued/running/completed/failed status set', () => {
    expect(sql).toContain("CHECK (status IN ('queued','running','completed','failed'))");
  });
});

describe('0128 — policy evaluation (Group G)', () => {
  const sql = loadMigration('0128_create_cl_policy_evaluation.sql');
  for (const table of [
    'policy_evaluation_runs', 'policy_evaluation_results', 'policy_change_proposals', 'policy_change_evidence',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('policy evaluation runs reference the canonical ABA approval policy, never a duplicate', () => {
    expect(sql).toContain('REFERENCES approved_business_action.approval_policies(id)');
  });

  it('documents that policy change proposals are never themselves an approval', () => {
    expect(sql).toContain('Never itself an approval');
  });

  it('change proposals are unique per (business_id, proposal_code)', () => {
    expect(sql).toContain('policy_change_proposals_code_unique');
  });
});

describe('0129 — improvement proposals (Group H)', () => {
  const sql = loadMigration('0129_create_cl_improvement_proposals.sql');
  for (const table of [
    'improvement_proposals', 'improvement_proposal_versions', 'improvement_impacts', 'improvement_risks',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('proposals use the draft/proposed/under_review/approved/rejected/superseded status set', () => {
    expect(sql).toContain("'draft','proposed','under_review','approved','rejected','superseded'");
  });

  it('proposal_versions carries its own independent status column (BUILD-12/13/14/15/16-established design fix)', () => {
    const versionsBlock = sql.slice(sql.indexOf('CREATE TABLE continuous_learning.improvement_proposal_versions'));
    expect(versionsBlock).toMatch(/status\s+text\s+NOT NULL DEFAULT 'draft'/);
  });

  it('documents that this is where CL exercises change-proposal authority and decided proposals are permanently immutable', () => {
    expect(sql).toContain('CL exercises its change-proposal authority');
    expect(sql).toContain('permanently immutable');
  });

  it('documents that learning must never silently mutate frozen historical evidence, decisions, approvals, or outcomes', () => {
    expect(sql).toContain('must never silently mutate frozen historical evidence, decisions, approvals, or outcomes');
  });

  it('risks use the low/medium/high/critical severity enum', () => {
    expect(sql).toContain("CHECK (severity IN ('low','medium','high','critical'))");
  });

  it('proposals are unique per (business_id, proposal_code)', () => {
    expect(sql).toContain('improvement_proposals_code_unique');
  });
});

describe('0130 — approval and release (Group I)', () => {
  const sql = loadMigration('0130_create_cl_approval_release.sql');
  for (const table of [
    'learning_change_reviews', 'learning_change_decisions', 'learning_change_releases', 'learning_change_rollbacks',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('reviews use the draft/in_review/completed/cancelled status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','in_review','completed','cancelled'))");
  });

  it('decisions use the approved/rejected outcome enum', () => {
    expect(sql).toContain("CHECK (outcome IN ('approved','rejected'))");
  });

  it('rollbacks reference a specific release, forming a permanent release/rollback audit trail', () => {
    expect(sql).toContain('REFERENCES continuous_learning.learning_change_releases(id)');
  });

  it('has no stray unescaped apostrophe inside COMMENT ON TABLE strings (BUILD-13/14/15/16 lesson)', () => {
    const commentBlocks = [...sql.matchAll(/COMMENT ON TABLE[^\n]*\n\s*'(.*?)';/gs)];
    for (const m of commentBlocks) {
      expect(m[1]).not.toMatch(/'/);
    }
  });
});

describe('0131 — knowledge registry (Group J)', () => {
  const sql = loadMigration('0131_create_cl_knowledge_registry.sql');
  for (const table of [
    'knowledge_artifacts', 'knowledge_artifact_versions', 'knowledge_relationships', 'knowledge_supersessions',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('artifacts use the draft/published/superseded/retired status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','published','superseded','retired'))");
  });

  it('relationships use the derived_from/supports/contradicts/supersedes enum', () => {
    expect(sql).toContain("CHECK (relationship_type IN ('derived_from','supports','contradicts','supersedes'))");
  });
});

describe('0132 — feedback publication (Group K)', () => {
  const sql = loadMigration('0132_create_cl_feedback_publication.sql');
  for (const table of [
    'cl_feedback_packages', 'cl_feedback_package_versions', 'cl_feedback_events',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('feedback packages target only data_acquisition (the sole authorized Stage 2J downstream layer)', () => {
    expect(sql).toContain("CHECK (target_layer IN ('data_acquisition'))");
  });

  it('feedback packages use the draft/ready/dispatched/acknowledged/rejected/revoked lifecycle', () => {
    expect(sql).toContain("'draft','ready','dispatched','acknowledged','rejected','revoked'");
  });

  it('feedback packages are idempotent per (business_id, idempotency_key)', () => {
    expect(sql).toContain('cl_feedback_packages_idempotency_unique');
  });

  it('documents that this closes the feedback loop back to Data Acquisition and never records an executed change', () => {
    expect(sql).toContain('closing back to Data Acquisition');
    expect(sql).toContain('never a record of having executed the change');
  });
});

describe('0133 — registry and deployment (Group L)', () => {
  const sql = loadMigration('0133_create_cl_registry.sql');
  for (const table of [
    'cl_component_registry', 'cl_component_registry_versions', 'cl_deployments', 'cl_deployment_rollbacks',
  ]) {
    it(`creates continuous_learning.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE continuous_learning.${table}`);
    });
  }

  it('deployments use the pending/active/rolled_back/superseded activation states', () => {
    expect(sql).toContain("'pending','active','rolled_back','superseded'");
  });
});

describe('0134 — indexes', () => {
  const sql = loadMigration('0134_create_cl_indexes.sql');

  it('creates at least 200 indexes', () => {
    const matches = sql.match(/CREATE INDEX/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(200);
  });

  it('has no duplicate index names', () => {
    const names = [...sql.matchAll(/CREATE INDEX (\w+)/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('0135 — RLS enabled and forced on every table', () => {
  const sql = loadMigration('0135_create_cl_rls_policies.sql');

  it('has at least 47 ENABLE ROW LEVEL SECURITY statements (per BUILD-17 spec minimum table count)', () => {
    const matches = sql.match(/^ALTER TABLE continuous_learning\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(47);
  });

  it('has exactly as many FORCE ROW LEVEL SECURITY statements as ENABLE statements', () => {
    const enableMatches = sql.match(/^ALTER TABLE continuous_learning\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    const forceMatches = sql.match(/^ALTER TABLE continuous_learning\.\w+ FORCE ROW LEVEL SECURITY;/gim) ?? [];
    expect(forceMatches.length).toBe(enableMatches.length);
  });

  it('uses the Stage 2D/2E/2F/2G/2H/2I null-safe fail-closed tenant/workspace predicate', () => {
    expect(sql).toContain("current_setting('app.tenant_id', true)::uuid");
    expect(sql).toContain("current_setting('app.workspace_id', true)::uuid");
  });

  it('has one CREATE POLICY per table (tenant isolation policy count matches ENABLE count)', () => {
    const enableMatches = sql.match(/ENABLE ROW LEVEL SECURITY;/g) ?? [];
    const policyMatches = sql.match(/CREATE POLICY \w+_tenant_isolation/g) ?? [];
    expect(policyMatches.length).toBe(enableMatches.length);
  });
});

describe('0136 — triggers, append-only enforcement, lifecycle guards, outbox events', () => {
  const sql = loadMigration('0136_create_cl_triggers_events.sql');

  it('defines the shared forbid_mutation() function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION continuous_learning.forbid_mutation()');
  });

  it('attaches forbid_mutation to a DO-block loop over append-only tables (dynamic, not hardcoded per trigger)', () => {
    expect(sql).toContain('FOREACH t IN ARRAY ARRAY[');
    expect(sql).toContain('CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON continuous_learning.%1$s');
  });

  it('the append-only table array contains at least 25 entries', () => {
    const arrayMatch = sql.match(/ARRAY\[([\s\S]*?)\]/);
    expect(arrayMatch).not.toBeNull();
    const entries = (arrayMatch![1].match(/'[a-z_]+'/g) ?? []);
    expect(entries.length).toBeGreaterThanOrEqual(25);
  });

  it('excludes improvement_proposal_versions from the blanket append-only list (BUILD-12/13/14/15/16-established design fix)', () => {
    const arrayMatch = sql.match(/ARRAY\[([\s\S]*?)\]/);
    const arrayBody = arrayMatch![1];
    expect(arrayBody).not.toContain("'improvement_proposal_versions'");
  });

  for (const guard of [
    'enforce_proposal_immutability',
    'enforce_proposal_version_immutability',
    'enforce_publication_transition',
  ]) {
    it(`defines the ${guard} lifecycle/immutability guard function and trigger`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION continuous_learning.${guard}()`);
      expect(sql).toContain(`CREATE TRIGGER ${guard}`);
    });
  }

  it('defines the emit_outbox_event helper (mirrors outcome_monitoring.emit_outbox_event)', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION continuous_learning.emit_outbox_event(');
    expect(sql).toContain('INSERT INTO events.outbox_events');
  });

  for (const evt of [
    'emit_intake_received', 'emit_case_created', 'emit_lesson_created', 'emit_pattern_detected',
    'emit_model_drift_detected', 'emit_policy_evaluated', 'emit_improvement_proposed', 'emit_change_approved',
    'emit_feedback_published', 'emit_data_published',
  ]) {
    it(`defines the ${evt} outbox wrapper function`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION continuous_learning.${evt}(`);
    });
  }

  it('emit_data_published rejects target layers outside data_acquisition', () => {
    expect(sql).toContain("IF p_target_layer NOT IN ('data_acquisition') THEN");
  });

  for (const trigger of [
    'cl_intake_packages', 'learning_cases', 'learning_feedback_records', 'learned_lessons', 'learning_patterns',
    'model_evaluation_runs', 'policy_evaluation_runs', 'policy_change_proposals', 'improvement_proposals',
    'learning_change_reviews', 'knowledge_artifacts', 'cl_feedback_packages', 'cl_component_registry', 'cl_deployments',
  ]) {
    it(`has a set_updated_at trigger on the mutable table ${trigger}`, () => {
      expect(sql).toContain(`ON continuous_learning.${trigger} FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
    });
  }
});

describe('repository and export files exist', () => {
  const REPO_DIR = resolve(__dirname, '../src/repositories/cl');
  const REPO_FILES = [
    'CLIntakeRepository.ts',
    'LearningCaseRepository.ts',
    'LearningFeedbackRepository.ts',
    'LearnedLessonRepository.ts',
    'LearningPatternRepository.ts',
    'ModelEvaluationRepository.ts',
    'PolicyEvaluationRepository.ts',
    'ImprovementProposalRepository.ts',
    'LearningChangeReviewRepository.ts',
    'KnowledgeArtifactRepository.ts',
    'CLFeedbackPublicationRepository.ts',
    'CLComponentRegistryRepository.ts',
    'errors.ts',
    'index.ts',
  ];

  it.each(REPO_FILES)('%s exists', (filename) => {
    expect(existsSync(resolve(REPO_DIR, filename))).toBe(true);
  });

  it('main database package index.ts exports all 12 CL repositories', () => {
    const mainIndex = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf-8');
    for (const repo of [
      'CLIntakeRepository', 'LearningCaseRepository', 'LearningFeedbackRepository', 'LearnedLessonRepository',
      'LearningPatternRepository', 'ModelEvaluationRepository', 'PolicyEvaluationRepository',
      'ImprovementProposalRepository', 'LearningChangeReviewRepository', 'KnowledgeArtifactRepository',
      'CLFeedbackPublicationRepository', 'CLComponentRegistryRepository',
    ]) {
      expect(mainIndex).toContain(repo);
    }
  });
});

describe('handoff contract exports exist', () => {
  const CONTRACTS_DIR = resolve(__dirname, '../../handoff-contracts/src');

  it('om-to-cl.ts remains complete and unchanged in version (BUILD-16 already satisfies BUILD-17 §6)', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'om-to-cl.ts'), 'utf-8');
    expect(sql).toContain('export function validateOMToCLHandoff');
    expect(sql).toContain("OM_TO_CL_CONTRACT_VERSION = '1.0.0'");
  });

  it('cl-feedback.ts exports validateCLFeedbackHandoff, is versioned 1.0.0, and is complete', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'cl-feedback.ts'), 'utf-8');
    expect(sql).toContain('export function validateCLFeedbackHandoff');
    expect(sql).toContain("CL_FEEDBACK_CONTRACT_VERSION = '1.0.0'");
    expect(sql).not.toContain('TODO: add fields');
  });

  it('cl-feedback.ts enforces the authority boundary via forbidden fields', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'cl-feedback.ts'), 'utf-8');
    for (const field of ['configOverride', 'appliedChange', 'executionResult', 'outcome']) {
      expect(sql).toContain(`'${field}'`);
    }
  });

  it('cl-feedback.ts restricts target layer to data_acquisition', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'cl-feedback.ts'), 'utf-8');
    expect(sql).toContain("DA_REQUIRED_TARGET_LAYER = 'data_acquisition'");
  });

  it('cl-feedback.ts only accepts an approved (decided) proposal', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'cl-feedback.ts'), 'utf-8');
    expect(sql).toContain("READY_PROPOSAL_STATUSES = ['approved']");
  });
});

describe('event-contracts include the 10 required cl.* event types', () => {
  it('LayerEventType union contains all required CL events', () => {
    const sql = readFileSync(resolve(__dirname, '../../event-contracts/src/index.ts'), 'utf-8');
    for (const evt of [
      'cl.intake.received', 'cl.case.created', 'cl.lesson.created', 'cl.pattern.detected',
      'cl.model.drift_detected', 'cl.policy.evaluated', 'cl.improvement.proposed', 'cl.change.approved',
      'cl.feedback.published', 'cl.data.published',
    ]) {
      expect(sql).toContain(`'${evt}'`);
    }
  });
});
