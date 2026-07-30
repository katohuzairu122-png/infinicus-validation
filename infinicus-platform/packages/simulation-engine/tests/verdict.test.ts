import { describe, it, expect } from 'vitest';
import { runSimulation } from '../src/run.js';
import type { SimulationParams } from '../src/types.js';

const wellCapitalized: SimulationParams = {
  idea: 'Boutique private gym offering personal training and monthly memberships in a residential area.',
  capital: 20000,
  price: 120,
  mktBud: 800,
  team: 3,
  industry: 'fitness',
  loc: 'Dubai, UAE',
  exp: 'expert',
  comp: 'low',
  engMode: 'balanced',
};

describe('computeVerdict() via runSimulation()', () => {
  it('a severely undercapitalized idea (capRatio < 0.15) is always STOP, regardless of scores', () => {
    const result = runSimulation({ ...wellCapitalized, capital: 10, mktBud: 5000 });
    expect(result.capRatio).toBeLessThan(0.15);
    expect(result.verdict).toBe('stop');
  });

  it('verdict is always one of go/modify/stop', () => {
    for (let i = 0; i < 10; i++) {
      const result = runSimulation(wellCapitalized);
      expect(['go', 'modify', 'stop']).toContain(result.verdict);
    }
  });

  it('capRatio is a finite non-negative number', () => {
    const result = runSimulation(wellCapitalized);
    expect(Number.isFinite(result.capRatio)).toBe(true);
    expect(result.capRatio).toBeGreaterThanOrEqual(0);
  });

  it('a GO verdict never coincides with negative day-90 cash', () => {
    for (let i = 0; i < 15; i++) {
      const result = runSimulation(wellCapitalized);
      if (result.verdict === 'go') {
        expect(result.days[result.days.length - 1].cash).toBeGreaterThan(0);
      }
    }
  });
});
