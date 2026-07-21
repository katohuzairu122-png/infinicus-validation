// Narrow browser adapter around the Engine v3 Simulation facade (BUILD-07).
// The ONLY place application code touches the browser global. All access
// goes through an injected resolver so tests can supply doubles without a
// real browser. The adapter never alters engine values and never fabricates
// results.
import {
  SimulationEngineUnavailableError,
  SimulationOperationUnavailableError,
  SimulationRequestInvalidError,
  SimulationResultInvalidError,
  SimulationRunNotCompletedError,
  SimulationRunNotFoundError,
  SimulationTenantBoundaryError,
  SimulationIntegrationError,
} from '../contracts/errors';
import {
  validateScenarioRequest,
  type CompletedRunQuery,
  type CompletedSimulationRun,
  type ExecuteSimulationScenarioPort,
  type ReadCompletedSimulationRunPort,
  type SimulationExecutionResult,
  type SimulationScenarioRequest,
} from '../contracts/ports';

export const ENGINE_V3_NAMESPACE = 'window.INFINICUS.SIMULATION';

/** Failure shape returned by the Engine v3 facade. */
export interface EngineV3FacadeError {
  code: string;
  message: string;
}

/** Result envelope returned by the Engine v3 facade operations. */
export interface EngineV3FacadeResult {
  ok: boolean;
  run?: CompletedSimulationRun & { idempotentReplay?: boolean };
  error?: EngineV3FacadeError;
}

/**
 * The narrow global interface this adapter is allowed to touch.
 * Mirrors the minimal facade added to `window.INFINICUS.SIMULATION`.
 */
export interface EngineV3SimulationGlobal {
  engineVersion?: string;
  capabilities?: { runs: number; horizonDays: number; seedSupported: boolean };
  executeScenario?(request: unknown): EngineV3FacadeResult;
  getCompletedRun?(query: unknown): EngineV3FacadeResult;
}

export interface EngineV3AdapterOptions {
  /** Injected boundary — e.g. () => window.INFINICUS?.SIMULATION in the browser. */
  resolveEngine: () => EngineV3SimulationGlobal | null | undefined;
}

interface EngineV3Adapter extends ExecuteSimulationScenarioPort, ReadCompletedSimulationRunPort {
  readonly mode: 'browser_global';
  readonly namespace: typeof ENGINE_V3_NAMESPACE;
}

const RUN_STRING_FIELDS = ['runId', 'engineVersion', 'modelVersion', 'schemaVersion', 'completedAt'] as const;

function assertCompletedRun(run: unknown, context: string): asserts run is CompletedSimulationRun {
  const reasons: string[] = [];
  const r = run as CompletedSimulationRun | null | undefined;
  if (!r || typeof r !== 'object') {
    throw new SimulationResultInvalidError([`${context}_run_missing`]);
  }
  for (const field of RUN_STRING_FIELDS) {
    if (typeof r[field] !== 'string' || r[field].trim() === '') reasons.push(`${field}_missing`);
  }
  if (r.status !== 'completed') reasons.push('status_not_completed');
  if (!Number.isInteger(r.sampleSize) || r.sampleSize < 1) reasons.push('sample_size_invalid');
  if (!r.outputs || typeof r.outputs !== 'object' || Array.isArray(r.outputs)) reasons.push('outputs_invalid');
  if (!Array.isArray(r.scenarios) || r.scenarios.length < 1) reasons.push('scenarios_missing');
  if (reasons.length > 0) throw new SimulationResultInvalidError(reasons);
}

function mapFacadeError(error: EngineV3FacadeError | undefined, runId?: string): SimulationIntegrationError {
  const code = error?.code ?? 'SIM_EXECUTION_FAILED';
  const message = error?.message ?? 'Simulation engine reported an unspecified failure.';
  switch (code) {
    case 'SIM_RUN_NOT_FOUND':
      return new SimulationRunNotFoundError(runId ?? 'unknown');
    case 'SIM_RUN_NOT_COMPLETED':
      return new SimulationRunNotCompletedError(runId ?? 'unknown', 'not_completed');
    case 'SIM_RUN_TENANT_MISMATCH':
      return new SimulationTenantBoundaryError();
    case 'SIM_REQUEST_INVALID':
      return new SimulationRequestInvalidError([message]);
    default:
      return new SimulationIntegrationError('SIM_EXECUTION_FAILED', message);
  }
}

/**
 * Creates the Engine v3 browser adapter implementing both Simulation ports.
 * Engine values pass through untouched — same operation, same numbers, same
 * scales, same units.
 */
export function createEngineV3BrowserAdapter(options: EngineV3AdapterOptions): EngineV3Adapter {
  const { resolveEngine } = options;

  function engineOrThrow(operation: 'executeScenario' | 'getCompletedRun'): EngineV3SimulationGlobal {
    const engine = resolveEngine();
    if (!engine || typeof engine !== 'object') {
      throw new SimulationEngineUnavailableError(ENGINE_V3_NAMESPACE);
    }
    if (typeof engine[operation] !== 'function') {
      throw new SimulationOperationUnavailableError(`${ENGINE_V3_NAMESPACE}.${operation}`);
    }
    return engine;
  }

  async function execute(request: SimulationScenarioRequest): Promise<SimulationExecutionResult> {
    const reasons = validateScenarioRequest(request);
    if (reasons.length > 0) throw new SimulationRequestInvalidError(reasons);

    const engine = engineOrThrow('executeScenario');
    const result = engine.executeScenario!({
      tenantId: request.tenantId,
      businessId: request.businessId,
      correlationId: request.correlationId,
      decisionId: request.decisionId,
      scenarioId: request.scenarioId,
      idempotencyKey: request.idempotencyKey,
      parameters: { ...request.parameters },
    });

    if (!result || result.ok !== true) throw mapFacadeError(result?.error);
    assertCompletedRun(result.run, 'execute');
    if (result.run.tenantId !== request.tenantId || result.run.businessId !== request.businessId) {
      throw new SimulationTenantBoundaryError();
    }
    const { idempotentReplay, ...run } = result.run;
    return { status: 'completed', run, idempotentReplay: idempotentReplay === true };
  }

  async function read(query: CompletedRunQuery): Promise<CompletedSimulationRun> {
    if (!query?.tenantId?.trim() || !query?.businessId?.trim() || !query?.runId?.trim()) {
      throw new SimulationRequestInvalidError(['tenant_id_required', 'business_id_required', 'run_id_required']
        .filter((_, i) => [!query?.tenantId?.trim(), !query?.businessId?.trim(), !query?.runId?.trim()][i]));
    }
    const engine = engineOrThrow('getCompletedRun');
    const result = engine.getCompletedRun!({
      tenantId: query.tenantId,
      businessId: query.businessId,
      runId: query.runId,
      decisionId: query.decisionId,
    });
    if (!result || result.ok !== true) throw mapFacadeError(result?.error, query.runId);
    assertCompletedRun(result.run, 'read');
    if (result.run.tenantId !== query.tenantId || result.run.businessId !== query.businessId) {
      throw new SimulationTenantBoundaryError();
    }
    const { idempotentReplay: _replay, ...run } = result.run;
    return run;
  }

  return Object.freeze({
    mode: 'browser_global' as const,
    namespace: ENGINE_V3_NAMESPACE,
    execute,
    read,
  });
}
