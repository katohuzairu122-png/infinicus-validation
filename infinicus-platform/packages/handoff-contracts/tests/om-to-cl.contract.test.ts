// OM → CL contract type + runtime-validation tests (BUILD-16 gates).
import { describe, expect, it } from 'vitest';
import {
  OM_TO_CL_CONTRACT_VERSION,
  CL_REQUIRED_TARGET_LAYER,
  validateOMToCLHandoff,
  type OMToCLHandoff,
  type OMToCLHandoffPayload,
} from '../src/om-to-cl';

function validPayload(): OMToCLHandoffPayload {
  return {
    contractVersion: OM_TO_CL_CONTRACT_VERSION,
    tenantId: 't-1',
    workspaceId: 'ws-1',
    businessId: 'b-1',
    idempotencyKey: 'obs-1::om-to-cl',
    observationId: 'obs-1',
    observationVersionId: 'obsv-1',
    observationVersion: 1,
    feedbackPackageId: 'fb-1',
    feedbackPackageVersionId: 'fbv-1',
    feedbackStatus: 'ready',
    summary: 'Expansion into the secondary market met revenue target within tolerance.',
    findings: [{ findingCode: 'find-1', statement: 'Revenue variance within 5% of target.' }],
    reviewActions: [{ actionCode: 'act-1', description: 'Continue monitoring for two more cycles.' }],
    varianceSummary: [{ metricCode: 'revenue', varianceValue: 0.04 }],
    evidenceReferences: ['om://outcome_observation_versions/obsv-1'],
    omPublicationPackageId: 'pub-1',
    targetLayer: CL_REQUIRED_TARGET_LAYER,
    targetBlock: 'CL-01',
    publishedAt: '2026-07-22T00:00:00.000Z',
  };
}

function validHandoff(overrides: Partial<OMToCLHandoff> = {}): OMToCLHandoff {
  return {
    handoffId: 'handoff-1',
    sourceLayer: 'OM',
    sourceBlock: 'OM-09',
    targetLayer: 'CL',
    targetBlock: 'CL-01',
    payload: validPayload(),
    correlationId: 'corr-1',
    lineage: [
      { layer: 'OM', block: 'OM-09', recordId: 'obs-1', timestamp: '2026-07-22T00:00:00.000Z', action: 'observation_recorded' },
    ],
    status: 'ready',
    createdAt: '2026-07-22T00:00:00.000Z',
    ...overrides,
  };
}

describe('OM→CL contract types', () => {
  it('a fully-populated handoff satisfies the type and validates', () => {
    const result = validateOMToCLHandoff(validHandoff());
    expect(result.reasons).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('the handoff is JSON-serializable round-trip without loss', () => {
    const handoff = validHandoff();
    const roundTripped = JSON.parse(JSON.stringify(handoff)) as OMToCLHandoff;
    expect(roundTripped).toEqual(handoff);
    expect(validateOMToCLHandoff(roundTripped).valid).toBe(true);
  });
});

describe('OM→CL runtime validation', () => {
  it('rejects null and non-objects with an explicit reason', () => {
    expect(validateOMToCLHandoff(null).reasons).toContain('handoff_required');
    expect(validateOMToCLHandoff('x').valid).toBe(false);
  });

  it('rejects wrong source/target layers', () => {
    const h = validHandoff({ sourceLayer: 'ABA', targetLayer: 'DA' });
    const reasons = validateOMToCLHandoff(h).reasons;
    expect(reasons).toContain('source_layer_must_be_OM');
    expect(reasons).toContain('target_layer_must_be_CL');
  });

  it('rejects a non-ready handoff status', () => {
    const h = validHandoff({ status: 'blocked' });
    expect(validateOMToCLHandoff(h).reasons).toContain('handoff_status_must_be_ready');
  });

  it('rejects missing tenant/workspace/business identity with explicit reasons', () => {
    const h = validHandoff();
    h.payload.tenantId = '';
    (h.payload as { workspaceId?: string }).workspaceId = undefined;
    (h.payload as { businessId?: string }).businessId = undefined;
    const reasons = validateOMToCLHandoff(h).reasons;
    expect(reasons).toContain('tenant_id_required');
    expect(reasons).toContain('workspace_id_required');
    expect(reasons).toContain('business_id_required');
  });

  it('rejects a missing idempotency key', () => {
    const h = validHandoff();
    (h.payload as { idempotencyKey: string }).idempotencyKey = '';
    expect(validateOMToCLHandoff(h).reasons).toContain('idempotency_key_required');
  });

  it('rejects a feedback package that is not ready (still draft)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).feedbackStatus = 'draft';
    expect(validateOMToCLHandoff(h).reasons).toContain('feedback_not_ready');
  });

  it('rejects a feedback package already marked published — must be handed off exactly once as ready', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).feedbackStatus = 'published';
    expect(validateOMToCLHandoff(h).reasons).toContain('feedback_not_ready');
  });

  it('rejects an invalid observation version', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).observationVersion = 0;
    expect(validateOMToCLHandoff(h).reasons).toContain('observation_version_invalid');
  });

  it('rejects missing observation/feedback ids', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).observationId = '';
    (h.payload as unknown as Record<string, unknown>).feedbackPackageId = '';
    (h.payload as unknown as Record<string, unknown>).feedbackPackageVersionId = '';
    const reasons = validateOMToCLHandoff(h).reasons;
    expect(reasons).toContain('observation_id_required');
    expect(reasons).toContain('feedback_package_id_required');
    expect(reasons).toContain('feedback_package_version_id_required');
  });

  it('rejects an empty findings collection', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).findings = [];
    expect(validateOMToCLHandoff(h).reasons).toContain('findings_required');
  });

  it('rejects a malformed finding entry', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).findings = [{ findingCode: 'f-1' }];
    expect(validateOMToCLHandoff(h).reasons).toContain('malformed_finding_entry');
  });

  it('rejects a malformed review action entry', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).reviewActions = [{ actionCode: 'a-1' }];
    expect(validateOMToCLHandoff(h).reasons).toContain('malformed_review_action_entry');
  });

  it('rejects a malformed variance summary entry', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).varianceSummary = [{ metricCode: 'revenue' }];
    expect(validateOMToCLHandoff(h).reasons).toContain('malformed_variance_summary_entry');
  });

  it('accepts an empty variance-summary array (not every observation has variance runs)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).varianceSummary = [];
    expect(validateOMToCLHandoff(h).valid).toBe(true);
  });

  it('rejects missing evidence', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).evidenceReferences = [];
    expect(validateOMToCLHandoff(h).reasons).toContain('missing_evidence');
  });

  it('rejects a target layer other than continuous_learning', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).targetLayer = 'outcome_monitoring';
    expect(validateOMToCLHandoff(h).reasons).toContain('target_layer_invalid');
  });

  it('rejects a missing publication package id', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).omPublicationPackageId = '';
    expect(validateOMToCLHandoff(h).reasons).toContain('om_publication_package_id_required');
  });

  it('rejects an invalid publishedAt timestamp', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).publishedAt = 'not-a-date';
    expect(validateOMToCLHandoff(h).reasons).toContain('published_at_invalid');
  });

  it('rejects an unsupported contract version', () => {
    const h = validHandoff();
    (h.payload as { contractVersion: string }).contractVersion = '0.0.1';
    expect(validateOMToCLHandoff(h).reasons).toContain('contract_version_unsupported');
  });

  it('rejects a payload exceeding the 512 KiB bound', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).oversized = 'x'.repeat(600 * 1024);
    expect(validateOMToCLHandoff(h).reasons).toContain('payload_too_large');
  });

  it('rejects credential-like keys anywhere in the payload', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).apiKey = 'secret-value';
    expect(validateOMToCLHandoff(h).reasons.some((r) => r.startsWith('credential_like_field_at_'))).toBe(true);
  });

  it('rejects __proto__/prototype/constructor keys anywhere in the payload', () => {
    const h = validHandoff();
    Object.defineProperty(h.payload, '__proto__', { value: { polluted: true }, enumerable: true, configurable: true });
    const reasons = validateOMToCLHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('dangerous_key_at_'))).toBe(true);
  });

  it('rejects functions anywhere in the handoff (not serializable)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).callback = () => 42;
    const reasons = validateOMToCLHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('unserializable_function_at_'))).toBe(true);
  });

  it('rejects non-plain objects (DOM-like / class instances)', () => {
    class FakeDOMNode { tag = 'div'; }
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).node = new FakeDOMNode();
    const reasons = validateOMToCLHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('non_plain_object_at_'))).toBe(true);
  });

  it('rejects embedded learning-update fields — OM must not synthesize learning updates', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).learningUpdate = { applied: true };
    (h.payload as unknown as Record<string, unknown>).learningRecord = { id: 'lr-1' };
    const reasons = validateOMToCLHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_learningUpdate');
    expect(reasons).toContain('forbidden_field_learningRecord');
  });

  it('rejects embedded model/policy-revision fields — Continuous Learning holds sole authority to revise policy', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).modelUpdate = { version: 2 };
    (h.payload as unknown as Record<string, unknown>).policyUpdate = { code: 'p-1' };
    (h.payload as unknown as Record<string, unknown>).policyRevision = { code: 'p-1' };
    (h.payload as unknown as Record<string, unknown>).trainingUpdate = { dataset: 'd-1' };
    const reasons = validateOMToCLHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_modelUpdate');
    expect(reasons).toContain('forbidden_field_policyUpdate');
    expect(reasons).toContain('forbidden_field_policyRevision');
    expect(reasons).toContain('forbidden_field_trainingUpdate');
  });

  it('rejects embedded decision/recommendation/approval override fields — OM must not revise upstream decisions', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).decisionOverride = { id: 'dec-1' };
    (h.payload as unknown as Record<string, unknown>).decisionRevision = { id: 'dec-1' };
    (h.payload as unknown as Record<string, unknown>).recommendationOverride = { id: 'rec-1' };
    (h.payload as unknown as Record<string, unknown>).approvalOverride = { id: 'appr-1' };
    const reasons = validateOMToCLHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_decisionOverride');
    expect(reasons).toContain('forbidden_field_decisionRevision');
    expect(reasons).toContain('forbidden_field_recommendationOverride');
    expect(reasons).toContain('forbidden_field_approvalOverride');
  });

  it('rejects embedded execution-result fields — observation is distinct from execution, OM never executes', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).executionResult = { ok: true };
    (h.payload as unknown as Record<string, unknown>).actionTaken = 'deployed';
    const reasons = validateOMToCLHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_executionResult');
    expect(reasons).toContain('forbidden_field_actionTaken');
  });

  it('rejects a summary that is missing or blank', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).summary = '   ';
    expect(validateOMToCLHandoff(h).reasons).toContain('summary_required');
  });
});
