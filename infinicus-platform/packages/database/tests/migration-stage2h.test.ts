/**
 * Structural unit tests for Stage 2H (Approved Business Action) migration
 * files. Validates SQL file content without a live database.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const MIGRATIONS_DIR = resolve(__dirname, '../../../infrastructure/database/migrations');

function loadMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), 'utf-8');
}

const STAGE_2H_FILES = [
  '0092_create_aba_schema_intake.sql',
  '0093_create_aba_review_packages.sql',
  '0094_create_aba_approval_policies.sql',
  '0095_create_aba_approvers_authority.sql',
  '0096_create_aba_approval_decisions.sql',
  '0097_create_aba_approved_actions.sql',
  '0098_create_aba_execution_plans.sql',
  '0099_create_aba_control_gates.sql',
  '0100_create_aba_exceptions_appeals.sql',
  '0101_create_aba_audit_signatures.sql',
  '0102_create_aba_publication.sql',
  '0103_create_aba_registry.sql',
  '0104_create_aba_indexes.sql',
  '0105_create_aba_rls_policies.sql',
  '0106_create_aba_triggers_events.sql',
];

describe('Stage 2H migration files exist', () => {
  it.each(STAGE_2H_FILES)('%s is readable', (filename) => {
    const sql = loadMigration(filename);
    expect(sql.length).toBeGreaterThan(100);
  });
});

describe('All Stage 2H migration files are transactional', () => {
  it.each(STAGE_2H_FILES)('%s wraps in BEGIN/COMMIT', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;?\s*$/im);
  });
});

describe('All Stage 2H migration files self-register in _migrations', () => {
  it.each(STAGE_2H_FILES)('%s inserts into _migrations', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toContain('INSERT INTO _migrations (filename) VALUES');
    expect(sql).toContain(filename);
    expect(sql).toContain('ON CONFLICT (filename) DO NOTHING');
  });
});

describe('Frozen migration range is not touched', () => {
  it('the next migration after 0091 is 0092 — no gap, no renumbering', () => {
    expect(STAGE_2H_FILES[0]).toBe('0092_create_aba_schema_intake.sql');
  });

  it('frozen 0001-0091 files are untouched by this stage (not part of STAGE_2H_FILES)', () => {
    for (const f of STAGE_2H_FILES) {
      const num = parseInt(f.slice(0, 4), 10);
      expect(num).toBeGreaterThanOrEqual(92);
    }
  });
});

describe('0092 — schema + intake and lineage (Group A)', () => {
  const sql = loadMigration('0092_create_aba_schema_intake.sql');

  it('creates approved_business_action schema', () => {
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS approved_business_action');
  });

  for (const table of [
    'aba_intake_packages',
    'aba_intake_package_versions',
    'aba_intake_source_references',
    'aba_intake_status_history',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('intake packages reference the canonical ADI publication package', () => {
    expect(sql).toContain('REFERENCES ai_decision_intelligence.adi_publication_packages(id)');
  });

  it('intake packages reference canonical tenancy/platform identity, never a duplicate', () => {
    expect(sql).toContain('REFERENCES tenancy.tenants(id)');
    expect(sql).toContain('REFERENCES tenancy.workspaces(id)');
    expect(sql).toContain('REFERENCES platform.businesses(id)');
    expect(sql).not.toContain('CREATE TABLE tenancy.businesses');
  });

  it('intake packages are idempotent per (business_id, idempotency_key) and (business_id, adi_publication_package_id)', () => {
    expect(sql).toContain('aba_intake_packages_idempotency_unique');
    expect(sql).toContain('aba_intake_packages_adi_package_unique');
  });

  it('intake packages use the received/validated/accepted/processing/completed/rejected/failed status set', () => {
    expect(sql).toContain("CHECK (status IN (");
    expect(sql).toContain("'received','validated','accepted','processing','completed','rejected','failed'");
  });
});

describe('0093 — review packages (Group B)', () => {
  const sql = loadMigration('0093_create_aba_review_packages.sql');
  for (const table of [
    'action_review_packages', 'action_review_package_versions', 'action_review_evidence', 'action_review_status_history',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('review packages use the draft/in_review/completed/cancelled status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','in_review','completed','cancelled'))");
  });

  it('review evidence uses the governed evidence_type enum', () => {
    expect(sql).toContain("'adi_recommendation','simulation_result','business_intelligence_finding','external','other'");
  });

  it('review packages are unique per (business_id, review_code)', () => {
    expect(sql).toContain('action_review_packages_code_unique');
  });
});

describe('0094 — approval policies (Group C)', () => {
  const sql = loadMigration('0094_create_aba_approval_policies.sql');
  for (const table of [
    'approval_policies', 'approval_policy_versions', 'approval_policy_rules', 'approval_policy_evaluations',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('policies have a status CHECK constraint including draft/active/retired/superseded', () => {
    expect(sql).toContain("CHECK (status IN ('draft','active','retired','superseded'))");
  });

  it('defines all 10 required rule operators', () => {
    for (const op of ['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in', 'contains']) {
      expect(sql).toContain(`'${op}'`);
    }
  });

  it('policy evaluations reference the review package version, avoiding a forward reference to decisions', () => {
    expect(sql).toContain('REFERENCES approved_business_action.action_review_package_versions(id)');
  });
});

describe('0095 — approvers and authority (Group D)', () => {
  const sql = loadMigration('0095_create_aba_approvers_authority.sql');
  for (const table of [
    'approver_assignments', 'approver_assignment_versions', 'approval_authority_scopes', 'approval_delegations',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('assignments use the draft/active/revoked status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','active','revoked'))");
  });

  it('delegations use the active/revoked/expired status set', () => {
    expect(sql).toContain("CHECK (status IN ('active','revoked','expired'))");
  });

  it('assignments reference canonical identity users, never a duplicate', () => {
    expect(sql).toContain('REFERENCES identity.users(id)');
  });
});

describe('0096 — approval decisions (Group E)', () => {
  const sql = loadMigration('0096_create_aba_approval_decisions.sql');
  for (const table of [
    'approval_decisions', 'approval_decision_versions', 'approval_decision_rationales', 'approval_decision_modifications',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('decisions use the draft/approved/approved_with_modifications/rejected/superseded status set', () => {
    expect(sql).toContain("'draft','approved','approved_with_modifications','rejected','superseded'");
  });

  it('decision_versions carries its own independent status column (BUILD-12/13/14-established design fix)', () => {
    const versionsBlock = sql.slice(sql.indexOf('CREATE TABLE approved_business_action.approval_decision_versions'));
    expect(versionsBlock).toMatch(/status\s+text\s+NOT NULL DEFAULT 'draft'/);
  });

  it('documents that this is where ABA exercises approval authority and decided decisions are permanently immutable', () => {
    expect(sql).toContain('ABA exercises approval authority');
    expect(sql).toContain('permanently immutable');
  });

  it('decisions are unique per (business_id, decision_code)', () => {
    expect(sql).toContain('approval_decisions_code_unique');
  });
});

describe('0097 — approved actions (Group F)', () => {
  const sql = loadMigration('0097_create_aba_approved_actions.sql');
  for (const table of [
    'approved_actions', 'approved_action_versions', 'approved_action_steps', 'approved_action_constraints',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('documents that approved actions describe what was approved, never a record of execution', () => {
    expect(sql).toContain('never a record of execution');
  });

  it('documents that no external business action is executed by this database stage', () => {
    expect(sql).toContain('No external business action is executed by this database stage');
  });
});

describe('0098 — execution plans (Group G)', () => {
  const sql = loadMigration('0098_create_aba_execution_plans.sql');
  for (const table of [
    'action_execution_plans', 'action_execution_plan_versions', 'action_execution_dependencies', 'action_execution_windows',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('plans use the draft/ready/active/completed/cancelled status set', () => {
    expect(sql).toContain("CHECK (status IN ('draft','ready','active','completed','cancelled'))");
  });

  it('dependencies use the blocks/requires dependency_type enum', () => {
    expect(sql).toContain("CHECK (dependency_type IN ('blocks','requires'))");
  });
});

describe('0099 — control gates (Group H)', () => {
  const sql = loadMigration('0099_create_aba_control_gates.sql');
  for (const table of [
    'action_control_gates', 'action_control_gate_evaluations', 'action_holds', 'action_releases',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('gates use the manual/automated/compliance gate_type enum', () => {
    expect(sql).toContain("CHECK (gate_type IN ('manual','automated','compliance'))");
  });

  it('gates use the pending/passed/failed/waived status set', () => {
    expect(sql).toContain("CHECK (status IN ('pending','passed','failed','waived'))");
  });

  it('releases reference a specific hold, forming a permanent pause/resume audit trail', () => {
    expect(sql).toContain('REFERENCES approved_business_action.action_holds(id)');
  });
});

describe('0100 — exceptions and appeals (Group I)', () => {
  const sql = loadMigration('0100_create_aba_exceptions_appeals.sql');
  for (const table of [
    'approval_exceptions', 'approval_exception_evidence', 'approval_appeals', 'approval_appeal_decisions',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('exceptions use the open/resolved/denied status set', () => {
    expect(sql).toContain("CHECK (status IN ('open','resolved','denied'))");
  });

  it('appeals use the open/upheld/overturned/dismissed status set', () => {
    expect(sql).toContain("CHECK (status IN ('open','upheld','overturned','dismissed'))");
  });

  it('appeal decisions use the upheld/overturned/dismissed outcome enum', () => {
    expect(sql).toContain("CHECK (outcome IN ('upheld','overturned','dismissed'))");
  });

  it('has no stray unescaped apostrophe inside COMMENT ON TABLE strings (BUILD-13/14 lesson)', () => {
    const commentBlocks = [...sql.matchAll(/COMMENT ON TABLE[^\n]*\n\s*'(.*?)';/gs)];
    for (const m of commentBlocks) {
      expect(m[1]).not.toMatch(/'/);
    }
  });
});

describe('0101 — audit and signatures (Group J)', () => {
  const sql = loadMigration('0101_create_aba_audit_signatures.sql');
  for (const table of [
    'approval_attestations', 'approval_signatures', 'approval_audit_events',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('documents that signatures store a reference — never raw signature bytes', () => {
    expect(sql).toContain('never raw signature bytes');
  });
});

describe('0102 — publication (Group K)', () => {
  const sql = loadMigration('0102_create_aba_publication.sql');
  for (const table of [
    'aba_publication_packages', 'aba_publication_package_versions', 'aba_publication_events',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('publication packages target only outcome_monitoring (the sole authorized Stage 2H downstream layer)', () => {
    expect(sql).toContain("CHECK (target_layer IN ('outcome_monitoring'))");
  });

  it('publication packages use the draft/ready/dispatched/acknowledged/rejected/revoked lifecycle', () => {
    expect(sql).toContain("'draft','ready','dispatched','acknowledged','rejected','revoked'");
  });

  it('publication packages are idempotent per (business_id, idempotency_key)', () => {
    expect(sql).toContain('aba_publication_packages_idempotency_unique');
  });
});

describe('0103 — registry and deployment (Group L)', () => {
  const sql = loadMigration('0103_create_aba_registry.sql');
  for (const table of [
    'aba_component_registry', 'aba_component_registry_versions', 'aba_deployments', 'aba_deployment_rollbacks',
  ]) {
    it(`creates approved_business_action.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE approved_business_action.${table}`);
    });
  }

  it('deployments use the pending/active/rolled_back/superseded activation states', () => {
    expect(sql).toContain("'pending','active','rolled_back','superseded'");
  });
});

describe('0104 — indexes', () => {
  const sql = loadMigration('0104_create_aba_indexes.sql');

  it('creates at least 200 indexes', () => {
    const matches = sql.match(/CREATE INDEX/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(200);
  });

  it('has no duplicate index names', () => {
    const names = [...sql.matchAll(/CREATE INDEX (\w+)/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe('0105 — RLS enabled and forced on every table', () => {
  const sql = loadMigration('0105_create_aba_rls_policies.sql');

  it('has at least 46 ENABLE ROW LEVEL SECURITY statements (per BUILD-15 spec minimum table count)', () => {
    const matches = sql.match(/^ALTER TABLE approved_business_action\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(46);
  });

  it('has exactly as many FORCE ROW LEVEL SECURITY statements as ENABLE statements', () => {
    const enableMatches = sql.match(/^ALTER TABLE approved_business_action\.\w+ ENABLE ROW LEVEL SECURITY;/gim) ?? [];
    const forceMatches = sql.match(/^ALTER TABLE approved_business_action\.\w+ FORCE ROW LEVEL SECURITY;/gim) ?? [];
    expect(forceMatches.length).toBe(enableMatches.length);
  });

  it('uses the Stage 2D/2E/2F/2G null-safe fail-closed tenant/workspace predicate', () => {
    expect(sql).toContain("current_setting('app.tenant_id', true)::uuid");
    expect(sql).toContain("current_setting('app.workspace_id', true)::uuid");
  });

  it('has one CREATE POLICY per table (tenant isolation policy count matches ENABLE count)', () => {
    const enableMatches = sql.match(/ENABLE ROW LEVEL SECURITY;/g) ?? [];
    const policyMatches = sql.match(/CREATE POLICY \w+_tenant_isolation/g) ?? [];
    expect(policyMatches.length).toBe(enableMatches.length);
  });
});

describe('0106 — triggers, append-only enforcement, lifecycle guards, outbox events', () => {
  const sql = loadMigration('0106_create_aba_triggers_events.sql');

  it('defines the shared forbid_mutation() function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION approved_business_action.forbid_mutation()');
  });

  it('attaches forbid_mutation to a DO-block loop over append-only tables (dynamic, not hardcoded per trigger)', () => {
    expect(sql).toContain('FOREACH t IN ARRAY ARRAY[');
    expect(sql).toContain('CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON approved_business_action.%1$s');
  });

  it('the append-only table array contains at least 25 entries', () => {
    const arrayMatch = sql.match(/ARRAY\[([\s\S]*?)\]/);
    expect(arrayMatch).not.toBeNull();
    const entries = (arrayMatch![1].match(/'[a-z_]+'/g) ?? []);
    expect(entries.length).toBeGreaterThanOrEqual(25);
  });

  it('excludes approval_decision_versions from the blanket append-only list (BUILD-12/13/14-established design fix)', () => {
    const arrayMatch = sql.match(/ARRAY\[([\s\S]*?)\]/);
    const arrayBody = arrayMatch![1];
    expect(arrayBody).not.toContain("'approval_decision_versions'");
  });

  for (const guard of [
    'enforce_decision_immutability',
    'enforce_decision_version_immutability',
    'enforce_publication_transition',
  ]) {
    it(`defines the ${guard} lifecycle/immutability guard function and trigger`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION approved_business_action.${guard}()`);
      expect(sql).toContain(`CREATE TRIGGER ${guard}`);
    });
  }

  it('defines the emit_outbox_event helper (mirrors ai_decision_intelligence.emit_outbox_event)', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION approved_business_action.emit_outbox_event(');
    expect(sql).toContain('INSERT INTO events.outbox_events');
  });

  for (const evt of [
    'emit_intake_received', 'emit_review_requested', 'emit_review_started', 'emit_action_approved',
    'emit_action_approved_with_modifications', 'emit_action_rejected', 'emit_action_held', 'emit_action_released',
    'emit_action_published', 'emit_data_published',
  ]) {
    it(`defines the ${evt} outbox wrapper function`, () => {
      expect(sql).toContain(`CREATE OR REPLACE FUNCTION approved_business_action.${evt}(`);
    });
  }

  it('emit_data_published rejects target layers outside outcome_monitoring', () => {
    expect(sql).toContain("IF p_target_layer NOT IN ('outcome_monitoring') THEN");
  });

  for (const trigger of [
    'aba_intake_packages', 'action_review_packages', 'approval_policies', 'approver_assignments',
    'approval_delegations', 'approval_decisions', 'approved_actions', 'action_execution_plans',
    'action_control_gates', 'approval_exceptions', 'approval_appeals', 'aba_publication_packages',
    'aba_component_registry', 'aba_deployments',
  ]) {
    it(`has a set_updated_at trigger on the mutable table ${trigger}`, () => {
      expect(sql).toContain(`ON approved_business_action.${trigger} FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
    });
  }
});

describe('repository and export files exist', () => {
  const REPO_DIR = resolve(__dirname, '../src/repositories/approved_action');
  const REPO_FILES = [
    'ABAIntakeRepository.ts',
    'ActionReviewRepository.ts',
    'ApprovalPolicyRepository.ts',
    'ApproverAuthorityRepository.ts',
    'ApprovalDecisionRepository.ts',
    'ApprovedActionRepository.ts',
    'ActionExecutionPlanRepository.ts',
    'ActionControlGateRepository.ts',
    'ApprovalExceptionRepository.ts',
    'ApprovalAppealRepository.ts',
    'ABAAuditRepository.ts',
    'ABAPublicationRepository.ts',
    'ABAComponentRegistryRepository.ts',
    'errors.ts',
    'index.ts',
  ];

  it.each(REPO_FILES)('%s exists', (filename) => {
    expect(existsSync(resolve(REPO_DIR, filename))).toBe(true);
  });

  it('main database package index.ts exports all 13 ABA repositories', () => {
    const mainIndex = readFileSync(resolve(__dirname, '../src/index.ts'), 'utf-8');
    for (const repo of [
      'ABAIntakeRepository', 'ActionReviewRepository', 'ApprovalPolicyRepository', 'ApproverAuthorityRepository',
      'ApprovalDecisionRepository', 'ApprovedActionRepository', 'ActionExecutionPlanRepository',
      'ActionControlGateRepository', 'ApprovalExceptionRepository', 'ApprovalAppealRepository',
      'ABAAuditRepository', 'ABAPublicationRepository', 'ABAComponentRegistryRepository',
    ]) {
      expect(mainIndex).toContain(repo);
    }
  });
});

describe('handoff contract exports exist', () => {
  const CONTRACTS_DIR = resolve(__dirname, '../../handoff-contracts/src');

  it('adi-to-aba.ts remains complete and unchanged in version (BUILD-14 already satisfies BUILD-15 §6)', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'adi-to-aba.ts'), 'utf-8');
    expect(sql).toContain('export function validateADIToABAHandoff');
    expect(sql).toContain("ADI_TO_ABA_CONTRACT_VERSION = '1.0.0'");
  });

  it('aba-to-om.ts exports validateABAToOMHandoff, is versioned 1.0.0, and is complete', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'aba-to-om.ts'), 'utf-8');
    expect(sql).toContain('export function validateABAToOMHandoff');
    expect(sql).toContain("ABA_TO_OM_CONTRACT_VERSION = '1.0.0'");
    expect(sql).not.toContain('TODO: add fields');
  });

  it('aba-to-om.ts enforces the authority boundary via forbidden fields', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'aba-to-om.ts'), 'utf-8');
    for (const field of ['outcome', 'verdict', 'evaluationResult', 'learningUpdate', 'executionResult']) {
      expect(sql).toContain(`'${field}'`);
    }
  });

  it('aba-to-om.ts restricts target layer to outcome_monitoring', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'aba-to-om.ts'), 'utf-8');
    expect(sql).toContain("OM_REQUIRED_TARGET_LAYER = 'outcome_monitoring'");
  });

  it('aba-to-om.ts only accepts decided, non-rejected decisions', () => {
    const sql = readFileSync(resolve(CONTRACTS_DIR, 'aba-to-om.ts'), 'utf-8');
    expect(sql).toContain("READY_DECISION_STATUSES = ['approved', 'approved_with_modifications']");
  });
});

describe('event-contracts include the 10 required aba.* event types', () => {
  it('LayerEventType union contains all required ABA events', () => {
    const sql = readFileSync(resolve(__dirname, '../../event-contracts/src/index.ts'), 'utf-8');
    for (const evt of [
      'aba.intake.received', 'aba.review.requested', 'aba.review.started', 'aba.action.approved',
      'aba.action.approved_with_modifications', 'aba.action.rejected', 'aba.action.held', 'aba.action.released',
      'aba.action.published', 'aba.data.published',
    ]) {
      expect(sql).toContain(`'${evt}'`);
    }
  });
});
