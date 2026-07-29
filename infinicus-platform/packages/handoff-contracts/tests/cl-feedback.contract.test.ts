// CL → DAL contract type + runtime-validation tests (BUILD-17 gates).
import { describe, expect, it } from 'vitest';
import {
  CL_FEEDBACK_CONTRACT_VERSION,
  DA_REQUIRED_TARGET_LAYER,
  validateCLFeedbackHandoff,
  type CLFeedbackHandoff,
  type CLFeedbackHandoffPayload,
} from '../src/cl-feedback';

function validPayload(): CLFeedbackHandoffPayload {
  return {
    contractVersion: CL_FEEDBACK_CONTRACT_VERSION,
    tenantId: 't-1',
    workspaceId: 'ws-1',
    businessId: 'b-1',
    idempotencyKey: 'prop-1::cl-feedback',
    improvementProposalId: 'prop-1',
    proposalVersionId: 'propv-1',
    proposalVersion: 1,
    proposalStatus: 'approved',
    summary: 'Widen data-quality thresholds for the secondary-market revenue feed.',
    lessons: [{ lessonCode: 'lesson-1', statement: 'Revenue variance correlates with stale connector data.' }],
    impacts: [{ impactType: 'data_quality', magnitude: { delta: 0.08 } }],
    risks: [{ riskCode: 'risk-1', description: 'May increase false-positive validation failures.', severity: 'medium' }],
    evidenceReferences: ['cl://improvement_proposal_versions/propv-1'],
    clFeedbackPackageId: 'pub-1',
    targetLayer: DA_REQUIRED_TARGET_LAYER,
    targetBlock: 'DA-01',
    publishedAt: '2026-07-22T00:00:00.000Z',
  };
}

function validHandoff(overrides: Partial<CLFeedbackHandoff> = {}): CLFeedbackHandoff {
  return {
    handoffId: 'handoff-1',
    sourceLayer: 'CL',
    sourceBlock: 'CL-09',
    targetLayer: 'DAL',
    targetBlock: 'DA-01',
    payload: validPayload(),
    correlationId: 'corr-1',
    lineage: [
      { layer: 'CL', block: 'CL-09', recordId: 'prop-1', timestamp: '2026-07-22T00:00:00.000Z', action: 'proposal_approved' },
    ],
    status: 'ready',
    createdAt: '2026-07-22T00:00:00.000Z',
    ...overrides,
  };
}

describe('CL→DAL contract types', () => {
  it('a fully-populated handoff satisfies the type and validates', () => {
    const result = validateCLFeedbackHandoff(validHandoff());
    expect(result.reasons).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('the handoff is JSON-serializable round-trip without loss', () => {
    const handoff = validHandoff();
    const roundTripped = JSON.parse(JSON.stringify(handoff)) as CLFeedbackHandoff;
    expect(roundTripped).toEqual(handoff);
    expect(validateCLFeedbackHandoff(roundTripped).valid).toBe(true);
  });
});

describe('CL→DAL runtime validation', () => {
  it('rejects null and non-objects with an explicit reason', () => {
    expect(validateCLFeedbackHandoff(null).reasons).toContain('handoff_required');
    expect(validateCLFeedbackHandoff('x').valid).toBe(false);
  });

  it('rejects wrong source/target layers', () => {
    const h = validHandoff({ sourceLayer: 'OM', targetLayer: 'BO' });
    const reasons = validateCLFeedbackHandoff(h).reasons;
    expect(reasons).toContain('source_layer_must_be_CL');
    expect(reasons).toContain('target_layer_must_be_DAL');
  });

  it('rejects a non-ready handoff status', () => {
    const h = validHandoff({ status: 'failed' });
    expect(validateCLFeedbackHandoff(h).reasons).toContain('handoff_status_must_be_ready');
  });

  it('rejects missing tenant/workspace/business identity with explicit reasons', () => {
    const h = validHandoff();
    h.payload.tenantId = '';
    (h.payload as { workspaceId?: string }).workspaceId = undefined;
    (h.payload as { businessId?: string }).businessId = undefined;
    const reasons = validateCLFeedbackHandoff(h).reasons;
    expect(reasons).toContain('tenant_id_required');
    expect(reasons).toContain('workspace_id_required');
    expect(reasons).toContain('business_id_required');
  });

  it('rejects a missing idempotency key', () => {
    const h = validHandoff();
    (h.payload as { idempotencyKey: string }).idempotencyKey = '';
    expect(validateCLFeedbackHandoff(h).reasons).toContain('idempotency_key_required');
  });

  it('rejects a proposal that is not approved (still draft)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).proposalStatus = 'draft';
    expect(validateCLFeedbackHandoff(h).reasons).toContain('proposal_not_approved');
  });

  it('rejects a rejected proposal — rejected proposals are never published to Data Acquisition', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).proposalStatus = 'rejected';
    expect(validateCLFeedbackHandoff(h).reasons).toContain('proposal_not_approved');
  });

  it('rejects an invalid proposal version', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).proposalVersion = 0;
    expect(validateCLFeedbackHandoff(h).reasons).toContain('proposal_version_invalid');
  });

  it('rejects missing proposal ids', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).improvementProposalId = '';
    (h.payload as unknown as Record<string, unknown>).proposalVersionId = '';
    const reasons = validateCLFeedbackHandoff(h).reasons;
    expect(reasons).toContain('improvement_proposal_id_required');
    expect(reasons).toContain('proposal_version_id_required');
  });

  it('accepts an empty lessons collection (not every proposal distills a named lesson)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).lessons = [];
    expect(validateCLFeedbackHandoff(h).valid).toBe(true);
  });

  it('rejects a malformed lesson entry', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).lessons = [{ lessonCode: 'l-1' }];
    expect(validateCLFeedbackHandoff(h).reasons).toContain('malformed_lesson_entry');
  });

  it('rejects an empty impacts collection', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).impacts = [];
    expect(validateCLFeedbackHandoff(h).reasons).toContain('impacts_required');
  });

  it('rejects a malformed impact entry (missing magnitude key)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).impacts = [{ impactType: 'data_quality' }];
    expect(validateCLFeedbackHandoff(h).reasons).toContain('malformed_impact_entry');
  });

  it('rejects a malformed risk entry (unknown severity)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).risks = [{ riskCode: 'r-1', description: 'x', severity: 'catastrophic' }];
    expect(validateCLFeedbackHandoff(h).reasons).toContain('malformed_risk_entry');
  });

  it('accepts an empty risks array (not every proposal carries identified risk)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).risks = [];
    expect(validateCLFeedbackHandoff(h).valid).toBe(true);
  });

  it('rejects missing evidence', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).evidenceReferences = [];
    expect(validateCLFeedbackHandoff(h).reasons).toContain('missing_evidence');
  });

  it('rejects a target layer other than data_acquisition', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).targetLayer = 'business_operations';
    expect(validateCLFeedbackHandoff(h).reasons).toContain('target_layer_invalid');
  });

  it('rejects a missing feedback package id', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).clFeedbackPackageId = '';
    expect(validateCLFeedbackHandoff(h).reasons).toContain('cl_feedback_package_id_required');
  });

  it('rejects an invalid publishedAt timestamp', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).publishedAt = 'not-a-date';
    expect(validateCLFeedbackHandoff(h).reasons).toContain('published_at_invalid');
  });

  it('rejects an unsupported contract version', () => {
    const h = validHandoff();
    (h.payload as { contractVersion: string }).contractVersion = '0.0.1';
    expect(validateCLFeedbackHandoff(h).reasons).toContain('contract_version_unsupported');
  });

  it('rejects a payload exceeding the 512 KiB bound', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).oversized = 'x'.repeat(600 * 1024);
    expect(validateCLFeedbackHandoff(h).reasons).toContain('payload_too_large');
  });

  it('rejects credential-like keys anywhere in the payload', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).apiKey = 'secret-value';
    expect(validateCLFeedbackHandoff(h).reasons.some((r) => r.startsWith('credential_like_field_at_'))).toBe(true);
  });

  it('rejects __proto__/prototype/constructor keys anywhere in the payload', () => {
    const h = validHandoff();
    Object.defineProperty(h.payload, '__proto__', { value: { polluted: true }, enumerable: true, configurable: true });
    const reasons = validateCLFeedbackHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('dangerous_key_at_'))).toBe(true);
  });

  it('rejects functions anywhere in the handoff (not serializable)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).callback = () => 42;
    const reasons = validateCLFeedbackHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('unserializable_function_at_'))).toBe(true);
  });

  it('rejects non-plain objects (DOM-like / class instances)', () => {
    class FakeDOMNode { tag = 'div'; }
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).node = new FakeDOMNode();
    const reasons = validateCLFeedbackHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('non_plain_object_at_'))).toBe(true);
  });

  it('rejects embedded configuration-override fields — CL must not directly apply a change', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).configOverride = { threshold: 0.5 };
    (h.payload as unknown as Record<string, unknown>).appliedChange = { applied: true };
    (h.payload as unknown as Record<string, unknown>).connectorConfigChange = { id: 'conn-1' };
    (h.payload as unknown as Record<string, unknown>).collectionScheduleOverride = { cron: '* * * * *' };
    const reasons = validateCLFeedbackHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_configOverride');
    expect(reasons).toContain('forbidden_field_appliedChange');
    expect(reasons).toContain('forbidden_field_connectorConfigChange');
    expect(reasons).toContain('forbidden_field_collectionScheduleOverride');
  });

  it('rejects embedded execution-result fields — proposal approval is distinct from execution', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).executionResult = { ok: true };
    (h.payload as unknown as Record<string, unknown>).actionTaken = 'applied';
    const reasons = validateCLFeedbackHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_executionResult');
    expect(reasons).toContain('forbidden_field_actionTaken');
  });

  it('rejects embedded outcome fields — CL must not record a data-acquisition outcome', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).outcome = { success: true };
    (h.payload as unknown as Record<string, unknown>).observedOutcome = { metric: 1 };
    const reasons = validateCLFeedbackHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_outcome');
    expect(reasons).toContain('forbidden_field_observedOutcome');
  });

  it('rejects a summary that is missing or blank', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).summary = '   ';
    expect(validateCLFeedbackHandoff(h).reasons).toContain('summary_required');
  });
});
