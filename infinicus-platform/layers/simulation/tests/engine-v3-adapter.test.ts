// Engine v3 browser-adapter + port tests (BUILD-07 gates 3–5, 8–12, 15–17).
// Uses injected test doubles — no real browser required.
import { describe, expect, it, vi } from 'vitest';
import {
  createEngineV3BrowserAdapter,
  ENGINE_V3_NAMESPACE,
  mapCompletedRunToSIMToADIHandoff,
  SimulationEngineUnavailableError,
  SimulationOperationUnavailableError,
  SimulationRequestInvalidError,
  SimulationResultInvalidError,
  SimulationRunNotCompletedError,
  SimulationRunNotFoundError,
  SimulationTenantBoundaryError,
  validateScenarioRequest,
  type CompletedSimulationRun,
  type EngineV3FacadeResult,
  type EngineV3SimulationGlobal,
  type SimulationScenarioRequest,
} from '../src/index';
import { validateSIMToADIHandoff } from '@infinicus/handoff-contracts';

const T1 = 'tenant-1';
const B1 = 'biz-1';

function completedRun(overrides: Partial<CompletedSimulationRun> = {}): CompletedSimulationRun {
  return {
    runId: 'simrun_abc',
    tenantId: T1,
    businessId: B1,
    decisionId: 'dec-1',
    scenarioId: 'alt-1',
    correlationId: 'corr-1',
    engineVersion: 'infinicus-engine-v3',
    modelVersion: 'v3-montecarlo-500x90',
    schemaVersion: '1.0.0',
    status: 'completed',
    completedAt: '2026-07-21T12:00:00.000Z',
    sampleSize: 500,
    horizonDays: 90,
    randomSeed: null,
    inputFingerprint: 'json:{"capital":10000}',
    scenarios: ['alt-1'],
    assumptions: [
      { name: 'industry', value: 'food' },
      { name: 'capital', value: 10000 },
    ],
    outputs: {
      finalCashPercentiles: { p10: -812.5, p25: 240.75, p50: 1520.25, p75: 3800, p90: 7104.125 },
      survivalRate: 0.842,
      finalCashBasePath: 1499.99,
      currencyCode: 'USD',
    },
    sourceResultRef: 'sim://engine-v3/simrun_abc',
    ...overrides,
  };
}

function request(overrides: Partial<SimulationScenarioRequest> = {}): SimulationScenarioRequest {
  return {
    tenantId: T1,
    businessId: B1,
    correlationId: 'corr-1',
    decisionId: 'dec-1',
    scenarioId: 'alt-1',
    idempotencyKey: 'idem-1',
    parameters: { industry: 'food', capital: 10000, price: 12.5, mktBud: 300, team: 2 },
    ...overrides,
  };
}

function fakeEngine(overrides: Partial<EngineV3SimulationGlobal> = {}): EngineV3SimulationGlobal {
  return {
    engineVersion: 'infinicus-engine-v3',
    capabilities: { runs: 500, horizonDays: 90, seedSupported: false },
    executeScenario: (): EngineV3FacadeResult => ({ ok: true, run: completedRun() }),
    getCompletedRun: (): EngineV3FacadeResult => ({ ok: true, run: completedRun() }),
    ...overrides,
  };
}

describe('validateScenarioRequest (execution-port validation)', () => {
  it('accepts a valid request', () => {
    expect(validateScenarioRequest(request())).toEqual([]);
  });

  it('rejects missing identity and invalid parameters with explicit reasons', () => {
    const reasons = validateScenarioRequest({
      tenantId: '',
      businessId: ' ',
      correlationId: '',
      parameters: { industry: '', capital: 0, price: -1, mktBud: NaN, team: 0 },
    } as SimulationScenarioRequest);
    expect(reasons).toContain('tenant_id_required');
    expect(reasons).toContain('business_id_required');
    expect(reasons).toContain('correlation_id_required');
    expect(reasons).toContain('parameters_industry_required');
    expect(reasons).toContain('parameters_capital_positive_required');
    expect(reasons).toContain('parameters_price_positive_required');
    expect(reasons).toContain('parameters_mkt_budget_invalid');
    expect(reasons).toContain('parameters_team_invalid');
  });
});

describe('ExecuteSimulationScenarioPort (Engine v3 adapter)', () => {
  it('calls the engine executeScenario operation with unaltered request values', async () => {
    const executeScenario = vi.fn((): EngineV3FacadeResult => ({ ok: true, run: completedRun() }));
    const adapter = createEngineV3BrowserAdapter({ resolveEngine: () => fakeEngine({ executeScenario }) });
    await adapter.execute(request());
    expect(executeScenario).toHaveBeenCalledTimes(1);
    const sent = executeScenario.mock.calls[0][0] as SimulationScenarioRequest;
    expect(sent.tenantId).toBe(T1);
    expect(sent.businessId).toBe(B1);
    expect(sent.correlationId).toBe('corr-1');
    expect(sent.scenarioId).toBe('alt-1');
    expect(sent.idempotencyKey).toBe('idem-1');
    expect(sent.parameters).toEqual({ industry: 'food', capital: 10000, price: 12.5, mktBud: 300, team: 2 });
  });

  it('returns the completed run with numeric values passed through exactly', async () => {
    const adapter = createEngineV3BrowserAdapter({ resolveEngine: () => fakeEngine() });
    const result = await adapter.execute(request());
    expect(result.status).toBe('completed');
    expect(result.idempotentReplay).toBe(false);
    const pct = (result.run.outputs as { finalCashPercentiles: Record<string, number> }).finalCashPercentiles;
    expect(pct).toEqual({ p10: -812.5, p25: 240.75, p50: 1520.25, p75: 3800, p90: 7104.125 });
    expect((result.run.outputs as { survivalRate: number }).survivalRate).toBe(0.842);
    expect((result.run.outputs as { currencyCode: string }).currencyCode).toBe('USD');
  });

  it('preserves 500-run and 90-day evidence on the returned run', async () => {
    const adapter = createEngineV3BrowserAdapter({ resolveEngine: () => fakeEngine() });
    const result = await adapter.execute(request());
    expect(result.run.sampleSize).toBe(500);
    expect(result.run.horizonDays).toBe(90);
  });

  it('surfaces idempotent replay from the established idempotency mechanism', async () => {
    const adapter = createEngineV3BrowserAdapter({
      resolveEngine: () =>
        fakeEngine({
          executeScenario: () => ({ ok: true, run: { ...completedRun(), idempotentReplay: true } }),
        }),
    });
    const result = await adapter.execute(request());
    expect(result.idempotentReplay).toBe(true);
    expect('idempotentReplay' in result.run).toBe(false);
  });

  it('rejects invalid requests before touching the engine', async () => {
    const executeScenario = vi.fn();
    const adapter = createEngineV3BrowserAdapter({
      resolveEngine: () => fakeEngine({ executeScenario: executeScenario as never }),
    });
    await expect(adapter.execute(request({ parameters: { industry: 'food', capital: -5, price: 1, mktBud: 0, team: 1 } })))
      .rejects.toBeInstanceOf(SimulationRequestInvalidError);
    expect(executeScenario).not.toHaveBeenCalled();
  });

  it('throws SimulationEngineUnavailableError when the namespace is missing', async () => {
    const adapter = createEngineV3BrowserAdapter({ resolveEngine: () => null });
    await expect(adapter.execute(request())).rejects.toBeInstanceOf(SimulationEngineUnavailableError);
    await expect(adapter.execute(request())).rejects.toThrow(ENGINE_V3_NAMESPACE);
  });

  it('throws SimulationOperationUnavailableError when executeScenario is missing', async () => {
    const adapter = createEngineV3BrowserAdapter({
      resolveEngine: () => ({ getCompletedRun: () => ({ ok: true, run: completedRun() }) }),
    });
    await expect(adapter.execute(request())).rejects.toBeInstanceOf(SimulationOperationUnavailableError);
  });

  it('does not fabricate success from engine failures', async () => {
    const adapter = createEngineV3BrowserAdapter({
      resolveEngine: () =>
        fakeEngine({ executeScenario: () => ({ ok: false, error: { code: 'SIM_EXECUTION_FAILED', message: 'boom' } }) }),
    });
    await expect(adapter.execute(request())).rejects.toThrow('boom');
  });

  it('rejects engine results whose boundary does not match the request', async () => {
    const adapter = createEngineV3BrowserAdapter({
      resolveEngine: () => fakeEngine({ executeScenario: () => ({ ok: true, run: completedRun({ tenantId: 'other' }) }) }),
    });
    await expect(adapter.execute(request())).rejects.toBeInstanceOf(SimulationTenantBoundaryError);
  });

  it('rejects structurally invalid engine results', async () => {
    const adapter = createEngineV3BrowserAdapter({
      resolveEngine: () =>
        fakeEngine({
          executeScenario: () => ({ ok: true, run: completedRun({ outputs: undefined as never, sampleSize: 0 }) }),
        }),
    });
    await expect(adapter.execute(request())).rejects.toBeInstanceOf(SimulationResultInvalidError);
  });
});

describe('ReadCompletedSimulationRunPort (Engine v3 adapter)', () => {
  it('reads a completed run by canonical identity', async () => {
    const getCompletedRun = vi.fn((): EngineV3FacadeResult => ({ ok: true, run: completedRun() }));
    const adapter = createEngineV3BrowserAdapter({ resolveEngine: () => fakeEngine({ getCompletedRun }) });
    const run = await adapter.read({ tenantId: T1, businessId: B1, runId: 'simrun_abc' });
    expect(run.runId).toBe('simrun_abc');
    expect(run.status).toBe('completed');
    expect(getCompletedRun.mock.calls[0][0]).toEqual({ tenantId: T1, businessId: B1, runId: 'simrun_abc', decisionId: undefined });
  });

  it('rejects queries without identity', async () => {
    const adapter = createEngineV3BrowserAdapter({ resolveEngine: () => fakeEngine() });
    await expect(adapter.read({ tenantId: '', businessId: B1, runId: 'r' })).rejects.toBeInstanceOf(SimulationRequestInvalidError);
  });

  it('maps engine not-found to SimulationRunNotFoundError', async () => {
    const adapter = createEngineV3BrowserAdapter({
      resolveEngine: () =>
        fakeEngine({ getCompletedRun: () => ({ ok: false, error: { code: 'SIM_RUN_NOT_FOUND', message: 'missing' } }) }),
    });
    await expect(adapter.read({ tenantId: T1, businessId: B1, runId: 'nope' })).rejects.toBeInstanceOf(SimulationRunNotFoundError);
  });

  it('maps engine incomplete-run to SimulationRunNotCompletedError', async () => {
    const adapter = createEngineV3BrowserAdapter({
      resolveEngine: () =>
        fakeEngine({ getCompletedRun: () => ({ ok: false, error: { code: 'SIM_RUN_NOT_COMPLETED', message: 'running' } }) }),
    });
    await expect(adapter.read({ tenantId: T1, businessId: B1, runId: 'r1' })).rejects.toBeInstanceOf(SimulationRunNotCompletedError);
  });

  it('maps cross-tenant engine rejection to SimulationTenantBoundaryError', async () => {
    const adapter = createEngineV3BrowserAdapter({
      resolveEngine: () =>
        fakeEngine({ getCompletedRun: () => ({ ok: false, error: { code: 'SIM_RUN_TENANT_MISMATCH', message: 'denied' } }) }),
    });
    await expect(adapter.read({ tenantId: T1, businessId: B1, runId: 'r1' })).rejects.toBeInstanceOf(SimulationTenantBoundaryError);
  });

  it('rejects runs returned outside the requested boundary even if the engine leaks them', async () => {
    const adapter = createEngineV3BrowserAdapter({
      resolveEngine: () => fakeEngine({ getCompletedRun: () => ({ ok: true, run: completedRun({ businessId: 'other-biz' }) }) }),
    });
    await expect(adapter.read({ tenantId: T1, businessId: B1, runId: 'simrun_abc' })).rejects.toBeInstanceOf(SimulationTenantBoundaryError);
  });

  it('rejects non-completed runs returned by the engine', async () => {
    const adapter = createEngineV3BrowserAdapter({
      resolveEngine: () =>
        fakeEngine({ getCompletedRun: () => ({ ok: true, run: completedRun({ status: 'running' as never }) }) }),
    });
    await expect(adapter.read({ tenantId: T1, businessId: B1, runId: 'simrun_abc' })).rejects.toBeInstanceOf(SimulationResultInvalidError);
  });
});

describe('SIM→ADI mapper (completed-run mapping)', () => {
  const mapperOptions = { handoffId: 'h-1', sourceBlock: 'engine-v3-facade', workspaceId: 'ws-1', correlationId: 'corr-1' };

  it('maps a completed run into a valid SIM→ADI handoff without changing numbers', () => {
    const handoff = mapCompletedRunToSIMToADIHandoff(completedRun(), mapperOptions);
    expect(validateSIMToADIHandoff(handoff).valid).toBe(true);
    expect(handoff.payload.uncertainty).toMatchObject({ p10: -812.5, p25: 240.75, p50: 1520.25, p75: 3800, p90: 7104.125 });
    expect(handoff.payload.uncertainty.currencyCode).toBe('USD');
    expect(handoff.payload.outcomes.survivalRate).toBe(0.842);
    expect(handoff.payload.outcomes.finalCashBasePath).toBe(1499.99);
    expect(handoff.payload.run.sampleSize).toBe(500);
    expect(handoff.payload.run.horizonDays).toBe(90);
  });

  it('preserves identity, lineage and provenance', () => {
    const handoff = mapCompletedRunToSIMToADIHandoff(completedRun(), mapperOptions);
    expect(handoff.correlationId).toBe('corr-1');
    expect(handoff.payload.tenantId).toBe(T1);
    expect(handoff.payload.businessId).toBe(B1);
    expect(handoff.payload.run.decisionId).toBe('dec-1');
    expect(handoff.payload.run.scenarioId).toBe('alt-1');
    expect(handoff.lineage).toHaveLength(1);
    expect(handoff.lineage[0]).toMatchObject({ layer: 'SIM', recordId: 'simrun_abc', action: 'simulation_run_completed' });
    expect(handoff.payload.provenance.sourceResultRef).toBe('sim://engine-v3/simrun_abc');
    expect(handoff.payload.provenance.engineNamespace).toBe(ENGINE_V3_NAMESPACE);
  });

  it('records the unseeded-engine limitation instead of fabricating a seed', () => {
    const handoff = mapCompletedRunToSIMToADIHandoff(completedRun(), mapperOptions);
    expect(handoff.payload.run.randomSeed).toBeNull();
    expect(handoff.payload.limitations).toContain('engine_v3_does_not_support_seeded_reproducibility');
  });

  it('keeps absent sensitivity evidence absent', () => {
    const handoff = mapCompletedRunToSIMToADIHandoff(completedRun(), mapperOptions);
    expect('sensitivity' in handoff.payload).toBe(false);
  });

  it('rejects non-completed runs', () => {
    expect(() => mapCompletedRunToSIMToADIHandoff(completedRun({ status: 'failed' as never }), mapperOptions))
      .toThrow(SimulationRunNotCompletedError);
  });

  it('rejects runs missing percentile evidence instead of fabricating it', () => {
    const run = completedRun({ outputs: { survivalRate: 0.9 } });
    expect(() => mapCompletedRunToSIMToADIHandoff(run, mapperOptions)).toThrow(SimulationResultInvalidError);
  });

  it('produces a JSON-serializable handoff', () => {
    const handoff = mapCompletedRunToSIMToADIHandoff(completedRun(), mapperOptions);
    expect(JSON.parse(JSON.stringify(handoff))).toEqual(handoff);
  });
});
