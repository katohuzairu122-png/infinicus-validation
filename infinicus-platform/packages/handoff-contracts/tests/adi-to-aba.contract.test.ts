// ADI → ABA contract type + runtime-validation tests (BUILD-14 gates).
import { describe, expect, it } from 'vitest';
import {
  ADI_TO_ABA_CONTRACT_VERSION,
  READY_RECOMMENDATION_STATUS,
  REQUIRED_TARGET_LAYER,
  validateADIToABAHandoff,
  type ADIToABAHandoff,
  type ADIToABAHandoffPayload,
} from '../src/adi-to-aba';

function validPayload(): ADIToABAHandoffPayload {
  return {
    contractVersion: ADI_TO_ABA_CONTRACT_VERSION,
    tenantId: 't-1',
    workspaceId: 'ws-1',
    businessId: 'b-1',
    idempotencyKey: 'rec-1::adi-to-aba',
    decisionCaseId: 'case-1',
    recommendationId: 'rec-1',
    recommendationVersionId: 'recv-1',
    recommendationVersion: 1,
    recommendationStatus: READY_RECOMMENDATION_STATUS,
    summary: 'Expand into the secondary market within 90 days.',
    rationales: [{ rationaleCode: 'rat-1', statement: 'Simulated survival rate exceeds threshold.' }],
    implementationSteps: [{ stepNumber: 1, description: 'Secure lease for secondary location.' }],
    confidence: {
      confidence: 0.82,
      uncertainties: ['demand_forecast_variance'],
      limitations: ['engine_v3_does_not_support_seeded_reproducibility'],
      assumptions: ['capital_availability'],
    },
    risks: [{ alternativeId: 'alt-1', severity: 'medium', description: 'Lease commitment risk.' }],
    evidenceReferences: ['adi://decision_evidence/ev-1'],
    adiPublicationPackageId: 'pub-1',
    targetLayer: REQUIRED_TARGET_LAYER,
    targetBlock: 'ABA-01',
    publishedAt: '2026-07-22T00:00:00.000Z',
  };
}

function validHandoff(overrides: Partial<ADIToABAHandoff> = {}): ADIToABAHandoff {
  return {
    handoffId: 'handoff-1',
    sourceLayer: 'ADI',
    sourceBlock: 'ADI-06',
    targetLayer: 'ABA',
    targetBlock: 'ABA-01',
    payload: validPayload(),
    correlationId: 'corr-1',
    lineage: [
      { layer: 'ADI', block: 'ADI-06', recordId: 'rec-1', timestamp: '2026-07-22T00:00:00.000Z', action: 'recommendation_published' },
    ],
    status: 'ready',
    createdAt: '2026-07-22T00:00:00.000Z',
    ...overrides,
  };
}

describe('ADI→ABA contract types', () => {
  it('a fully-populated handoff satisfies the type and validates', () => {
    const result = validateADIToABAHandoff(validHandoff());
    expect(result.reasons).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('the handoff is JSON-serializable round-trip without loss', () => {
    const handoff = validHandoff();
    const roundTripped = JSON.parse(JSON.stringify(handoff)) as ADIToABAHandoff;
    expect(roundTripped).toEqual(handoff);
    expect(validateADIToABAHandoff(roundTripped).valid).toBe(true);
  });
});

describe('ADI→ABA runtime validation', () => {
  it('rejects null and non-objects with an explicit reason', () => {
    expect(validateADIToABAHandoff(null).reasons).toContain('handoff_required');
    expect(validateADIToABAHandoff('x').valid).toBe(false);
  });

  it('rejects wrong source/target layers', () => {
    const h = validHandoff({ sourceLayer: 'SIM', targetLayer: 'OM' });
    const reasons = validateADIToABAHandoff(h).reasons;
    expect(reasons).toContain('source_layer_must_be_ADI');
    expect(reasons).toContain('target_layer_must_be_ABA');
  });

  it('rejects a non-ready handoff status', () => {
    const h = validHandoff({ status: 'blocked' });
    expect(validateADIToABAHandoff(h).reasons).toContain('handoff_status_must_be_ready');
  });

  it('rejects missing tenant/workspace/business identity with explicit reasons', () => {
    const h = validHandoff();
    h.payload.tenantId = '';
    (h.payload as { workspaceId?: string }).workspaceId = undefined;
    (h.payload as { businessId?: string }).businessId = undefined;
    const reasons = validateADIToABAHandoff(h).reasons;
    expect(reasons).toContain('tenant_id_required');
    expect(reasons).toContain('workspace_id_required');
    expect(reasons).toContain('business_id_required');
  });

  it('rejects a missing idempotency key', () => {
    const h = validHandoff();
    (h.payload as { idempotencyKey: string }).idempotencyKey = '';
    expect(validateADIToABAHandoff(h).reasons).toContain('idempotency_key_required');
  });

  it('rejects a recommendation that is not published', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).recommendationStatus = 'draft';
    expect(validateADIToABAHandoff(h).reasons).toContain('recommendation_not_published');
  });

  it('rejects an invalid recommendation version', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).recommendationVersion = 0;
    expect(validateADIToABAHandoff(h).reasons).toContain('recommendation_version_invalid');
  });

  it('rejects a missing decision case / recommendation / recommendation version id', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).decisionCaseId = '';
    (h.payload as unknown as Record<string, unknown>).recommendationId = '';
    (h.payload as unknown as Record<string, unknown>).recommendationVersionId = '';
    const reasons = validateADIToABAHandoff(h).reasons;
    expect(reasons).toContain('decision_case_id_required');
    expect(reasons).toContain('recommendation_id_required');
    expect(reasons).toContain('recommendation_version_id_required');
  });

  it('rejects an empty rationales collection', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).rationales = [];
    expect(validateADIToABAHandoff(h).reasons).toContain('rationales_required');
  });

  it('rejects a malformed rationale entry', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).rationales = [{ rationaleCode: 'rat-1' }];
    expect(validateADIToABAHandoff(h).reasons).toContain('malformed_rationale_entry');
  });

  it('rejects a malformed implementation step entry', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).implementationSteps = [{ stepNumber: 'one', description: 'x' }];
    expect(validateADIToABAHandoff(h).reasons).toContain('malformed_implementation_step_entry');
  });

  it('rejects an invalid confidence score', () => {
    const h = validHandoff();
    (h.payload.confidence as unknown as Record<string, unknown>).confidence = 1.5;
    expect(validateADIToABAHandoff(h).reasons).toContain('confidence_score_invalid');
  });

  it('rejects a malformed risk entry (unknown severity)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).risks = [{ alternativeId: 'alt-1', severity: 'catastrophic', description: 'x' }];
    expect(validateADIToABAHandoff(h).reasons).toContain('malformed_risk_entry');
  });

  it('rejects missing evidence', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).evidenceReferences = [];
    expect(validateADIToABAHandoff(h).reasons).toContain('missing_evidence');
  });

  it('rejects a target layer other than approved_business_action', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).targetLayer = 'outcome_monitoring';
    expect(validateADIToABAHandoff(h).reasons).toContain('target_layer_invalid');
  });

  it('rejects a missing publication package id', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).adiPublicationPackageId = '';
    expect(validateADIToABAHandoff(h).reasons).toContain('adi_publication_package_id_required');
  });

  it('rejects an invalid publishedAt timestamp', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).publishedAt = 'not-a-date';
    expect(validateADIToABAHandoff(h).reasons).toContain('published_at_invalid');
  });

  it('rejects an unsupported contract version', () => {
    const h = validHandoff();
    (h.payload as { contractVersion: string }).contractVersion = '0.0.1';
    expect(validateADIToABAHandoff(h).reasons).toContain('contract_version_unsupported');
  });

  it('rejects a payload exceeding the 512 KiB bound', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).oversized = 'x'.repeat(600 * 1024);
    expect(validateADIToABAHandoff(h).reasons).toContain('payload_too_large');
  });

  it('rejects credential-like keys anywhere in the payload', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).apiKey = 'secret-value';
    expect(validateADIToABAHandoff(h).reasons.some((r) => r.startsWith('credential_like_field_at_'))).toBe(true);
  });

  it('rejects __proto__/prototype/constructor keys anywhere in the payload', () => {
    const h = validHandoff();
    Object.defineProperty(h.payload, '__proto__', { value: { polluted: true }, enumerable: true, configurable: true });
    const reasons = validateADIToABAHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('dangerous_key_at_'))).toBe(true);
  });

  it('rejects functions anywhere in the handoff (not serializable)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).callback = () => 42;
    const reasons = validateADIToABAHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('unserializable_function_at_'))).toBe(true);
  });

  it('rejects non-plain objects (DOM-like / class instances)', () => {
    class FakeDOMNode { tag = 'div'; }
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).node = new FakeDOMNode();
    const reasons = validateADIToABAHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('non_plain_object_at_'))).toBe(true);
  });

  it('rejects an embedded approval field — ADI must not approve its own recommendation', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).approval = { approved: true };
    (h.payload as unknown as Record<string, unknown>).approvedBy = 'user-1';
    const reasons = validateADIToABAHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_approval');
    expect(reasons).toContain('forbidden_field_approvedBy');
  });

  it('rejects embedded execution fields — ADI must not execute actions', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).executionResult = { ok: true };
    (h.payload as unknown as Record<string, unknown>).execute = true;
    const reasons = validateADIToABAHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_executionResult');
    expect(reasons).toContain('forbidden_field_execute');
  });

  it('rejects embedded outcome fields — ADI must not record outcomes', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).outcome = { success: true };
    (h.payload as unknown as Record<string, unknown>).observedOutcome = { metric: 1 };
    const reasons = validateADIToABAHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_outcome');
    expect(reasons).toContain('forbidden_field_observedOutcome');
  });

  it('rejects embedded learning-update fields — ADI must not create learning updates', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).learningUpdate = { applied: true };
    const reasons = validateADIToABAHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_learningUpdate');
  });

  it('accepts an empty implementation-steps array (not every recommendation prescribes steps)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).implementationSteps = [];
    expect(validateADIToABAHandoff(h).valid).toBe(true);
  });

  it('rejects a summary that is missing or blank', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).summary = '   ';
    expect(validateADIToABAHandoff(h).reasons).toContain('summary_required');
  });
});
