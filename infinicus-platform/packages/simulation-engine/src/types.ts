/**
 * Ported, byte-for-byte, from the public site's client-side simulator
 * (root index.html: simulate/monteCarlo/simulateLong/monteCarloLong/
 * calcScores/computeVerdict) so a server-side run and the pre-existing
 * client-side run produce the same behavior for the same inputs.
 */

export type IndustryCode =
  | 'food' | 'retail' | 'saas' | 'service' | 'fitness' | 'agency'
  | 'health' | 'edtech' | 'marketplace' | 'events' | 'fintech'
  | 'realestate' | 'logistics';

export type EngineModeCode = 'balanced' | 'lean' | 'aggressive' | 'investor';
export type ExperienceCode = 'first' | 'some' | 'serial' | 'expert';
export type CompetitionCode = 'low' | 'medium' | 'high' | 'red';

export interface SimulationParams {
  idea: string;
  capital: number;
  price: number;
  mktBud: number;
  team: number;
  industry: IndustryCode;
  loc?: string;
  mkt?: string;
  exp?: ExperienceCode;
  comp?: CompetitionCode;
  engMode?: EngineModeCode;
  extraDailyRev?: number;
}

export interface IndustryProfile {
  fixR: number;
  varR: number;
  acqCost: number;
  churn: number;
  mktMult: number;
  visitsPerMonth: number;
  fixBase: number;
  organicMult: number;
  name: string;
  priceLabel: string;
  season: number[];
}

export interface SimEvent {
  type: 'econ' | 'cust' | 'comp' | 'ops' | 'mkt';
  msg: string;
  impact: number;
  day: number;
}

export interface SimDay {
  d: number;
  rev: number;
  cost: number;
  fixed: number;
  varC: number;
  mktC: number;
  profit: number;
  customers: number;
  acq: number;
  churned: number;
  cash: number;
  seasonMult: number;
}

export interface SimLongDay {
  d: number;
  rev: number;
  cost: number;
  profit: number;
  customers: number;
  cash: number;
}

export interface SimulateResult {
  days: SimDay[];
  events: SimEvent[];
}

export interface MonteCarloResult {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  survivalRate: number;
  runs: number[];
}

export interface Scores {
  VIABILITY: number;
  'MKT FIT': number;
  EXECUTION: number;
  FINANCIAL: number;
}

export type Verdict = 'go' | 'modify' | 'stop';

export interface EngineRunResult {
  engineVersion: string;
  params: SimulationParams;
  days: SimDay[];
  events: SimEvent[];
  mc: MonteCarloResult;
  scores: Scores;
  verdict: Verdict;
  capRatio: number;
}
