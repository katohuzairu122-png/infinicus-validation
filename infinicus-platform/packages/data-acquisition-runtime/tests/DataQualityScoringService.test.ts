import { describe, it, expect } from 'vitest';
import { DataQualityScoringService, DEFAULT_QUALITY_WEIGHTS } from '../src/quality/DataQualityScoringService.js';
import { ManualRecordValidator } from '../src/validation/ManualRecordValidator.js';

describe('DEFAULT_QUALITY_WEIGHTS', () => {
  it('matches BUILD-31 §4.10\'s frozen minimum weighting', () => {
    expect(DEFAULT_QUALITY_WEIGHTS).toEqual({
      completeness: 0.20,
      validity: 0.25,
      consistency: 0.15,
      timeliness: 0.10,
      uniqueness: 0.20,
      conformity: 0.10,
    });
  });

  it('sums to 1.0', () => {
    const sum = Object.values(DEFAULT_QUALITY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });
});

describe('DataQualityScoringService.score', () => {
  const scoring = new DataQualityScoringService();
  const validator = new ManualRecordValidator();

  it('scores a batch of fully valid, unique, consistent, complete records highly', () => {
    const records = [
      { name: 'Widget', price: 9.99 },
      { name: 'Gadget', price: 19.99 },
      { name: 'Gizmo', price: 29.99 },
    ];
    const validation = validator.validateBatch(records);
    const result = scoring.score(records, validation);

    expect(result.validity).toBe(100);
    expect(result.uniqueness).toBe(100);
    expect(result.consistency).toBe(100);
    expect(result.completeness).toBe(100);
    expect(result.overallScore).toBeGreaterThan(90);
    expect(result.classification).toBe('excellent');
  });

  it('validity drops when some records are invalid', () => {
    const records = [{ name: 'ok' }, {}, [1]];
    const validation = validator.validateBatch(records);
    const result = scoring.score(records, validation);
    expect(result.validity).toBeCloseTo((1 / 3) * 100, 1);
  });

  it('uniqueness drops when records are duplicates', () => {
    const records = [{ a: 1 }, { a: 1 }, { a: 2 }];
    const validation = validator.validateBatch(records);
    const result = scoring.score(records, validation);
    // duplicateRecordIndexes = [0,1] -> (3-2)/3 = 33.33...
    expect(result.uniqueness).toBeCloseTo((1 / 3) * 100, 1);
  });

  it('completeness drops when leaf values are null or empty string', () => {
    const records = [{ a: null, b: '', c: 'filled' }];
    const validation = validator.validateBatch(records);
    const result = scoring.score(records, validation);
    expect(result.completeness).toBeCloseTo((1 / 3) * 100, 1);
  });

  it('consistency drops when records have different shapes', () => {
    const records = [{ a: 1, b: 2 }, { a: 1, b: 2 }, { c: 3 }];
    const validation = validator.validateBatch(records);
    const result = scoring.score(records, validation);
    // mode shape "a,b" appears twice out of three
    expect(result.consistency).toBeCloseTo((2 / 3) * 100, 1);
  });

  it('conformity drops when the same field path has inconsistent types across records', () => {
    const records = [{ price: 9.99 }, { price: 'nine ninety nine' }, { price: 19.99 }];
    const validation = validator.validateBatch(records);
    const result = scoring.score(records, validation);
    // one repeated path ($.price) with two distinct types -> 0% conformant
    expect(result.conformity).toBe(0);
  });

  it('conformity is 100 when there are no repeated field paths', () => {
    const records = [{ onlyOne: 1 }];
    const validation = validator.validateBatch(records);
    const result = scoring.score(records, validation);
    expect(result.conformity).toBe(100);
  });

  it('timeliness defaults to 100 when no records carry a timestamp-like field', () => {
    const records = [{ name: 'Widget' }];
    const validation = validator.validateBatch(records);
    const result = scoring.score(records, validation);
    expect(result.timeliness).toBe(100);
  });

  it('timeliness scores recent timestamps highly and old ones low', () => {
    const recent = new Date().toISOString();
    const old = new Date('2000-01-01').toISOString();
    const records = [{ created_at: recent }, { created_at: old }];
    const validation = validator.validateBatch(records);
    const result = scoring.score(records, validation);
    expect(result.timeliness).toBeCloseTo(50, 1);
  });

  it('computes the overall score as the weighted sum of the six dimensions', () => {
    const records = [{ a: 1 }, { a: 1 }]; // duplicates -> uniqueness 50, everything else 100
    const validation = validator.validateBatch(records);
    const result = scoring.score(records, validation);

    const expected =
      result.completeness * DEFAULT_QUALITY_WEIGHTS.completeness +
      result.validity * DEFAULT_QUALITY_WEIGHTS.validity +
      result.consistency * DEFAULT_QUALITY_WEIGHTS.consistency +
      result.timeliness * DEFAULT_QUALITY_WEIGHTS.timeliness +
      result.uniqueness * DEFAULT_QUALITY_WEIGHTS.uniqueness +
      result.conformity * DEFAULT_QUALITY_WEIGHTS.conformity;

    expect(result.overallScore).toBeCloseTo(expected, 2);
  });

  it('classifies scores into the four BUILD-31 §4.10 bands', () => {
    // Force each band by constructing a validation outcome and records that
    // drive overallScore into it, using custom weights (all weight on
    // validity) to make the arithmetic exact and easy to reason about.
    const allValidityWeight = {
      completeness: 0, validity: 1, consistency: 0, timeliness: 0, uniqueness: 0, conformity: 0,
    };

    const excellent = scoring.score([{ a: 1 }], validator.validateBatch([{ a: 1 }]), allValidityWeight);
    expect(excellent.overallScore).toBe(100);
    expect(excellent.classification).toBe('excellent');

    // 8/10 valid -> validity 80 -> acceptable band [75,89]
    const eightValid = [...Array(8).fill({ a: 1 }), {}, []];
    const eightValidation = validator.validateBatch(eightValid);
    const acceptable = scoring.score(eightValid, eightValidation, allValidityWeight);
    expect(acceptable.overallScore).toBe(80);
    expect(acceptable.classification).toBe('acceptable');

    // 6/10 valid -> validity 60 -> degraded band [50,74]
    const sixValid = [...Array(6).fill({ a: 1 }), {}, {}, [], []];
    const sixValidation = validator.validateBatch(sixValid);
    const degraded = scoring.score(sixValid, sixValidation, allValidityWeight);
    expect(degraded.overallScore).toBe(60);
    expect(degraded.classification).toBe('degraded');

    // 2/10 valid -> validity 20 -> unacceptable band [0,49]
    const twoValid = [...Array(2).fill({ a: 1 }), {}, {}, {}, {}, {}, {}, {}, {}];
    const twoValidation = validator.validateBatch(twoValid);
    const unacceptable = scoring.score(twoValid, twoValidation, allValidityWeight);
    expect(unacceptable.overallScore).toBe(20);
    expect(unacceptable.classification).toBe('unacceptable');
  });
});
