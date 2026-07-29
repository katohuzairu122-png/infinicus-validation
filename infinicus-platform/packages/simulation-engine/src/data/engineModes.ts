import type { CompetitionCode, EngineModeCode, ExperienceCode } from '../types.js';

interface EngineMode {
  mktMult: number;
  costMult: number;
  growthBoost: number;
  acqMult: number;
  label: string;
}

/** Ported verbatim from index.html. */
export const ENGINE_MODES: Record<EngineModeCode, EngineMode> = {
  balanced:   { mktMult: 1.0, costMult: 1.0,  growthBoost: 1.0, acqMult: 1.0,  label: 'Balanced' },
  lean:       { mktMult: 0.5, costMult: 0.75, growthBoost: 0.7, acqMult: 0.65, label: 'Lean Survival' },
  aggressive: { mktMult: 2.0, costMult: 1.2,  growthBoost: 1.5, acqMult: 1.8,  label: 'Aggressive Scale' },
  investor:   { mktMult: 1.8, costMult: 1.1,  growthBoost: 2.0, acqMult: 2.2,  label: 'Investor View' },
};

export const EXP_MULT: Record<ExperienceCode, number> = { first: 0.80, some: 1.0, serial: 1.20, expert: 1.35 };

export const COMP_MULT: Record<CompetitionCode, number> = { low: 1.25, medium: 1.0, high: 0.75, red: 0.55 };
