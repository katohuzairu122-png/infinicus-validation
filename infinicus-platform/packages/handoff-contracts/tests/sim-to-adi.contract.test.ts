// SIM → ADI contract type + runtime-validation tests (BUILD-07 gates 1–2).
import { describe, expect, it } from 'vitest';
import {
  SIM_TO_ADI_CONTRACT_VERSION,
  validateSIMToADIHandoff,
  type SIMToADIHandoff,
  type SIMToADIHandoffPayload,
} from '../src/sim-to-adi';

function validPayload(): SIMToADIHandoffPayload {
  return {
    contractVersion: SIM_TO_ADI_CONTRACT_VERSION,
    tenantId: 't-1',
    workspaceId: 'ws-1',
    businessId: 'b-1',
    idempotencyKey: 'simrun_1::sim-to-adi',
    run: {
      runId: 'simrun_1',
      scenarioId: 'alt-1',
      decisionId: 'dec-1',
      engineVersion: 'infinicus-engine-v3',
      modelVersion: 'v3-montecarlo-500x90',
      schemaVersion: '1.0.0',
      status: 'completed',
      completedAt: '2026-07-21T00:00:00.000Z',
      sampleSize: 500,
      horizonDays: 90,
      randomSeed: null,
      inputFingerprint: 'json:{}',
      scenarios: ['alt-1'],
      assumptions: [{ name: 'capital', value: 10000 }],
    },
    inputSnapshot: { parametersVersion: 'v3-montecarlo-500x90', parameters: { capital: 10000 } },
    outcomes: { finalCashBasePath: 1234.56, survivalRate: 0.82, sampleSize: 500, horizonDays: 90 },
    uncertainty: {
      basis: 'final_cash',
      currencyCode: 'USD',
      p10: -500.25,
      p25: 100,
      p50: 900.5,
      p75: 2100,
      p90: 4000.75,
    },
    risk: { survivalRate: 0.82, downsideFinalCashP10: -500.25 },
    limitations: ['engine_v3_does_not_support_seeded_reproducibility'],
    warnings: [],
    provenance: {
      sourceLayer: 'SIM',
      sourceBlock: 'engine-v3-facade',
      engineNamespace: 'window.INFINICUS.SIMULATION',
      sourceResultRef: 'sim://engine-v3/simrun_1',
    },
  };
}

function validHandoff(overrides: Partial<SIMToADIHandoff> = {}): SIMToADIHandoff {
  return {
    handoffId: 'handoff-1',
    sourceLayer: 'SIM',
    sourceBlock: 'engine-v3-facade',
    targetLayer: 'ADI',
    targetBlock: 'ADI-06',
    payload: validPayload(),
    correlationId: 'corr-1',
    lineage: [
      { layer: 'SIM', block: 'engine-v3-facade', recordId: 'simrun_1', timestamp: '2026-07-21T00:00:00.000Z', action: 'simulation_run_completed' },
    ],
    status: 'ready',
    createdAt: '2026-07-21T00:00:00.000Z',
    ...overrides,
  };
}

describe('SIM→ADI contract types', () => {
  it('a fully-populated handoff satisfies the type and validates', () => {
    const result = validateSIMToADIHandoff(validHandoff());
    expect(result.reasons).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('the handoff is JSON-serializable round-trip without loss', () => {
    const handoff = validHandoff();
    const roundTripped = JSON.parse(JSON.stringify(handoff)) as SIMToADIHandoff;
    expect(roundTripped).toEqual(handoff);
    expect(validateSIMToADIHandoff(roundTripped).valid).toBe(true);
  });
});

describe('SIM→ADI runtime validation', () => {
  it('rejects null and non-objects with an explicit reason', () => {
    expect(validateSIMToADIHandoff(null).reasons).toContain('handoff_required');
    expect(validateSIMToADIHandoff('x').valid).toBe(false);
  });

  it('rejects a non-completed run with run_not_completed', () => {
    const h = validHandoff();
    (h.payload.run as { status: string }).status = 'failed';
    const result = validateSIMToADIHandoff(h);
    expect(result.valid).toBe(false);
    expect(result.reasons).toContain('run_not_completed');
  });

  it('rejects wrong source/target layers', () => {
    const h = validHandoff({ sourceLayer: 'DT', targetLayer: 'ABA' });
    const reasons = validateSIMToADIHandoff(h).reasons;
    expect(reasons).toContain('source_layer_must_be_SIM');
    expect(reasons).toContain('target_layer_must_be_ADI');
  });

  it('rejects missing tenant/workspace/business identity with explicit reasons', () => {
    const h = validHandoff();
    h.payload.tenantId = '';
    (h.payload as { workspaceId?: string }).workspaceId = undefined;
    (h.payload as { businessId?: string }).businessId = undefined;
    const reasons = validateSIMToADIHandoff(h).reasons;
    expect(reasons).toContain('tenant_id_required');
    expect(reasons).toContain('workspace_id_required');
    expect(reasons).toContain('business_id_required');
  });

  it('rejects a missing idempotency key', () => {
    const h = validHandoff();
    (h.payload as { idempotencyKey: string }).idempotencyKey = '';
    expect(validateSIMToADIHandoff(h).reasons).toContain('idempotency_key_required');
  });

  it('rejects credential-like keys anywhere in the payload', () => {
    const h = validHandoff();
    (h.payload.inputSnapshot.parameters as Record<string, unknown>).apiKey = 'secret-value';
    expect(validateSIMToADIHandoff(h).reasons.some((r) => r.startsWith('credential_like_field_at_'))).toBe(true);
  });

  it('rejects __proto__/prototype/constructor keys anywhere in the payload', () => {
    const h = validHandoff();
    Object.defineProperty(h.payload.inputSnapshot.parameters, '__proto__', { value: { polluted: true }, enumerable: true, configurable: true });
    const reasons = validateSIMToADIHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('dangerous_key_at_'))).toBe(true);
  });

  it('rejects a payload exceeding the 512 KiB bound', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).oversized = 'x'.repeat(600 * 1024);
    expect(validateSIMToADIHandoff(h).reasons).toContain('payload_too_large');
  });

  it('rejects an unsupported contract version', () => {
    const h = validHandoff();
    (h.payload as { contractVersion: string }).contractVersion = '0.0.1';
    expect(validateSIMToADIHandoff(h).reasons).toContain('contract_version_unsupported');
  });

  it('rejects functions anywhere in the handoff (not serializable)', () => {
    const h = validHandoff();
    (h.payload.outcomes as unknown as Record<string, unknown>).callback = () => 42;
    const reasons = validateSIMToADIHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('unserializable_function_at_'))).toBe(true);
  });

  it('rejects non-plain objects (DOM-like / class instances)', () => {
    class FakeDOMNode { tag = 'div'; }
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).node = new FakeDOMNode();
    const reasons = validateSIMToADIHandoff(h).reasons;
    expect(reasons.some((r) => r.startsWith('non_plain_object_at_'))).toBe(true);
  });

  it('rejects embedded recommendation/approval fields', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).recommendation = { go: true };
    (h.payload as unknown as Record<string, unknown>).approval = { approved: true };
    const reasons = validateSIMToADIHandoff(h).reasons;
    expect(reasons).toContain('forbidden_field_recommendation');
    expect(reasons).toContain('forbidden_field_approval');
  });

  it('rejects invalid percentile evidence with per-field reasons', () => {
    const h = validHandoff();
    (h.payload.uncertainty as unknown as Record<string, unknown>).p50 = 'NaN';
    expect(validateSIMToADIHandoff(h).reasons).toContain('uncertainty_p50_invalid');
  });

  it('rejects invalid sample size and empty scenarios', () => {
    const h = validHandoff();
    (h.payload.run as unknown as Record<string, unknown>).sampleSize = 0;
    (h.payload.run as unknown as Record<string, unknown>).scenarios = [];
    const reasons = validateSIMToADIHandoff(h).reasons;
    expect(reasons).toContain('run_sample_size_invalid');
    expect(reasons).toContain('run_scenarios_required');
  });

  it('accepts randomSeed null (engine without seeding) but rejects other non-strings', () => {
    const withNull = validHandoff();
    expect(validateSIMToADIHandoff(withNull).valid).toBe(true);
    const withNumber = validHandoff();
    (withNumber.payload.run as unknown as Record<string, unknown>).randomSeed = 42;
    expect(validateSIMToADIHandoff(withNumber).reasons).toContain('run_random_seed_invalid');
  });

  it('keeps absent optional sensitivity evidence absent and valid', () => {
    const h = validHandoff();
    expect('sensitivity' in h.payload).toBe(false);
    expect(validateSIMToADIHandoff(h).valid).toBe(true);
  });

  it('rejects a payload exceeding the 512 KiB bound', () => {
    const h = validHandoff();
    (h.payload as unknown as Record<string, unknown>).oversized = 'x'.repeat(600 * 1024);
    expect(validateSIMToADIHandoff(h).reasons).toContain('payload_too_large');
  });

  it('rejects an unsupported random seed type at run.randomSeed', () => {
    const h = validHandoff();
    (h.payload.run as unknown as Record<string, unknown>).randomSeed = { nested: true };
    expect(validateSIMToADIHandoff(h).reasons).toContain('run_random_seed_invalid');
  });

  it('rejects credential-like keys anywhere in the payload', () => {
    const h = validHandoff();
    (h.payload.inputSnapshot.parameters as Record<string, unknown>).apiKey = 'secret-value';
    expect(validateSIMToADIHandoff(h).reasons.some((r) => r.startsWith('credential_like_field_at_'))).toBe(true);
  });
});
