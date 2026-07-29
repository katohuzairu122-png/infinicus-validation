// DAL → BO contract type + runtime-validation tests (BUILD-08 gates 14–21).
import { describe, expect, it } from 'vitest';
import {
  DAL_TO_BO_CONTRACT_VERSION,
  validateDALToBOHandoff,
  type DALToBOHandoff,
  type DALToBOHandoffPayload,
} from '../src/dal-to-bo';

function validPayload(): DALToBOHandoffPayload {
  return {
    contractVersion: DAL_TO_BO_CONTRACT_VERSION,
    tenantId: 'tenant-1',
    workspaceId: 'ws-1',
    businessId: 'biz-1',
    publicationPackageId: 'pkg-0001',
    packageType: 'operational_records',
    packageVersion: '1.0',
    targetLayer: 'business_operations',
    targetBlock: 'BO-01',
    status: 'published',
    publishedAt: '2026-07-21T12:00:00.000Z',
    recordCount: 1250,
    source: {
      sourceSystem: 'da.collection_runs',
      dataReference: { collectionRunId: 'run-9', format: 'jsonl' },
    },
    schemaReferenceId: 'schema-5',
    quality: { qualityScore: 0.93, reliabilityScore: 0.88 },
    provenanceReferenceIds: ['prov-1', 'prov-2'],
    consentReferenceIds: [],
    limitations: [],
    warnings: [],
    idempotencyKey: 'pkg-0001::published::2026-07-21T12:00:00.000Z',
  };
}

function validHandoff(overrides: Partial<DALToBOHandoff> = {}): DALToBOHandoff {
  return {
    handoffId: 'handoff-dal-1',
    sourceLayer: 'DAL',
    sourceBlock: 'DA-24',
    targetLayer: 'BO',
    targetBlock: 'BO-01',
    payload: validPayload(),
    correlationId: 'corr-dal-1',
    lineage: [
      { layer: 'DAL', block: 'DA-24', recordId: 'pkg-0001', timestamp: '2026-07-21T12:00:00.000Z', action: 'publication_package_published' },
    ],
    status: 'ready',
    createdAt: '2026-07-21T12:00:01.000Z',
    ...overrides,
  };
}

describe('DAL→BO contract types', () => {
  it('a fully-populated handoff validates with zero reasons', () => {
    const result = validateDALToBOHandoff(validHandoff());
    expect(result.reasons).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('is JSON-serializable round-trip without loss', () => {
    const handoff = validHandoff();
    const roundTripped = JSON.parse(JSON.stringify(handoff)) as DALToBOHandoff;
    expect(roundTripped).toEqual(handoff);
    expect(validateDALToBOHandoff(roundTripped).valid).toBe(true);
  });

  it('allows null businessId (publication_packages.business_id is nullable)', () => {
    const h = validHandoff();
    h.payload.businessId = null;
    expect(validateDALToBOHandoff(h).valid).toBe(true);
  });

  it('allows unscored quality as explicit nulls — never fabricated', () => {
    const h = validHandoff();
    h.payload.quality = { qualityScore: null, reliabilityScore: null };
    expect(validateDALToBOHandoff(h).valid).toBe(true);
  });
});

describe('DAL→BO runtime validation', () => {
  it('rejects null / non-object handoffs', () => {
    expect(validateDALToBOHandoff(null).reasons).toContain('handoff_required');
    expect(validateDALToBOHandoff(42).valid).toBe(false);
  });

  it('rejects non-published packages with an explicit reason', () => {
    const h = validHandoff();
    (h.payload as { status: string }).status = 'draft';
    const result = validateDALToBOHandoff(h);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('publication_status_must_be_published');
  });

  it('rejects missing tenant/workspace ownership', () => {
    const h = validHandoff();
    h.payload.tenantId = '';
    (h.payload as { workspaceId?: string }).workspaceId = undefined;
    const reasons = validateDALToBOHandoff(h).reasons;
    expect(reasons).toContain('tenant_id_required');
    expect(reasons).toContain('workspace_id_required');
  });

  it('rejects wrong source/target layers', () => {
    const h = validHandoff({ sourceLayer: 'SIM', targetLayer: 'ADI' });
    const reasons = validateDALToBOHandoff(h).reasons;
    expect(reasons).toContain('source_layer_must_be_DAL');
    expect(reasons).toContain('target_layer_must_be_BO');
  });

  it('rejects an unsupported contract version', () => {
    const h = validHandoff();
    (h.payload as { contractVersion: string }).contractVersion = '0.9.0';
    expect(validateDALToBOHandoff(h).reasons).toContain('contract_version_unsupported');
  });

  it('rejects invalid published timestamp and negative record count', () => {
    const h = validHandoff();
    h.payload.publishedAt = 'not-a-date';
    (h.payload as { recordCount: number }).recordCount = -1;
    const reasons = validateDALToBOHandoff(h).reasons;
    expect(reasons).toContain('published_at_invalid');
    expect(reasons).toContain('record_count_invalid');
  });

  it('rejects out-of-range quality scores', () => {
    const h = validHandoff();
    h.payload.quality = { qualityScore: 1.2, reliabilityScore: -0.1 };
    const reasons = validateDALToBOHandoff(h).reasons;
    expect(reasons).toContain('quality_score_invalid');
    expect(reasons).toContain('reliability_score_invalid');
  });

  it('rejects missing publication-package identity and idempotency key', () => {
    const h = validHandoff();
    h.payload.publicationPackageId = '';
    (h.payload as { idempotencyKey: string }).idempotencyKey = ' ';
    const reasons = validateDALToBOHandoff(h).reasons;
    expect(reasons).toContain('publication_package_id_required');
    expect(reasons).toContain('idempotency_key_required');
  });

  it('rejects functions and non-plain objects anywhere in the handoff', () => {
    const withFn = validHandoff();
    (withFn.payload.source.dataReference as Record<string, unknown>).cb = () => 1;
    expect(validateDALToBOHandoff(withFn).reasons.some((r) => r.startsWith('unserializable_function_at_'))).toBe(true);

    class FakeNode { tag = 'div'; }
    const withNode = validHandoff();
    (withNode.payload as unknown as Record<string, unknown>).node = new FakeNode();
    expect(validateDALToBOHandoff(withNode).reasons.some((r) => r.startsWith('non_plain_object_at_'))).toBe(true);
  });

  it('rejects credential-like keys anywhere in the handoff', () => {
    const h = validHandoff();
    (h.payload.source.dataReference as Record<string, unknown>).apiKey = 'sk-not-allowed';
    expect(validateDALToBOHandoff(h).reasons.some((r) => r.startsWith('credential_like_key_at_'))).toBe(true);
  });

  it('rejects embedded Business Operations fields', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).order = { total: 100 };
    (h.payload as unknown as Record<string, unknown>).approval = { approved: true };
    const reasons = validateDALToBOHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_order');
    expect(reasons).toContain('forbidden_field_approval');
  });

  it('preserves correlation and provenance requirements', () => {
    const h = validHandoff({ correlationId: '' });
    (h.payload as { provenanceReferenceIds: unknown }).provenanceReferenceIds = 'not-an-array';
    const reasons = validateDALToBOHandoff(h).reasons;
    expect(reasons).toContain('correlationId_required');
    expect(reasons).toContain('provenance_reference_ids_required');
  });
});
