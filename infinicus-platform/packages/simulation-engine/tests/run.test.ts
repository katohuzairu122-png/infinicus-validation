import { describe, it, expect } from 'vitest';
import { runSimulation, ENGINE_VERSION } from '../src/run.js';
import type { SimulationParams } from '../src/types.js';

const params: SimulationParams = {
  idea: 'B2B SaaS tool that automates social-media scheduling and analytics for SMEs.',
  capital: 15000,
  price: 29,
  mktBud: 1200,
  team: 2,
  industry: 'saas',
  loc: 'Accra, Ghana',
  exp: 'some',
  comp: 'medium',
  engMode: 'balanced',
};

describe('runSimulation()', () => {
  it('produces a complete result with all four score dimensions', () => {
    const result = runSimulation(params);
    expect(result.engineVersion).toBe(ENGINE_VERSION);
    expect(result.scores).toHaveProperty('VIABILITY');
    expect(result.scores).toHaveProperty('MKT FIT');
    expect(result.scores).toHaveProperty('EXECUTION');
    expect(result.scores).toHaveProperty('FINANCIAL');
    for (const v of Object.values(result.scores)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it('echoes back the exact params it was called with', () => {
    const result = runSimulation(params);
    expect(result.params).toEqual(params);
  });

  it('mc.runs has 500 entries and days has 90 entries, consistent with simulate()/monteCarlo() directly', () => {
    const result = runSimulation(params);
    expect(result.days).toHaveLength(90);
    expect(result.mc.runs).toHaveLength(500);
  });
});
