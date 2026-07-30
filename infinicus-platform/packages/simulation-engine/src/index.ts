export { simulate, simulateLong } from './simulate.js';
export { monteCarlo, monteCarloLong } from './monteCarlo.js';
export type { MonteCarloLongResult } from './monteCarlo.js';
export { calcScores } from './scores.js';
export { computeVerdict } from './verdict.js';
export type { VerdictOutcome } from './verdict.js';
export { runSimulation, ENGINE_VERSION } from './run.js';
export { PROFILES, SIM_DAYS } from './data/profiles.js';
export { ENGINE_MODES, EXP_MULT, COMP_MULT } from './data/engineModes.js';
export { detectLocation, LOCATION_COSTS } from './data/locations.js';
export { pickEvents, EVT_POOL } from './data/events.js';
export { rnd, rndi, gauss, rNorm } from './random.js';

export type {
  IndustryCode,
  EngineModeCode,
  ExperienceCode,
  CompetitionCode,
  SimulationParams,
  IndustryProfile,
  SimEvent,
  SimDay,
  SimLongDay,
  SimulateResult,
  MonteCarloResult,
  Scores,
  Verdict,
  EngineRunResult,
} from './types.js';
