import { simulate } from './simulate.js';
import { monteCarlo } from './monteCarlo.js';
import { calcScores } from './scores.js';
import { computeVerdict } from './verdict.js';
import type { EngineRunResult, SimulationParams } from './types.js';

/** engineNamespace default in SimulationModelRepository.createModel() nods to this same identity. */
export const ENGINE_VERSION = 'window.INFINICUS.SIMULATION@1.0.0-ported';

/**
 * Single entry point tying together simulate() + monteCarlo() + calcScores()
 * + computeVerdict() — the same sequence index.html's finalize()/renderVerdict()
 * perform client-side, run here server-side for the same params.
 */
export function runSimulation(params: SimulationParams): EngineRunResult {
  const { days, events } = simulate(params);
  const mc = monteCarlo(params);
  const scores = calcScores(days, mc, params);
  const { verdict, capRatio } = computeVerdict(days, mc, scores, params);
  return { engineVersion: ENGINE_VERSION, params, days, events, mc, scores, verdict, capRatio };
}
