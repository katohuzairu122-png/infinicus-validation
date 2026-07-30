import { PROFILES, SIM_DAYS } from './data/profiles.js';
import { ENGINE_MODES } from './data/engineModes.js';
import { detectLocation } from './data/locations.js';
import type { MonteCarloResult, Scores, SimDay, SimulationParams, Verdict } from './types.js';

export interface VerdictOutcome {
  verdict: Verdict;
  capRatio: number;
}

/**
 * Ported from index.html's computeVerdict(), adapted from reading mutable
 * client-side state to explicit parameters — same formulas, same thresholds,
 * same capital-adequacy gate (see the original's own inline comment on why
 * a day-90-positive-cash result alone isn't sufficient for a GO: organic
 * foot traffic can accumulate customers before cash runs out even when a
 * founder's actual starting capital couldn't cover day-1 costs).
 */
export function computeVerdict(days: SimDay[], mc: MonteCarloResult, scores: Scores, params: SimulationParams): VerdictOutcome {
  const avg = Object.values(scores).reduce((s, v) => s + v, 0) / 4;
  const last = days[days.length - 1];
  const profDaysRatio = days.filter((x) => x.profit > 0).length / days.length;

  const prof = PROFILES[params.industry];
  const em = ENGINE_MODES[params.engMode || 'balanced'];
  const loc = detectLocation(params.loc);
  const fxMult = em.costMult * loc.costMult;
  const dailyFixed = prof.fixBase * (params.team || 1) * fxMult;
  const dailyMkt = (params.mktBud || 0) / SIM_DAYS * em.mktMult;
  const dailyBurn = dailyFixed + dailyMkt;
  const minCap30 = dailyBurn * 30;
  const capRatio = params.capital / Math.max(1, minCap30);

  if (capRatio < 0.15) return { verdict: 'stop', capRatio };

  if (avg >= 65 && last.cash > 0 && mc.survivalRate > .55 && profDaysRatio >= 0.30) {
    return { verdict: capRatio >= 0.50 ? 'go' : 'modify', capRatio };
  }
  if ((avg >= 40 || last.cash > 0) && profDaysRatio >= 0.15) return { verdict: 'modify', capRatio };
  return { verdict: 'stop', capRatio };
}
