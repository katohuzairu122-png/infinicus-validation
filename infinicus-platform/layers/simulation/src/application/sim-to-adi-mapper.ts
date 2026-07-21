// Maps a completed Engine v3 Simulation run into the SIM → ADI handoff
// (BUILD-07). Values pass through verbatim — no numeric alteration, no unit
// conversion, no fabricated metrics; absent optional evidence stays absent.
import {
  SIM_TO_ADI_CONTRACT_VERSION,
  validateSIMToADIHandoff,
  type SIMToADIHandoff,
  type SIMToADIHandoffPayload,
} from '@infinicus/handoff-contracts';
import type { LineageEntry } from '@infinicus/shared-types';
import { SimulationResultInvalidError, SimulationRunNotCompletedError } from '../contracts/errors';
import type { CompletedSimulationRun } from '../contracts/ports';
import { ENGINE_V3_NAMESPACE } from '../infrastructure/engine-v3-browser-adapter';

export interface SimToADIMapperOptions {
  handoffId: string;
  sourceBlock: string;
  targetBlock?: string;
  correlationId?: string;
  currencyCode?: string;
  now?: () => string;
}

interface EngineOutputs {
  finalCashPercentiles?: { p10: number; p25: number; p50: number; p75: number; p90: number };
  survivalRate?: number;
  finalCashBasePath?: number | null;
  currencyCode?: string;
}

/**
 * Builds the SIM → ADI handoff for a completed run and validates it against
 * the contract before returning. Non-completed runs are rejected.
 */
export function mapCompletedRunToSIMToADIHandoff(
  run: CompletedSimulationRun,
  options: SimToADIMapperOptions
): SIMToADIHandoff {
  if (!run || typeof run !== 'object') {
    throw new SimulationResultInvalidError(['run_required']);
  }
  if (run.status !== 'completed') {
    throw new SimulationRunNotCompletedError(run.runId ?? 'unknown', String(run.status));
  }

  const outputs = run.outputs as EngineOutputs;
  const pct = outputs.finalCashPercentiles;
  if (
    !pct ||
    ![pct.p10, pct.p25, pct.p50, pct.p75, pct.p90].every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    throw new SimulationResultInvalidError(['final_cash_percentiles_missing']);
  }
  if (typeof outputs.survivalRate !== 'number' || !Number.isFinite(outputs.survivalRate)) {
    throw new SimulationResultInvalidError(['survival_rate_missing']);
  }

  const createdAt = options.now ? options.now() : new Date().toISOString();
  const limitations: string[] = [];
  if (run.randomSeed === null) {
    limitations.push('engine_v3_does_not_support_seeded_reproducibility');
  }

  const payload: SIMToADIHandoffPayload = {
    contractVersion: SIM_TO_ADI_CONTRACT_VERSION,
    tenantId: run.tenantId,
    businessId: run.businessId,
    run: {
      runId: run.runId,
      scenarioId: run.scenarioId,
      decisionId: run.decisionId,
      engineVersion: run.engineVersion,
      modelVersion: run.modelVersion,
      schemaVersion: run.schemaVersion,
      status: 'completed',
      completedAt: run.completedAt,
      sampleSize: run.sampleSize,
      horizonDays: run.horizonDays,
      randomSeed: run.randomSeed,
      inputFingerprint: run.inputFingerprint,
      scenarios: [...run.scenarios],
      assumptions: run.assumptions.map((a) => ({ ...a })),
    },
    inputSnapshot: {
      parametersVersion: run.modelVersion,
      parameters: Object.fromEntries(run.assumptions.map((a) => [a.name, a.value])),
    },
    outcomes: {
      finalCashBasePath:
        typeof outputs.finalCashBasePath === 'number' && Number.isFinite(outputs.finalCashBasePath)
          ? outputs.finalCashBasePath
          : null,
      survivalRate: outputs.survivalRate,
      sampleSize: run.sampleSize,
      horizonDays: run.horizonDays,
    },
    uncertainty: {
      basis: 'final_cash',
      currencyCode: outputs.currencyCode ?? options.currencyCode ?? 'USD',
      p10: pct.p10,
      p25: pct.p25,
      p50: pct.p50,
      p75: pct.p75,
      p90: pct.p90,
    },
    risk: {
      survivalRate: outputs.survivalRate,
      downsideFinalCashP10: pct.p10,
    },
    // sensitivity intentionally absent — Engine v3 produces none headlessly.
    limitations,
    warnings: [],
    provenance: {
      sourceLayer: 'SIM',
      sourceBlock: options.sourceBlock,
      engineNamespace: ENGINE_V3_NAMESPACE,
      sourceResultRef: run.sourceResultRef,
    },
  };

  const lineage: LineageEntry[] = [
    {
      layer: 'SIM',
      block: options.sourceBlock,
      recordId: run.runId,
      timestamp: createdAt,
      action: 'simulation_run_completed',
    },
  ];

  const handoff: SIMToADIHandoff = {
    handoffId: options.handoffId,
    sourceLayer: 'SIM',
    sourceBlock: options.sourceBlock,
    targetLayer: 'ADI',
    targetBlock: options.targetBlock ?? 'ADI-06',
    payload,
    correlationId: options.correlationId ?? run.correlationId ?? run.runId,
    lineage,
    status: 'ready',
    createdAt,
  };

  const validation = validateSIMToADIHandoff(handoff);
  if (!validation.valid) {
    throw new SimulationResultInvalidError(validation.reasons);
  }
  return handoff;
}
