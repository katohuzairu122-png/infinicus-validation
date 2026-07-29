import { describe, it, expect } from 'vitest';
import { monteCarlo, monteCarloLong } from '../src/monteCarlo.js';
import type { SimulationParams } from '../src/types.js';

const baseParams: SimulationParams = {
  idea: 'Boutique private gym offering personal training sessions and monthly memberships.',
  capital: 20000,
  price: 120,
  mktBud: 800,
  team: 3,
  industry: 'fitness',
  loc: 'Dubai, UAE',
  exp: 'some',
  comp: 'medium',
  engMode: 'balanced',
};

describe('monteCarlo()', () => {
  it('runs exactly 500 iterations', () => {
    const result = monteCarlo(baseParams);
    expect(result.runs).toHaveLength(500);
  });

  it('percentiles are non-decreasing (p10 <= p25 <= p50 <= p75 <= p90)', () => {
    const { p10, p25, p50, p75, p90 } = monteCarlo(baseParams);
    expect(p10).toBeLessThanOrEqual(p25);
    expect(p25).toBeLessThanOrEqual(p50);
    expect(p50).toBeLessThanOrEqual(p75);
    expect(p75).toBeLessThanOrEqual(p90);
  });

  it('survivalRate is between 0 and 1 and matches the fraction of positive-cash runs', () => {
    const { runs, survivalRate } = monteCarlo(baseParams);
    expect(survivalRate).toBeGreaterThanOrEqual(0);
    expect(survivalRate).toBeLessThanOrEqual(1);
    const expected = runs.filter((v) => v > 0).length / runs.length;
    expect(survivalRate).toBeCloseTo(expected, 10);
  });

  it('runs are sorted ascending', () => {
    const { runs } = monteCarlo(baseParams);
    const sorted = [...runs].sort((a, b) => a - b);
    expect(runs).toEqual(sorted);
  });

  it('a much higher price point yields a materially higher survival rate than a low one, holding capital/costs fixed', () => {
    // NOT a capital-adequacy test: monteCarlo() doesn't halt a run on
    // negative interim cash (see verdict.ts's own capital-adequacy gate,
    // which exists specifically to patch around this model limitation).
    // With baseParams' $20k capital cushion, day-90 survival is ~always
    // true regardless of price (burn never approaches the cushion), so
    // this uses a thinner $2k cushion where price-driven revenue actually
    // decides the outcome.
    const thin = { ...baseParams, capital: 2000 };
    const cheap = monteCarlo({ ...thin, price: 1 });
    const premium = monteCarlo({ ...thin, price: 50 });
    expect(cheap.survivalRate).toBeLessThan(premium.survivalRate);
  });
});

describe('monteCarloLong()', () => {
  it('returns p10 <= p50 <= p90 and a valid survivalRate for a 180-day horizon', () => {
    const { p10, p50, p90, survivalRate } = monteCarloLong(baseParams, 180);
    expect(p10).toBeLessThanOrEqual(p50);
    expect(p50).toBeLessThanOrEqual(p90);
    expect(survivalRate).toBeGreaterThanOrEqual(0);
    expect(survivalRate).toBeLessThanOrEqual(1);
  });
});
