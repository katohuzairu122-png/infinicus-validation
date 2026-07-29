import { PROFILES, SIM_DAYS } from './data/profiles.js';
import { ENGINE_MODES, EXP_MULT, COMP_MULT } from './data/engineModes.js';
import { detectLocation } from './data/locations.js';
import { rNorm, rnd } from './random.js';
import type { MonteCarloResult, SimulationParams } from './types.js';

export interface MonteCarloLongResult {
  p10: number;
  p50: number;
  p90: number;
  survivalRate: number;
}

/** Ported verbatim from index.html's monteCarlo(). 500 runs, day-90 cash distribution. */
export function monteCarlo(params: SimulationParams): MonteCarloResult {
  const baseProf = PROFILES[params.industry];
  const em = ENGINE_MODES[params.engMode || 'balanced'];
  const expM = EXP_MULT[params.exp || 'some'];
  const compM = COMP_MULT[params.comp || 'medium'];
  const loc = detectLocation(params.loc);
  const totalAcqMult = em.acqMult * expM * compM;
  const fixedCostMult = em.costMult * loc.costMult;
  const varCostMult = em.costMult;
  const finals: number[] = [];
  const organicBase = Math.max(0.5, Math.log(params.team + 1) * 1.2) * baseProf.organicMult * totalAcqMult;

  for (let r = 0; r < 500; r++) {
    const p = {
      fixR: Math.max(.03, rNorm(baseProf.fixR, baseProf.fixR * .25)),
      varR: Math.max(.01, rNorm(baseProf.varR, baseProf.varR * .2)),
      acqCost: Math.max(1, rNorm(baseProf.acqCost * loc.cacMult, baseProf.acqCost * loc.cacMult * .3)),
      churn: Math.max(.005, rNorm(baseProf.churn, baseProf.churn * .25)),
    };
    let cash = params.capital, customers = 0;
    const dailyMkt = (params.mktBud / SIM_DAYS) * em.mktMult;
    for (let d = 1; d <= SIM_DAYS; d++) {
      const paidAcq = Math.max(0, Math.floor(rNorm(dailyMkt / p.acqCost, 1.2) * totalAcqMult));
      const footTraffic = Math.max(0, Math.round(rNorm(organicBase, 1.0)));
      const wordOfMouth = Math.round(customers * 0.003 * em.growthBoost);
      const acq = paidAcq + footTraffic + wordOfMouth;
      customers = Math.max(0, customers + acq - Math.floor(customers * p.churn / 30));
      const rev = customers * (params.price * baseProf.visitsPerMonth / 30) * rnd(.6, 1.4) + (params.extraDailyRev || 0);
      const fixedCost = (baseProf.fixBase * params.team + params.capital * p.fixR * 0.05 / SIM_DAYS) * fixedCostMult;
      cash += rev - (fixedCost + rev * p.varR * varCostMult + dailyMkt);
    }
    finals.push(cash);
  }
  finals.sort((a, b) => a - b);
  const N = finals.length;
  return {
    p10: finals[Math.floor(N * .10)], p25: finals[Math.floor(N * .25)],
    p50: finals[Math.floor(N * .50)], p75: finals[Math.floor(N * .75)],
    p90: finals[Math.floor(N * .90)],
    survivalRate: finals.filter((v) => v > 0).length / N,
    runs: finals,
  };
}

/** Ported verbatim from index.html's monteCarloLong(). 300 runs, extended horizon. */
export function monteCarloLong(params: SimulationParams, totalDays: number): MonteCarloLongResult {
  const baseProf = PROFILES[params.industry];
  const em = ENGINE_MODES[params.engMode || 'balanced'];
  const expM = EXP_MULT[params.exp || 'some'];
  const compM = COMP_MULT[params.comp || 'medium'];
  const loc = detectLocation(params.loc);
  const totalAcqMult = em.acqMult * expM * compM;
  const fixedCostMult = em.costMult * loc.costMult;
  const varCostMult = em.costMult;
  const organicBase = Math.max(0.5, Math.log(params.team + 1) * 1.2) * baseProf.organicMult * totalAcqMult;
  const finals: number[] = [];

  for (let r = 0; r < 300; r++) {
    const p = {
      fixR: Math.max(.03, rNorm(baseProf.fixR, baseProf.fixR * .25)),
      varR: Math.max(.01, rNorm(baseProf.varR, baseProf.varR * .2)),
      acqCost: Math.max(1, rNorm(baseProf.acqCost * loc.cacMult, baseProf.acqCost * loc.cacMult * .3)),
      churn: Math.max(.005, rNorm(baseProf.churn, baseProf.churn * .25)),
    };
    let cash = params.capital, customers = 0;
    const dailyMkt = (params.mktBud / totalDays) * em.mktMult;
    for (let d = 1; d <= totalDays; d++) {
      const seasonMult = baseProf.season ? baseProf.season[(d - 1) % baseProf.season.length] : 1;
      const paidAcq = Math.max(0, Math.floor(rNorm(dailyMkt / p.acqCost, 1.2) * totalAcqMult));
      const footTraffic = Math.max(0, Math.round(rNorm(organicBase, 1.0)));
      const wordOfMouth = Math.round(customers * 0.003 * em.growthBoost);
      customers = Math.max(0, customers + paidAcq + footTraffic + wordOfMouth - Math.floor(customers * p.churn / 30));
      const rev = customers * (params.price * baseProf.visitsPerMonth / 30) * rnd(.6, 1.4) * seasonMult + (params.extraDailyRev || 0);
      const fixedC = (baseProf.fixBase * params.team + params.capital * p.fixR * 0.05 / totalDays) * fixedCostMult;
      cash += rev - (fixedC + rev * p.varR * varCostMult + dailyMkt);
    }
    finals.push(cash);
  }
  finals.sort((a, b) => a - b);
  const N = finals.length;
  return {
    p10: finals[Math.floor(N * .1)], p50: finals[Math.floor(N * .5)], p90: finals[Math.floor(N * .9)],
    survivalRate: finals.filter((v) => v > 0).length / N,
  };
}
