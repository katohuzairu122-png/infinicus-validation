// BO → BI contract type + runtime-validation tests (BUILD-09 upstream boundary).
import { describe, expect, it } from 'vitest';
import {
  BO_TO_BI_CONTRACT_VERSION,
  INTAKABLE_STATUSES,
  validateBOToBIHandoff,
  type BOToBIHandoff,
  type BOToBIHandoffPayload,
} from '../src/bo-to-bi';

function validPayload(): BOToBIHandoffPayload {
  return {
    contractVersion: BO_TO_BI_CONTRACT_VERSION,
    tenantId: 'tenant-1',
    workspaceId: 'ws-1',
    businessId: 'biz-1',
    boPublicationPackageId: 'bo-pkg-1',
    packageStatus: 'ready',
    targetBlock: 'BI-01',
    periodStart: '2026-01-01T00:00:00.000Z',
    periodEnd: '2026-02-01T00:00:00.000Z',
    recordCount: 250,
    source: { packageCode: 'bo-pkg-code-1', payloadReference: { format: 'jsonl' } },
    schemaVersion: '1.0',
    idempotencyKey: 'bo-pkg-1::bi-01',
  };
}

function validHandoff(overrides: Partial<BOToBIHandoff> = {}): BOToBIHandoff {
  return {
    handoffId: 'handoff-bo-bi-1',
    sourceLayer: 'BO',
    sourceBlock: 'BO-25',
    targetLayer: 'BI',
    targetBlock: 'BI-01',
    payload: validPayload(),
    correlationId: 'corr-bo-bi-1',
    lineage: [
      { layer: 'BO', block: 'BO-25', recordId: 'bo-pkg-1', timestamp: '2026-01-01T00:00:00.000Z', action: 'publication_package_ready' },
    ],
    status: 'ready',
    createdAt: '2026-01-01T00:00:01.000Z',
    ...overrides,
  };
}

describe('BO→BI contract types', () => {
  it('a fully-populated handoff validates with zero reasons', () => {
    const result = validateBOToBIHandoff(validHandoff());
    expect(result.reasons).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('is JSON-serializable round-trip without loss', () => {
    const handoff = validHandoff();
    const roundTripped = JSON.parse(JSON.stringify(handoff)) as BOToBIHandoff;
    expect(roundTripped).toEqual(handoff);
    expect(validateBOToBIHandoff(roundTripped).valid).toBe(true);
  });

  it('accepts both intakable statuses (ready, dispatched)', () => {
    for (const status of INTAKABLE_STATUSES) {
      const h = validHandoff();
      h.payload.packageStatus = status;
      expect(validateBOToBIHandoff(h).valid).toBe(true);
    }
  });
});

describe('BO→BI runtime validation', () => {
  it('rejects null / non-object handoffs', () => {
    expect(validateBOToBIHandoff(null).reasons).toContain('handoff_required');
    expect(validateBOToBIHandoff('x').valid).toBe(false);
  });

  it('rejects a non-intakable package status (draft/failed/cancelled)', () => {
    for (const status of ['draft', 'failed', 'cancelled']) {
      const h = validHandoff();
      (h.payload as { packageStatus: string }).packageStatus = status;
      expect(validateBOToBIHandoff(h).reasons).toContain('package_status_not_intakable');
    }
  });

  it('rejects missing tenant/workspace/business ownership', () => {
    const h = validHandoff();
    h.payload.tenantId = '';
    (h.payload as { workspaceId?: string }).workspaceId = undefined;
    h.payload.businessId = '';
    const reasons = validateBOToBIHandoff(h).reasons;
    expect(reasons).toContain('tenant_id_required');
    expect(reasons).toContain('workspace_id_required');
    expect(reasons).toContain('business_id_required');
  });

  it('rejects wrong source/target layers', () => {
    const h = validHandoff({ sourceLayer: 'DAL', targetLayer: 'ADI' });
    const reasons = validateBOToBIHandoff(h).reasons;
    expect(reasons).toContain('source_layer_must_be_BO');
    expect(reasons).toContain('target_layer_must_be_BI');
  });

  it('rejects an unsupported contract version', () => {
    const h = validHandoff();
    (h.payload as { contractVersion: string }).contractVersion = '0.9.0';
    expect(validateBOToBIHandoff(h).reasons).toContain('contract_version_unsupported');
  });

  it('rejects an invalid publication period (end before start)', () => {
    const h = validHandoff();
    h.payload.periodStart = '2026-02-01T00:00:00.000Z';
    h.payload.periodEnd = '2026-01-01T00:00:00.000Z';
    expect(validateBOToBIHandoff(h).reasons).toContain('period_order_invalid');
  });

  it('rejects malformed period timestamps', () => {
    const h = validHandoff();
    h.payload.periodStart = 'not-a-date';
    expect(validateBOToBIHandoff(h).reasons).toContain('period_start_invalid');
  });

  it('rejects a negative record count', () => {
    const h = validHandoff();
    (h.payload as { recordCount: number }).recordCount = -1;
    expect(validateBOToBIHandoff(h).reasons).toContain('record_count_invalid');
  });

  it('rejects missing source reference or idempotency key', () => {
    const h = validHandoff();
    (h.payload as { source?: unknown }).source = undefined;
    (h.payload as { idempotencyKey: string }).idempotencyKey = '';
    const reasons = validateBOToBIHandoff(h).reasons;
    expect(reasons).toContain('source_reference_required');
    expect(reasons).toContain('idempotency_key_required');
  });

  it('rejects functions and non-plain objects anywhere in the handoff', () => {
    const withFn = validHandoff();
    (withFn.payload.source.payloadReference as Record<string, unknown>).cb = () => 1;
    expect(validateBOToBIHandoff(withFn).reasons.some((r) => r.startsWith('unserializable_function_at_'))).toBe(true);

    class FakeNode { tag = 'div'; }
    const withNode = validHandoff();
    (withNode.payload as unknown as Record<string, unknown>).node = new FakeNode();
    expect(validateBOToBIHandoff(withNode).reasons.some((r) => r.startsWith('non_plain_object_at_'))).toBe(true);
  });

  it('rejects embedded BI analytical conclusions (finding/insight/recommendation)', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).finding = { title: 'x' };
    (h.payload as unknown as Record<string, unknown>).recommendation = { go: true };
    const reasons = validateBOToBIHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_finding');
    expect(reasons).toContain('forbidden_field_recommendation');
  });

  it('preserves correlation and lineage requirements', () => {
    const h = validHandoff({ correlationId: '' });
    (h as { lineage: unknown }).lineage = 'not-an-array';
    const reasons = validateBOToBIHandoff(h).reasons;
    expect(reasons).toContain('correlationId_required');
    expect(reasons).toContain('lineage_array_required');
  });
});
