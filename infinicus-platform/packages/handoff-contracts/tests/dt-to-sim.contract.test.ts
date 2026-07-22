// DT → SIM contract type + runtime-validation tests (BUILD-12 downstream boundary).
import { describe, expect, it } from 'vitest';
import {
  DT_TO_SIM_CONTRACT_VERSION,
  validateDTToSIMHandoff,
  type DTToSIMHandoff,
  type DTToSIMHandoffPayload,
} from '../src/dt-to-sim';

function validPayload(): DTToSIMHandoffPayload {
  return {
    contractVersion: DT_TO_SIM_CONTRACT_VERSION,
    tenantId: 'tenant-1',
    workspaceId: 'ws-1',
    businessId: 'biz-1',
    digitalTwinInstanceId: 'dt-instance-1',
    snapshotId: 'dt-snapshot-1',
    snapshotVersion: 1,
    scenarioBaselineId: 'dt-baseline-1',
    scenarioBaselineVersion: 1,
    objective: 'growth scenario',
    variables: [{ variableCode: 'revenue', value: 1000, unit: 'currency' }],
    assumptions: ['growth continues at 5%'],
    constraints: [{ constraintCode: 'cns-1', operator: 'lte', operand: 5000 }],
    uncertaintyAssignments: [{ variableCode: 'revenue', distributionType: 'normal', parameters: { mean: 1000, sd: 100 } }],
    evidenceReferences: ['dt-snapshot-1', 'dt-baseline-1'],
    quality: { confidence: 0.85, freshnessSeconds: 1800 },
    effectiveAt: '2026-01-01T00:00:00.000Z',
    idempotencyKey: 'dt-baseline-1::sim-01',
  };
}

function validHandoff(overrides: Partial<DTToSIMHandoff> = {}): DTToSIMHandoff {
  return {
    handoffId: 'handoff-dt-sim-1',
    sourceLayer: 'DT',
    sourceBlock: 'DT-13',
    targetLayer: 'SIM',
    targetBlock: 'SIM-01',
    payload: validPayload(),
    correlationId: 'corr-dt-sim-1',
    lineage: [
      { layer: 'DT', block: 'DT-13', recordId: 'dt-baseline-1', timestamp: '2026-01-01T00:00:00.000Z', action: 'scenario_baseline_published' },
    ],
    status: 'ready',
    createdAt: '2026-01-01T00:00:01.000Z',
    ...overrides,
  };
}

describe('DT→SIM contract types', () => {
  it('a fully-populated handoff validates with zero reasons', () => {
    const result = validateDTToSIMHandoff(validHandoff());
    expect(result.reasons).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('is JSON-serializable round-trip without loss', () => {
    const handoff = validHandoff();
    const roundTripped = JSON.parse(JSON.stringify(handoff)) as DTToSIMHandoff;
    expect(roundTripped).toEqual(handoff);
    expect(validateDTToSIMHandoff(roundTripped).valid).toBe(true);
  });
});

describe('DT→SIM runtime validation', () => {
  it('rejects null / non-object handoffs', () => {
    expect(validateDTToSIMHandoff(null).reasons).toContain('handoff_required');
    expect(validateDTToSIMHandoff('x').valid).toBe(false);
  });

  it('rejects missing tenant/workspace/business ownership', () => {
    const h = validHandoff();
    h.payload.tenantId = '';
    (h.payload as { workspaceId?: string }).workspaceId = undefined;
    h.payload.businessId = '';
    const reasons = validateDTToSIMHandoff(h).reasons;
    expect(reasons).toContain('tenant_id_required');
    expect(reasons).toContain('workspace_id_required');
    expect(reasons).toContain('business_id_required');
  });

  it('rejects wrong source/target layers', () => {
    const h = validHandoff({ sourceLayer: 'BI', targetLayer: 'ADI' });
    const reasons = validateDTToSIMHandoff(h).reasons;
    expect(reasons).toContain('source_layer_must_be_DT');
    expect(reasons).toContain('target_layer_must_be_SIM');
  });

  it('rejects an unsupported contract version', () => {
    const h = validHandoff();
    (h.payload as { contractVersion: string }).contractVersion = '0.9.0';
    expect(validateDTToSIMHandoff(h).reasons).toContain('contract_version_unsupported');
  });

  it('rejects missing digitalTwinInstanceId, snapshotId, or scenarioBaselineId', () => {
    const h = validHandoff();
    (h.payload as { digitalTwinInstanceId: string }).digitalTwinInstanceId = '';
    (h.payload as { snapshotId: string }).snapshotId = '';
    (h.payload as { scenarioBaselineId: string }).scenarioBaselineId = '';
    const reasons = validateDTToSIMHandoff(h).reasons;
    expect(reasons).toContain('digital_twin_instance_id_required');
    expect(reasons).toContain('snapshot_id_required');
    expect(reasons).toContain('scenario_baseline_id_required');
  });

  it('rejects a non-integer or zero snapshotVersion / scenarioBaselineVersion', () => {
    const h = validHandoff();
    (h.payload as { snapshotVersion: number }).snapshotVersion = 0;
    (h.payload as { scenarioBaselineVersion: number }).scenarioBaselineVersion = -1;
    const reasons = validateDTToSIMHandoff(h).reasons;
    expect(reasons).toContain('snapshot_version_invalid');
    expect(reasons).toContain('scenario_baseline_version_invalid');
  });

  it('rejects a missing objective', () => {
    const h = validHandoff();
    (h.payload as { objective: string }).objective = '';
    expect(validateDTToSIMHandoff(h).reasons).toContain('objective_required');
  });

  it('rejects an empty variables collection', () => {
    const h = validHandoff();
    (h.payload as { variables: unknown }).variables = [];
    expect(validateDTToSIMHandoff(h).reasons).toContain('variables_required');
  });

  it('rejects a malformed variable entry', () => {
    const h = validHandoff();
    (h.payload as { variables: unknown }).variables = [{ value: 1 }];
    expect(validateDTToSIMHandoff(h).reasons).toContain('malformed_variable_entry');
  });

  it('rejects a malformed constraint entry (unknown operator)', () => {
    const h = validHandoff();
    (h.payload as { constraints: unknown }).constraints = [{ constraintCode: 'x', operator: 'not_an_op', operand: 1 }];
    expect(validateDTToSIMHandoff(h).reasons).toContain('malformed_constraint_entry');
  });

  it('rejects a malformed uncertainty assignment (unknown distribution type)', () => {
    const h = validHandoff();
    (h.payload as { uncertaintyAssignments: unknown }).uncertaintyAssignments = [
      { variableCode: 'revenue', distributionType: 'not_a_distribution', parameters: {} },
    ];
    expect(validateDTToSIMHandoff(h).reasons).toContain('malformed_uncertainty_assignment');
  });

  it('rejects when every numeric variable is missing an uncertainty assignment', () => {
    const h = validHandoff();
    (h.payload as { uncertaintyAssignments: unknown }).uncertaintyAssignments = [];
    expect(validateDTToSIMHandoff(h).reasons).toContain('missing_uncertainty_for_probabilistic_variables');
  });

  it('rejects an empty evidence references collection', () => {
    const h = validHandoff();
    (h.payload as { evidenceReferences: unknown }).evidenceReferences = [];
    expect(validateDTToSIMHandoff(h).reasons).toContain('missing_evidence');
  });

  it('rejects out-of-bounds quality confidence', () => {
    const h = validHandoff();
    (h.payload as { quality: unknown }).quality = { confidence: 1.5, freshnessSeconds: -1 };
    const reasons = validateDTToSIMHandoff(h).reasons;
    expect(reasons).toContain('quality_confidence_invalid');
    expect(reasons).toContain('quality_freshness_invalid');
  });

  it('rejects a malformed effectiveAt timestamp', () => {
    const h = validHandoff();
    (h.payload as { effectiveAt: string }).effectiveAt = 'not-a-date';
    expect(validateDTToSIMHandoff(h).reasons).toContain('effective_at_invalid');
  });

  it('rejects a missing idempotency key', () => {
    const h = validHandoff();
    (h.payload as { idempotencyKey: string }).idempotencyKey = '';
    expect(validateDTToSIMHandoff(h).reasons).toContain('idempotency_key_required');
  });

  it('rejects functions and non-plain objects anywhere in the handoff', () => {
    const withFn = validHandoff();
    (withFn.payload.uncertaintyAssignments[0].parameters as Record<string, unknown>).cb = () => 1;
    expect(validateDTToSIMHandoff(withFn).reasons.some((r) => r.startsWith('unserializable_function_at_'))).toBe(true);

    class FakeNode { tag = 'div'; }
    const withNode = validHandoff();
    (withNode.payload as unknown as Record<string, unknown>).node = new FakeNode();
    expect(validateDTToSIMHandoff(withNode).reasons.some((r) => r.startsWith('non_plain_object_at_'))).toBe(true);
  });

  it('rejects embedded ADI/ABA recommendation, approval, or decision content', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).recommendation = { go: true };
    (h.payload as unknown as Record<string, unknown>).approval = { approved: true };
    (h.payload as unknown as Record<string, unknown>).decision = { outcome: 'approved' };
    const reasons = validateDTToSIMHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_recommendation');
    expect(reasons).toContain('forbidden_field_approval');
    expect(reasons).toContain('forbidden_field_decision');
  });

  it('rejects credential-like keys anywhere in the payload', () => {
    const h = validHandoff();
    (h.payload.uncertaintyAssignments[0].parameters as Record<string, unknown>).secret = 'value';
    expect(validateDTToSIMHandoff(h).reasons.some((r) => r.startsWith('credential_like_field_at_'))).toBe(true);
  });

  it('preserves correlation and lineage requirements', () => {
    const h = validHandoff({ correlationId: '' });
    (h as { lineage: unknown }).lineage = 'not-an-array';
    const reasons = validateDTToSIMHandoff(h).reasons;
    expect(reasons).toContain('correlationId_required');
    expect(reasons).toContain('lineage_array_required');
  });

  it('rejects a handoff not in ready status', () => {
    const h = validHandoff({ status: 'failed' });
    expect(validateDTToSIMHandoff(h).reasons).toContain('handoff_status_must_be_ready');
  });
});
