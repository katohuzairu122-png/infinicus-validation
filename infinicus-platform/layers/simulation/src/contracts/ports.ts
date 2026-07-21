// Simulation integration ports and canonical run types (BUILD-07).
// ADI consumes Simulation ONLY through these ports. Simulation produces
// evidence; it never produces recommendations or approvals.
import type { SimulationAssumption } from '@infinicus/handoff-contracts';

/**
 * Engine v3 headless execution parameters (USD-normalized values, exactly
 * the shape the existing engine consumes — see index.html `simulate()`).
 */
export interface EngineV3Parameters {
  industry: string;
  capital: number;
  price: number;
  mktBud: number;
  team: number;
  engMode?: string;
  exp?: string;
  comp?: string;
  loc?: string;
  idea?: string;
  extraDailyRev?: number;
}

/** A validated request to execute one Simulation scenario. */
export interface SimulationScenarioRequest {
  tenantId: string;
  businessId: string;
  correlationId: string;
  decisionId?: string;
  scenarioId?: string;
  /** Established idempotency mechanism: same key returns the same run. */
  idempotencyKey?: string;
  parameters: EngineV3Parameters;
}

/**
 * Canonical completed Simulation run. Field names and semantics match the
 * shape ADI-06's `validateSimulationRun` accepts — no duplicate identities.
 */
export interface CompletedSimulationRun {
  runId: string;
  tenantId: string;
  businessId: string;
  decisionId?: string;
  scenarioId?: string;
  correlationId?: string;
  engineVersion: string;
  modelVersion: string;
  schemaVersion: string;
  status: 'completed';
  completedAt: string;
  sampleSize: number;
  horizonDays: number;
  /** null — Engine v3 does not support seeded execution. */
  randomSeed: string | null;
  inputFingerprint?: string;
  scenarios: readonly string[];
  assumptions: readonly SimulationAssumption[];
  outputs: Record<string, unknown>;
  sourceResultRef: string;
}

/** Result of an execution request. Engine v3 completes synchronously. */
export interface SimulationExecutionResult {
  status: 'completed';
  run: CompletedSimulationRun;
  /** true when the established idempotency mechanism replayed an existing run. */
  idempotentReplay: boolean;
}

/** Query for a completed run by canonical identity within a boundary. */
export interface CompletedRunQuery {
  tenantId: string;
  businessId: string;
  runId: string;
  decisionId?: string;
}

/**
 * ExecuteSimulationScenarioPort — ADI-16's entry into Simulation.
 * Rejects invalid requests; preserves correlation/tenant/business identity;
 * duplicate execution is prevented via `idempotencyKey`.
 */
export interface ExecuteSimulationScenarioPort {
  execute(request: SimulationScenarioRequest): Promise<SimulationExecutionResult>;
}

/**
 * ReadCompletedSimulationRunPort — ADI-06's read-only entry into Simulation.
 * Returns only completed runs inside the caller's tenant/business boundary;
 * incomplete, failed, cancelled or cross-tenant runs are rejected with
 * typed errors.
 */
export interface ReadCompletedSimulationRunPort {
  read(query: CompletedRunQuery): Promise<CompletedSimulationRun>;
}

export function validateScenarioRequest(request: SimulationScenarioRequest | null | undefined): readonly string[] {
  const reasons: string[] = [];
  if (!request || typeof request !== 'object') return ['request_required'];
  if (!request.tenantId?.trim()) reasons.push('tenant_id_required');
  if (!request.businessId?.trim()) reasons.push('business_id_required');
  if (!request.correlationId?.trim()) reasons.push('correlation_id_required');
  const p = request.parameters;
  if (!p || typeof p !== 'object') {
    reasons.push('parameters_required');
    return reasons;
  }
  if (!p.industry?.trim()) reasons.push('parameters_industry_required');
  if (!(typeof p.capital === 'number' && Number.isFinite(p.capital) && p.capital > 0)) {
    reasons.push('parameters_capital_positive_required');
  }
  if (!(typeof p.price === 'number' && Number.isFinite(p.price) && p.price > 0)) {
    reasons.push('parameters_price_positive_required');
  }
  if (!(typeof p.mktBud === 'number' && Number.isFinite(p.mktBud) && p.mktBud >= 0)) {
    reasons.push('parameters_mkt_budget_invalid');
  }
  if (!(Number.isInteger(p.team) && p.team >= 1)) reasons.push('parameters_team_invalid');
  return reasons;
}
