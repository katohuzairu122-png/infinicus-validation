import { describe, it, expect } from 'vitest';
import { ManualRecordValidator } from '../src/validation/ManualRecordValidator.js';
import {
  MAX_NESTING_DEPTH,
  MAX_KEYS_PER_OBJECT,
  MAX_STRING_LENGTH,
  MAX_ARRAY_LENGTH,
} from '../src/validation/schemas.js';

describe('ManualRecordValidator.validateRecord', () => {
  const validator = new ManualRecordValidator();

  it('accepts a well-formed object', () => {
    const outcome = validator.validateRecord({ name: 'Widget', price: 9.99 }, 0);
    expect(outcome.isValid).toBe(true);
    expect(outcome.errorCount).toBe(0);
  });

  it('rejects a non-object record (array)', () => {
    const outcome = validator.validateRecord([1, 2, 3], 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues[0].ruleCode).toBe('RECORD_NOT_OBJECT');
    expect(outcome.issues[0].fieldPath).toBe('$');
  });

  it('rejects a non-object record (primitive)', () => {
    const outcome = validator.validateRecord('just a string', 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues[0].ruleCode).toBe('RECORD_NOT_OBJECT');
  });

  it('rejects a non-object record (null)', () => {
    const outcome = validator.validateRecord(null, 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues[0].ruleCode).toBe('RECORD_NOT_OBJECT');
  });

  it('rejects an empty record', () => {
    const outcome = validator.validateRecord({}, 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues[0].ruleCode).toBe('RECORD_EMPTY');
  });

  it('rejects undefined nested inside an object, with a field path', () => {
    const outcome = validator.validateRecord({ a: { b: undefined } }, 0);
    expect(outcome.isValid).toBe(false);
    const issue = outcome.issues.find((i) => i.ruleCode === 'VALUE_UNDEFINED');
    expect(issue).toBeDefined();
    expect(issue!.fieldPath).toBe('$.a.b');
  });

  it('rejects a function value', () => {
    const outcome = validator.validateRecord({ a: () => 1 }, 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues.some((i) => i.ruleCode === 'VALUE_UNSUPPORTED_TYPE')).toBe(true);
  });

  it('rejects a symbol value', () => {
    const outcome = validator.validateRecord({ a: Symbol('x') }, 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues.some((i) => i.ruleCode === 'VALUE_UNSUPPORTED_TYPE')).toBe(true);
  });

  it('rejects a non-JSON object value (Date)', () => {
    const outcome = validator.validateRecord({ a: new Date() }, 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues.some((i) => i.ruleCode === 'VALUE_UNSUPPORTED_TYPE')).toBe(true);
  });

  it('rejects NaN and Infinity as non-finite numbers', () => {
    const nanOutcome = validator.validateRecord({ a: NaN }, 0);
    expect(nanOutcome.isValid).toBe(false);
    expect(nanOutcome.issues[0].ruleCode).toBe('VALUE_NOT_FINITE');

    const infOutcome = validator.validateRecord({ a: Infinity }, 0);
    expect(infOutcome.isValid).toBe(false);
    expect(infOutcome.issues[0].ruleCode).toBe('VALUE_NOT_FINITE');
  });

  it('accepts finite numbers, including negative and zero', () => {
    const outcome = validator.validateRecord({ a: -5, b: 0, c: 3.14 }, 0);
    expect(outcome.isValid).toBe(true);
  });

  it('rejects a string longer than MAX_STRING_LENGTH', () => {
    const outcome = validator.validateRecord({ a: 'x'.repeat(MAX_STRING_LENGTH + 1) }, 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues[0].ruleCode).toBe('STRING_TOO_LONG');
  });

  it('accepts a string exactly at MAX_STRING_LENGTH', () => {
    const outcome = validator.validateRecord({ a: 'x'.repeat(MAX_STRING_LENGTH) }, 0);
    expect(outcome.isValid).toBe(true);
  });

  it('rejects an array longer than MAX_ARRAY_LENGTH', () => {
    const outcome = validator.validateRecord({ a: new Array(MAX_ARRAY_LENGTH + 1).fill(1) }, 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues[0].ruleCode).toBe('ARRAY_TOO_LARGE');
  });

  it('rejects an object with more than MAX_KEYS_PER_OBJECT keys', () => {
    const wide: Record<string, number> = {};
    for (let i = 0; i < MAX_KEYS_PER_OBJECT + 1; i++) wide['k' + i] = i;
    const outcome = validator.validateRecord(wide, 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues[0].ruleCode).toBe('TOO_MANY_KEYS');
  });

  it('rejects nesting deeper than MAX_NESTING_DEPTH', () => {
    let deep: unknown = { leaf: 1 };
    for (let i = 0; i < MAX_NESTING_DEPTH + 5; i++) deep = { nested: deep };
    const outcome = validator.validateRecord(deep, 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues.some((i) => i.ruleCode === 'NESTING_TOO_DEEP')).toBe(true);
  });

  it('reports a field path through arrays and nested objects', () => {
    const outcome = validator.validateRecord({ items: [{ price: NaN }] }, 0);
    expect(outcome.isValid).toBe(false);
    expect(outcome.issues[0].fieldPath).toBe('$.items[0].price');
  });

  it('assigns the given recordIndex', () => {
    const outcome = validator.validateRecord({ a: 1 }, 7);
    expect(outcome.recordIndex).toBe(7);
  });

  it('produces a canonicalKey even for an invalid record', () => {
    const outcome = validator.validateRecord({}, 0);
    expect(typeof outcome.canonicalKey).toBe('string');
    expect(outcome.canonicalKey.length).toBeGreaterThan(0);
  });
});

describe('ManualRecordValidator.validateBatch', () => {
  const validator = new ManualRecordValidator();

  it('rejects an empty batch as having no records to accept, without throwing', () => {
    const outcome = validator.validateBatch([]);
    expect(outcome.records).toHaveLength(0);
    expect(outcome.allValid).toBe(true); // vacuously true; caller decides what to do with zero records
  });

  it('flags exact duplicate records by canonical representation', () => {
    const outcome = validator.validateBatch([{ a: 1, b: 2 }, { b: 2, a: 1 }, { a: 3 }]);
    expect(outcome.duplicateRecordIndexes).toEqual([0, 1]);
  });

  it('does not flag structurally different records as duplicates', () => {
    const outcome = validator.validateBatch([{ a: 1 }, { a: 2 }, { a: 3 }]);
    expect(outcome.duplicateRecordIndexes).toEqual([]);
  });

  it('flags all occurrences when a record is duplicated three times', () => {
    const outcome = validator.validateBatch([{ a: 1 }, { a: 2 }, { a: 1 }, { a: 1 }]);
    expect(outcome.duplicateRecordIndexes).toEqual([0, 2, 3]);
  });

  it('aggregates total error and warning counts across the batch', () => {
    const outcome = validator.validateBatch([{ a: 1 }, {}, [1, 2]]);
    expect(outcome.totalErrorCount).toBeGreaterThanOrEqual(2); // {} empty, [1,2] not-object
    expect(outcome.allValid).toBe(false);
  });
});
