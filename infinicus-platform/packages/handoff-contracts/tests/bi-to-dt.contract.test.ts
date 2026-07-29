// BI → DT contract type + runtime-validation tests (BUILD-12 upstream boundary).
import { describe, expect, it } from 'vitest';
import {
  BI_TO_DT_CONTRACT_VERSION,
  BI_TO_DT_INTAKABLE_STATUSES,
  validateBIToDTHandoff,
  type BIToDTHandoff,
  type BIToDTHandoffPayload,
} from '../src/bi-to-dt';

function validPayload(): BIToDTHandoffPayload {
  return {
    contractVersion: BI_TO_DT_CONTRACT_VERSION,
    tenantId: 'tenant-1',
    workspaceId: 'ws-1',
    businessId: 'biz-1',
    biPublicationPackageId: 'bi-pub-pkg-1',
    insightPackageId: 'insight-pkg-1',
    insightVersion: 1,
    packageStatus: 'ready',
    targetBlock: 'DT-01',
    periodStart: '2026-01-01T00:00:00.000Z',
    periodEnd: '2026-02-01T00:00:00.000Z',
    source: { packageCode: 'bi-pkg-code-1', payloadReference: { format: 'jsonl' } },
    metrics: [{ metricCode: 'revenue', value: 100.5, unit: 'currency' }],
    findings: [{ findingCode: 'finding-1', summary: 'Revenue up', confidence: 0.8 }],
    risks: [{ riskCode: 'risk-1', severity: 'medium', likelihood: 0.3 }],
    constraints: [{ constraintCode: 'cns-1', operator: 'lte', operand: 1000 }],
    assumptions: [{ assumptionCode: 'asm-1', statement: 'Growth continues', source: 'declared' }],
    quality: { qualityScore: 0.9, freshnessSeconds: 3600, reliabilityScore: 0.85 },
    lineage: ['bi-metric-def-1', 'bi-finding-1'],
    schemaVersion: '1.0',
    idempotencyKey: 'bi-pkg-1::dt-01',
  };
}

function validHandoff(overrides: Partial<BIToDTHandoff> = {}): BIToDTHandoff {
  return {
    handoffId: 'handoff-bi-dt-1',
    sourceLayer: 'BI',
    sourceBlock: 'BI-11',
    targetLayer: 'DT',
    targetBlock: 'DT-01',
    payload: validPayload(),
    correlationId: 'corr-bi-dt-1',
    lineage: [
      { layer: 'BI', block: 'BI-11', recordId: 'bi-pub-pkg-1', timestamp: '2026-01-01T00:00:00.000Z', action: 'publication_package_ready' },
    ],
    status: 'ready',
    createdAt: '2026-01-01T00:00:01.000Z',
    ...overrides,
  };
}

describe('BI→DT contract types', () => {
  it('a fully-populated handoff validates with zero reasons', () => {
    const result = validateBIToDTHandoff(validHandoff());
    expect(result.reasons).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('is JSON-serializable round-trip without loss', () => {
    const handoff = validHandoff();
    const roundTripped = JSON.parse(JSON.stringify(handoff)) as BIToDTHandoff;
    expect(roundTripped).toEqual(handoff);
    expect(validateBIToDTHandoff(roundTripped).valid).toBe(true);
  });

  it('accepts both intakable statuses (ready, dispatched)', () => {
    for (const status of BI_TO_DT_INTAKABLE_STATUSES) {
      const h = validHandoff();
      h.payload.packageStatus = status;
      expect(validateBIToDTHandoff(h).valid).toBe(true);
    }
  });
});

describe('BI→DT runtime validation', () => {
  it('rejects null / non-object handoffs', () => {
    expect(validateBIToDTHandoff(null).reasons).toContain('handoff_required');
    expect(validateBIToDTHandoff('x').valid).toBe(false);
  });

  it('rejects a non-intakable package status (draft/failed/cancelled)', () => {
    for (const status of ['draft', 'failed', 'cancelled']) {
      const h = validHandoff();
      (h.payload as { packageStatus: string }).packageStatus = status;
      expect(validateBIToDTHandoff(h).reasons).toContain('package_status_not_intakable');
    }
  });

  it('rejects missing tenant/workspace/business ownership', () => {
    const h = validHandoff();
    h.payload.tenantId = '';
    (h.payload as { workspaceId?: string }).workspaceId = undefined;
    h.payload.businessId = '';
    const reasons = validateBIToDTHandoff(h).reasons;
    expect(reasons).toContain('tenant_id_required');
    expect(reasons).toContain('workspace_id_required');
    expect(reasons).toContain('business_id_required');
  });

  it('rejects wrong source/target layers', () => {
    const h = validHandoff({ sourceLayer: 'BO', targetLayer: 'SIM' });
    const reasons = validateBIToDTHandoff(h).reasons;
    expect(reasons).toContain('source_layer_must_be_BI');
    expect(reasons).toContain('target_layer_must_be_DT');
  });

  it('rejects an unsupported contract version', () => {
    const h = validHandoff();
    (h.payload as { contractVersion: string }).contractVersion = '0.9.0';
    expect(validateBIToDTHandoff(h).reasons).toContain('contract_version_unsupported');
  });

  it('rejects a missing biPublicationPackageId or insightPackageId', () => {
    const h = validHandoff();
    (h.payload as { biPublicationPackageId: string }).biPublicationPackageId = '';
    (h.payload as { insightPackageId: string }).insightPackageId = '';
    const reasons = validateBIToDTHandoff(h).reasons;
    expect(reasons).toContain('bi_publication_package_id_required');
    expect(reasons).toContain('insight_package_id_required');
  });

  it('rejects a non-integer or zero insightVersion', () => {
    const h = validHandoff();
    (h.payload as { insightVersion: number }).insightVersion = 0;
    expect(validateBIToDTHandoff(h).reasons).toContain('insight_version_invalid');
  });

  it('rejects an invalid publication period (end before start)', () => {
    const h = validHandoff();
    h.payload.periodStart = '2026-02-01T00:00:00.000Z';
    h.payload.periodEnd = '2026-01-01T00:00:00.000Z';
    expect(validateBIToDTHandoff(h).reasons).toContain('period_order_invalid');
  });

  it('rejects malformed period timestamps', () => {
    const h = validHandoff();
    h.payload.periodStart = 'not-a-date';
    expect(validateBIToDTHandoff(h).reasons).toContain('period_start_invalid');
  });

  it('rejects missing source reference or idempotency key', () => {
    const h = validHandoff();
    (h.payload as { source?: unknown }).source = undefined;
    (h.payload as { idempotencyKey: string }).idempotencyKey = '';
    const reasons = validateBIToDTHandoff(h).reasons;
    expect(reasons).toContain('source_reference_required');
    expect(reasons).toContain('idempotency_key_required');
  });

  it('rejects a malformed metric entry', () => {
    const h = validHandoff();
    (h.payload as { metrics: unknown }).metrics = [{ metricCode: 'x', value: 'not-a-number' }];
    expect(validateBIToDTHandoff(h).reasons).toContain('malformed_metric_entry');
  });

  it('rejects non-array evidence collections (findings/risks/constraints/assumptions)', () => {
    const h = validHandoff();
    (h.payload as { findings: unknown }).findings = 'not-an-array';
    (h.payload as { risks: unknown }).risks = 'not-an-array';
    (h.payload as { constraints: unknown }).constraints = 'not-an-array';
    (h.payload as { assumptions: unknown }).assumptions = 'not-an-array';
    const reasons = validateBIToDTHandoff(h).reasons;
    expect(reasons).toContain('findings_array_required');
    expect(reasons).toContain('risks_array_required');
    expect(reasons).toContain('constraints_array_required');
    expect(reasons).toContain('assumptions_array_required');
  });

  it('rejects an empty payload-level evidence lineage array', () => {
    const h = validHandoff();
    (h.payload as { lineage: unknown }).lineage = [];
    expect(validateBIToDTHandoff(h).reasons).toContain('missing_evidence_lineage');
  });

  it('rejects out-of-bounds quality scores', () => {
    const h = validHandoff();
    (h.payload as { quality: unknown }).quality = { qualityScore: 1.5, freshnessSeconds: -1, reliabilityScore: -0.1 };
    const reasons = validateBIToDTHandoff(h).reasons;
    expect(reasons).toContain('quality_qualityScore_invalid');
    expect(reasons).toContain('quality_freshness_invalid');
    expect(reasons).toContain('quality_reliabilityScore_invalid');
  });

  it('rejects functions and non-plain objects anywhere in the handoff', () => {
    const withFn = validHandoff();
    (withFn.payload.source.payloadReference as Record<string, unknown>).cb = () => 1;
    expect(validateBIToDTHandoff(withFn).reasons.some((r) => r.startsWith('unserializable_function_at_'))).toBe(true);

    class FakeNode { tag = 'div'; }
    const withNode = validHandoff();
    (withNode.payload as unknown as Record<string, unknown>).node = new FakeNode();
    expect(validateBIToDTHandoff(withNode).reasons.some((r) => r.startsWith('non_plain_object_at_'))).toBe(true);
  });

  it('rejects embedded Simulation/ADI/approval conclusions', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).simulationRun = { id: 'sim-1' };
    (h.payload as unknown as Record<string, unknown>).adiDecision = { go: true };
    (h.payload as unknown as Record<string, unknown>).approval = { approved: true };
    const reasons = validateBIToDTHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_simulationRun');
    expect(reasons).toContain('forbidden_field_adiDecision');
    expect(reasons).toContain('forbidden_field_approval');
  });

  it('rejects credential-like keys anywhere in the payload', () => {
    const h = validHandoff();
    (h.payload.source.payloadReference as Record<string, unknown>).apiKey = 'secret-value';
    expect(validateBIToDTHandoff(h).reasons.some((r) => r.startsWith('credential_like_field_at_'))).toBe(true);
  });

  it('preserves correlation and lineage requirements', () => {
    const h = validHandoff({ correlationId: '' });
    (h as { lineage: unknown }).lineage = 'not-an-array';
    const reasons = validateBIToDTHandoff(h).reasons;
    expect(reasons).toContain('correlationId_required');
    expect(reasons).toContain('lineage_array_required');
  });

  it('rejects a handoff not in ready status', () => {
    const h = validHandoff({ status: 'blocked' });
    expect(validateBIToDTHandoff(h).reasons).toContain('handoff_status_must_be_ready');
  });
});
