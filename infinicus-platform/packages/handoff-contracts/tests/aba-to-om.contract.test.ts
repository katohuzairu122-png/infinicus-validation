// ABA → OM contract type + runtime-validation tests (BUILD-15 gates).
import { describe, expect, it } from 'vitest';
import {
  ABA_TO_OM_CONTRACT_VERSION,
  OM_REQUIRED_TARGET_LAYER,
  validateABAToOMHandoff,
  type ABAToOMHandoff,
  type ABAToOMHandoffPayload,
} from '../src/aba-to-om';

function validPayload(): ABAToOMHandoffPayload {
  return {
    contractVersion: ABA_TO_OM_CONTRACT_VERSION,
    tenantId: 't-1',
    workspaceId: 'ws-1',
    businessId: 'b-1',
    idempotencyKey: 'dec-1::aba-to-om',
    decisionId: 'dec-1',
    decisionVersionId: 'decv-1',
    decisionVersion: 1,
    decisionStatus: 'approved',
    approvedActionId: 'act-1',
    approvedActionVersionId: 'actv-1',
    summary: 'Approved expansion into the secondary market within 90 days.',
    rationales: [{ rationaleCode: 'rat-1', statement: 'Meets capital exposure policy.' }],
    actionSteps: [{ stepNumber: 1, description: 'Secure lease for secondary location.' }],
    controlGates: [{ gateCode: 'gate-1', gateType: 'compliance', status: 'passed' }],
    evidenceReferences: ['aba://approval_decision_versions/decv-1'],
    abaPublicationPackageId: 'pub-1',
    targetLayer: OM_REQUIRED_TARGET_LAYER,
    targetBlock: 'OM-01',
    publishedAt: '2026-07-22T00:00:00.000Z',
  };
}

function validHandoff(overrides: Partial<ABAToOMHandoff> = {}): ABAToOMHandoff {
  return {
    handoffId: 'handoff-1',
    sourceLayer: 'ABA',
    sourceBlock: 'ABA-09',
    targetLayer: 'OM',
    targetBlock: 'OM-01',
    payload: validPayload(),
    correlationId: 'corr-1',
    lineage: [
      { layer: 'ABA', block: 'ABA-09', recordId: 'dec-1', timestamp: '2026-07-22T00:00:00.000Z', action: 'decision_approved' },
    ],
    status: 'ready',
    createdAt: '2026-07-22T00:00:00.000Z',
    ...overrides,
  };
}

describe('ABA→OM contract types', () => {
  it('a fully-populated handoff satisfies the type and validates', () => {
    const result = validateABAToOMHandoff(validHandoff());
    expect(result.reasons).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('accepts approved_with_modifications as a decided status', () => {
    const h = validHandoff();
    h.payload.decisionStatus = 'approved_with_modifications';
    expect(validateABAToOMHandoff(h).valid).toBe(true);
  });

  it('the handoff is JSON-serializable round-trip without loss', () => {
    const handoff = validHandoff();
    const roundTripped = JSON.parse(JSON.stringify(handoff)) as ABAToOMHandoff;
    expect(roundTripped).toEqual(handoff);
    expect(validateABAToOMHandoff(roundTripped).valid).toBe(true);
  });
});

describe('ABA→OM runtime validation', () => {
  it('rejects null and non-objects with an explicit reason', () => {
    expect(validateABAToOMHandoff(null).reasons).toContain('handoff_required');
    expect(validateABAToOMHandoff('x').valid).toBe(false);
  });

  it('rejects wrong source/target layers', () => {
    const h = validHandoff({ sourceLayer: 'ADI', targetLayer: 'CL' });
    const reasons = validateABAToOMHandoff(h).reasons;
    expect(reasons).toContain('source_layer_must_be_ABA');
    expect(reasons).toContain('target_layer_must_be_OM');
  });

  it('rejects a non-ready handoff status', () => {
    const h = validHandoff({ status: 'failed' });
    expect(validateABAToOMHandoff(h).reasons).toContain('handoff_status_must_be_ready');
  });

  it('rejects missing tenant/workspace/business identity with explicit reasons', () => {
    const h = validHandoff();
    h.payload.tenantId = '';
    (h.payload as { workspaceId?: string }).workspaceId = undefined;
    (h.payload as { businessId?: string }).businessId = undefined;
    const reasons = validateABAToOMHandoff(h).reasons;
    expect(reasons).toContain('tenant_id_required');
    expect(reasons).toContain('workspace_id_required');
    expect(reasons).toContain('business_id_required');
  });

  it('rejects a missing idempotency key', () => {
    const h = validHandoff();
    (h.payload as { idempotencyKey: string }).idempotencyKey = '';
    expect(validateABAToOMHandoff(h).reasons).toContain('idempotency_key_required');
  });

  it('rejects a decision that is not decided (still draft)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).decisionStatus = 'draft';
    expect(validateABAToOMHandoff(h).reasons).toContain('decision_not_decided');
  });

  it('rejects a rejected decision — rejected decisions are never published to Outcome Monitoring', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).decisionStatus = 'rejected';
    expect(validateABAToOMHandoff(h).reasons).toContain('decision_not_decided');
  });

  it('rejects an invalid decision version', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).decisionVersion = 0;
    expect(validateABAToOMHandoff(h).reasons).toContain('decision_version_invalid');
  });

  it('rejects missing decision/action ids', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).decisionId = '';
    (h.payload as unknown as Record<string, unknown>).approvedActionId = '';
    (h.payload as unknown as Record<string, unknown>).approvedActionVersionId = '';
    const reasons = validateABAToOMHandoff(h).reasons;
    expect(reasons).toContain('decision_id_required');
    expect(reasons).toContain('approved_action_id_required');
    expect(reasons).toContain('approved_action_version_id_required');
  });

  it('rejects an empty rationales collection', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).rationales = [];
    expect(validateABAToOMHandoff(h).reasons).toContain('rationales_required');
  });

  it('rejects a malformed rationale entry', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).rationales = [{ rationaleCode: 'rat-1' }];
    expect(validateABAToOMHandoff(h).reasons).toContain('malformed_rationale_entry');
  });

  it('rejects a malformed action step entry', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).actionSteps = [{ stepNumber: 'one', description: 'x' }];
    expect(validateABAToOMHandoff(h).reasons).toContain('malformed_action_step_entry');
  });

  it('rejects a malformed control gate entry (unknown status)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).controlGates = [{ gateCode: 'g-1', gateType: 'manual', status: 'pending' }];
    expect(validateABAToOMHandoff(h).reasons).toContain('malformed_control_gate_entry');
  });

  it('rejects missing evidence', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).evidenceReferences = [];
    expect(validateABAToOMHandoff(h).reasons).toContain('missing_evidence');
  });

  it('rejects a target layer other than outcome_monitoring', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).targetLayer = 'continuous_learning';
    expect(validateABAToOMHandoff(h).reasons).toContain('target_layer_invalid');
  });

  it('rejects a missing publication package id', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).abaPublicationPackageId = '';
    expect(validateABAToOMHandoff(h).reasons).toContain('aba_publication_package_id_required');
  });

  it('rejects an invalid publishedAt timestamp', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).publishedAt = 'not-a-date';
    expect(validateABAToOMHandoff(h).reasons).toContain('published_at_invalid');
  });

  it('rejects an unsupported contract version', () => {
    const h = validHandoff();
    (h.payload as { contractVersion: string }).contractVersion = '0.0.1';
    expect(validateABAToOMHandoff(h).reasons).toContain('contract_version_unsupported');
  });

  it('rejects a payload exceeding the 512 KiB bound', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).oversized = 'x'.repeat(600 * 1024);
    expect(validateABAToOMHandoff(h).reasons).toContain('payload_too_large');
  });

  it('rejects credential-like keys anywhere in the payload', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).apiKey = 'secret-value';
    expect(validateABAToOMHandoff(h).reasons.some((r) => r.startsWith('credential_like_field_at_'))).toBe(true);
  });

  it('rejects __proto__/prototype/constructor keys anywhere in the payload', () => {
    const h = validHandoff();
    Object.defineProperty(h.payload, '__proto__', { value: { polluted: true }, enumerable: true, configurable: true });
    const reasons = validateABAToOMHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('dangerous_key_at_'))).toBe(true);
  });

  it('rejects functions anywhere in the handoff (not serializable)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).callback = () => 42;
    const reasons = validateABAToOMHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('unserializable_function_at_'))).toBe(true);
  });

  it('rejects non-plain objects (DOM-like / class instances)', () => {
    class FakeDOMNode { tag = 'div'; }
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).node = new FakeDOMNode();
    const reasons = validateABAToOMHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('non_plain_object_at_'))).toBe(true);
  });

  it('rejects embedded outcome fields — ABA must not record outcomes', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).outcome = { success: true };
    (h.payload as unknown as Record<string, unknown>).observedOutcome = { metric: 1 };
    const reasons = validateABAToOMHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_outcome');
    expect(reasons).toContain('forbidden_field_observedOutcome');
  });

  it('rejects embedded evaluation fields — Outcome Monitoring holds sole authority to evaluate outcomes', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).verdict = 'success';
    (h.payload as unknown as Record<string, unknown>).evaluationResult = { passed: true };
    const reasons = validateABAToOMHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_verdict');
    expect(reasons).toContain('forbidden_field_evaluationResult');
  });

  it('rejects embedded learning-update fields — ABA must not create learning updates', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).learningUpdate = { applied: true };
    const reasons = validateABAToOMHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_learningUpdate');
  });

  it('rejects embedded execution-result fields — approval is distinct from execution, ABA never executes', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).executionResult = { ok: true };
    (h.payload as unknown as Record<string, unknown>).actionTaken = 'deployed';
    const reasons = validateABAToOMHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_executionResult');
    expect(reasons).toContain('forbidden_field_actionTaken');
  });

  it('accepts an empty control-gates array (not every action has control gates)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).controlGates = [];
    expect(validateABAToOMHandoff(h).valid).toBe(true);
  });

  it('rejects a summary that is missing or blank', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).summary = '   ';
    expect(validateABAToOMHandoff(h).reasons).toContain('summary_required');
  });
});
