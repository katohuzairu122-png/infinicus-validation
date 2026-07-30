import { describe, it, expect } from 'vitest';
import { simulate, simulateLong } from '../src/simulate.js';
import { SIM_DAYS } from '../src/data/profiles.js';
import type { SimulationParams } from '../src/types.js';

const baseParams: SimulationParams = {
  idea: 'Mobile food truck selling freshly cooked local meals during lunch and dinner hours near office districts.',
  capital: 8000,
  price: 8,
  mktBud: 300,
  team: 2,
  industry: 'food',
  loc: 'Nairobi, Kenya',
  mkt: 'Office workers & students 18-35',
  exp: 'some',
  comp: 'medium',
  engMode: 'balanced',
};

describe('simulate()', () => {
  it('returns exactly SIM_DAYS day entries in day order', () => {
    const { days } = simulate(baseParams);
    expect(days).toHaveLength(SIM_DAYS);
    expect(days.map((d) => d.d)).toEqual(Array.from({ length: SIM_DAYS }, (_, i) => i + 1));
  });

  it('every day is internally consistent: profit = rev - cost, cost = fixed + varC + mktC', () => {
    const { days } = simulate(baseParams);
    for (const day of days) {
      expect(day.cost).toBeCloseTo(day.fixed + day.varC + day.mktC, 6);
      expect(day.profit).toBeCloseTo(day.rev - day.cost, 6);
      expect(day.customers).toBeGreaterThanOrEqual(0);
    }
  });

  it('cash accumulates as capital plus cumulative profit', () => {
    const { days } = simulate(baseParams);
    let expectedCash = baseParams.capital;
    for (const day of days) {
      expectedCash += day.profit;
      expect(day.cash).toBeCloseTo(expectedCash, 4);
    }
  });

  it('emits between 4 and 8 discrete events, all within the day-2..59 window', () => {
    const { events } = simulate(baseParams);
    expect(events.length).toBeGreaterThanOrEqual(4);
    expect(events.length).toBeLessThanOrEqual(8);
    for (const e of events) {
      expect(e.day).toBeGreaterThanOrEqual(2);
      expect(e.day).toBeLessThanOrEqual(59);
    }
    const days = events.map((e) => e.day);
    expect(new Set(days).size).toBe(days.length); // no two events share a day
  });

  it('every industry profile produces a valid run (no NaN/undefined)', () => {
    const industries: SimulationParams['industry'][] = [
      'food', 'retail', 'saas', 'service', 'fitness', 'agency', 'health',
      'edtech', 'marketplace', 'events', 'fintech', 'realestate', 'logistics',
    ];
    for (const industry of industries) {
      const { days } = simulate({ ...baseParams, industry });
      expect(days).toHaveLength(SIM_DAYS);
      expect(Number.isFinite(days[days.length - 1].cash)).toBe(true);
    }
  });
});

describe('simulateLong()', () => {
  it('returns exactly totalDays entries for a 180-day horizon', () => {
    const days = simulateLong(baseParams, 180);
    expect(days).toHaveLength(180);
    expect(days[days.length - 1].d).toBe(180);
  });

  it('returns exactly totalDays entries for a 365-day horizon', () => {
    const days = simulateLong(baseParams, 365);
    expect(days).toHaveLength(365);
  });
});
