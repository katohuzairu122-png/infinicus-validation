import { PROFILES, SIM_DAYS } from './data/profiles.js';
import { ENGINE_MODES, EXP_MULT, COMP_MULT } from './data/engineModes.js';
import { detectLocation } from './data/locations.js';
import { pickEvents } from './data/events.js';
import { rNorm, rnd } from './random.js';
import type { SimDay, SimLongDay, SimulateResult, SimulationParams } from './types.js';

/** Ported verbatim from index.html's simulate(). Single 90-day day-by-day run with discrete events. */
export function simulate(params: SimulationParams): SimulateResult {
  const prof = PROFILES[params.industry];
  const events = pickEvents();
  const evMap: Record<number, number> = {};
  events.forEach((e) => { evMap[e.day] = (evMap[e.day] || 1) * (1 + e.impact); });

  const em = ENGINE_MODES[params.engMode || 'balanced'];
  const expM = EXP_MULT[params.exp || 'some'];
  const compM = COMP_MULT[params.comp || 'medium'];
  const loc = detectLocation(params.loc);
  const totalAcqMult = em.acqMult * expM * compM;
  const fixedCostMult = em.costMult * loc.costMult;
  const varCostMult = em.costMult;
  const locAcqCost = prof.acqCost * loc.cacMult;

  const days: SimDay[] = [];
  let cash = params.capital, customers = 0;
  const dailyMkt = (params.mktBud / SIM_DAYS) * em.mktMult;

  const organicBase = Math.max(0.5, Math.log(params.team + 1) * 1.2) * prof.organicMult * totalAcqMult;

  for (let d = 1; d <= SIM_DAYS; d++) {
    const shock = evMap[d] || 1;
    const seasonMult = prof.season ? prof.season[(d - 1) % prof.season.length] : 1;

    const paidAcq = Math.max(0, Math.floor(rNorm(dailyMkt / locAcqCost, 1.5) * shock * totalAcqMult));
    const footTraffic = Math.max(0, Math.round(rNorm(organicBase, 1.0) * seasonMult * shock));
    const wordOfMouth = Math.round(customers * 0.003 * em.growthBoost);
    const acq = paidAcq + footTraffic + wordOfMouth;

    const churned = Math.floor(customers * prof.churn / 30);
    customers = Math.max(0, customers + acq - churned);
    const primRev = customers * (params.price * prof.visitsPerMonth / 30) * rnd(.75, 1.25) * shock * seasonMult;
    const rev = primRev + (params.extraDailyRev || 0);
    const fixed = (prof.fixBase * params.team + params.capital * prof.fixR * 0.05 / SIM_DAYS) * fixedCostMult;
    const varC = rev * prof.varR * varCostMult;
    const totalCost = fixed + varC + dailyMkt;
    const profit = rev - totalCost;
    cash += profit;
    days.push({ d, rev, cost: totalCost, fixed, varC, mktC: dailyMkt, profit, customers, acq, churned, cash, seasonMult });
  }
  return { days, events };
}

/** Ported verbatim from index.html's simulateLong(). Extended horizon (6M/12M), no discrete events. */
export function simulateLong(params: SimulationParams, totalDays: number): SimLongDay[] {
  const prof = PROFILES[params.industry];
  const em = ENGINE_MODES[params.engMode || 'balanced'];
  const expM = EXP_MULT[params.exp || 'some'];
  const compM = COMP_MULT[params.comp || 'medium'];
  const loc = detectLocation(params.loc);
  const totalAcqMult = em.acqMult * expM * compM;
  const fixedCostMult = em.costMult * loc.costMult;
  const varCostMult = em.costMult;
  const locAcqCost = prof.acqCost * loc.cacMult;

  const days: SimLongDay[] = [];
  let cash = params.capital, customers = 0;
  const dailyMkt = (params.mktBud / totalDays) * em.mktMult;
  const organicBase = Math.max(0.5, Math.log(params.team + 1) * 1.2) * prof.organicMult * totalAcqMult;

  for (let d = 1; d <= totalDays; d++) {
    const seasonMult = prof.season ? prof.season[(d - 1) % prof.season.length] : 1;
    const paidAcq = Math.max(0, Math.floor(rNorm(dailyMkt / locAcqCost, 1.5) * totalAcqMult));
    const footTraffic = Math.max(0, Math.round(rNorm(organicBase, 1.0) * seasonMult));
    const wordOfMouth = Math.round(customers * 0.003 * em.growthBoost);
    const acq = paidAcq + footTraffic + wordOfMouth;
    const churned = Math.floor(customers * prof.churn / 30);
    customers = Math.max(0, customers + acq - churned);
    const rev = customers * (params.price * prof.visitsPerMonth / 30) * rnd(.75, 1.25) * seasonMult + (params.extraDailyRev || 0);
    const fixed = (prof.fixBase * params.team + params.capital * prof.fixR * 0.05 / totalDays) * fixedCostMult;
    const varC = rev * prof.varR * varCostMult;
    const totalCost = fixed + varC + dailyMkt;
    cash += rev - totalCost;
    days.push({ d, rev, cost: totalCost, profit: rev - totalCost, customers, cash });
  }
  return days;
}
