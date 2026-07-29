import { SIM_DAYS } from './data/profiles.js';
import type { MonteCarloResult, Scores, SimDay, SimulationParams } from './types.js';

/**
 * Ported from index.html's calcScores(), adapted from reading mutable
 * client-side state (S.days/S.mc/S.params) to explicit parameters —
 * same formulas, same output shape.
 */
export function calcScores(days: SimDay[], mc: MonteCarloResult, params: SimulationParams): Scores {
  const endCash = days[days.length - 1]?.cash ?? 0;
  const profDays = days.filter((x) => x.profit > 0).length;
  const finalCust = days[days.length - 1]?.customers ?? 0;
  const surv = mc.survivalRate;
  const totalRev = days.reduce((s, x) => s + x.rev, 0);
  const totalCost = days.reduce((s, x) => s + x.cost, 0);
  const viability = Math.round(Math.min(100, Math.max(0, surv * 55 + (profDays / SIM_DAYS) * 30 + (endCash > 0 ? 15 : 0))));
  const mktFit = Math.round(Math.min(100, Math.max(0, Math.min(finalCust / 20, 1) * 45 + (totalRev > totalCost ? 35 : 10) + 15)));
  const execution = Math.round(Math.min(100, Math.max(0, profDays / SIM_DAYS * 60 + Math.min(finalCust, 30) / 30 * 40)));
  const financial = Math.round(Math.min(100, Math.max(0, Math.min(endCash / params.capital, 1) * 50 + (totalRev > 0 ? 30 : 0) + (endCash > 0 ? 20 : 0))));
  return { VIABILITY: viability, 'MKT FIT': mktFit, EXECUTION: execution, FINANCIAL: financial };
}
