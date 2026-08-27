import { canonicalizeRecord } from '../provenance/ProvenanceService.js';
import {
  MAX_NESTING_DEPTH,
  MAX_KEYS_PER_OBJECT,
  MAX_STRING_LENGTH,
  MAX_ARRAY_LENGTH,
} from './schemas.js';
import type {
  BatchValidationOutcome,
  RecordValidationIssue,
  RecordValidationOutcome,
} from '../types.js';

/**
 * Deterministic validation for one manual-intake record (BUILD-31 §4.9).
 * "Deterministic" means: the same record, validated twice, produces
 * byte-identical issues in the same order — no timestamps, no randomness,
 * no reliance on object key iteration order beyond what canonicalizeRecord
 * already normalizes for the duplicate-detection key.
 */
export class ManualRecordValidator {
  validateRecord(record: unknown, recordIndex: number): RecordValidationOutcome {
    const issues: RecordValidationIssue[] = [];

    if (record === null || typeof record !== 'object' || Array.isArray(record)) {
      issues.push({
        ruleCode: 'RECORD_NOT_OBJECT',
        fieldPath: '$',
        severity: 'error',
        issueType: 'type',
        message: 'Record must be a JSON object.',
        observedValue: describeType(record),
      });
      return this.finish(recordIndex, issues, record);
    }

    const obj = record as Record<string, unknown>;
    if (Object.keys(obj).length === 0) {
      issues.push({
        ruleCode: 'RECORD_EMPTY',
        fieldPath: '$',
        severity: 'error',
        issueType: 'empty',
        message: 'Record must not be empty.',
      });
      return this.finish(recordIndex, issues, record);
    }

    this.walk(obj, '$', 1, issues);

    return this.finish(recordIndex, issues, record);
  }

  validateBatch(records: unknown[]): BatchValidationOutcome {
    const outcomes = records.map((r, i) => this.validateRecord(r, i));

    const seen = new Map<string, number>();
    const duplicateRecordIndexes: number[] = [];
    for (const outcome of outcomes) {
      const firstIndex = seen.get(outcome.canonicalKey);
      if (firstIndex !== undefined) {
        duplicateRecordIndexes.push(outcome.recordIndex);
        // Also flag the first occurrence — a batch of 3 identical records
        // should mark all 3, not just the 2nd and 3rd, so "how many
        // records here are duplicated" is answerable from this array alone.
        if (!duplicateRecordIndexes.includes(firstIndex)) {
          duplicateRecordIndexes.push(firstIndex);
        }
      } else {
        seen.set(outcome.canonicalKey, outcome.recordIndex);
      }
    }
    duplicateRecordIndexes.sort((a, b) => a - b);

    return {
      records: outcomes,
      totalErrorCount: outcomes.reduce((sum, o) => sum + o.errorCount, 0),
      totalWarningCount: outcomes.reduce((sum, o) => sum + o.warningCount, 0),
      duplicateRecordIndexes,
      allValid: outcomes.every((o) => o.isValid),
    };
  }

  private finish(
    recordIndex: number,
    issues: RecordValidationIssue[],
    record: unknown
  ): RecordValidationOutcome {
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    // A record that failed the object/empty checks above still needs a
    // canonical key so duplicate-of-an-invalid-record is still detectable;
    // canonicalizeRecord tolerates any input.
    let canonicalKey: string;
    try {
      canonicalKey = canonicalizeRecord(record);
    } catch {
      canonicalKey = 'unserializable:' + recordIndex;
    }

    return {
      recordIndex,
      isValid: errorCount === 0,
      errorCount,
      warningCount,
      issues,
      canonicalKey,
    };
  }

  /**
   * Recursively walks one JSON value, appending an issue for every bound
   * this value or its descendants violate. `path` is the JSONPath-ish
   * field path reported on each issue (BUILD-31 §4.9: "record-level
   * validation issues must identify a field path where possible").
   */
  private walk(
    value: unknown,
    path: string,
    depth: number,
    issues: RecordValidationIssue[]
  ): void {
    if (depth > MAX_NESTING_DEPTH) {
      issues.push({
        ruleCode: 'NESTING_TOO_DEEP',
        fieldPath: path,
        severity: 'error',
        issueType: 'limit',
        message: `Nesting depth exceeds maximum of ${MAX_NESTING_DEPTH}.`,
      });
      return;
    }

    if (value === undefined) {
      issues.push({
        ruleCode: 'VALUE_UNDEFINED',
        fieldPath: path,
        severity: 'error',
        issueType: 'type',
        message: 'undefined is not a supported value.',
      });
      return;
    }

    if (typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
      issues.push({
        ruleCode: 'VALUE_UNSUPPORTED_TYPE',
        fieldPath: path,
        severity: 'error',
        issueType: 'type',
        message: `${typeof value} is not a supported value.`,
      });
      return;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        issues.push({
          ruleCode: 'VALUE_NOT_FINITE',
          fieldPath: path,
          severity: 'error',
          issueType: 'type',
          message: 'Numeric values must be finite (no NaN or Infinity).',
          observedValue: String(value),
        });
      }
      return;
    }

    if (typeof value === 'string') {
      if (value.length > MAX_STRING_LENGTH) {
        issues.push({
          ruleCode: 'STRING_TOO_LONG',
          fieldPath: path,
          severity: 'error',
          issueType: 'limit',
          message: `String length ${value.length} exceeds maximum of ${MAX_STRING_LENGTH}.`,
        });
      }
      return;
    }

    if (typeof value === 'boolean' || value === null) {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length > MAX_ARRAY_LENGTH) {
        issues.push({
          ruleCode: 'ARRAY_TOO_LARGE',
          fieldPath: path,
          severity: 'error',
          issueType: 'limit',
          message: `Array length ${value.length} exceeds maximum of ${MAX_ARRAY_LENGTH}.`,
        });
      }
      value.forEach((element, i) => this.walk(element, `${path}[${i}]`, depth + 1, issues));
      return;
    }

    if (typeof value === 'object') {
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) {
        // Not a plain object — a Date, Map, RegExp, class instance, etc.
        // These have no reliable JSON-compatible representation, so they
        // are rejected here rather than silently walked as "an object with
        // zero enumerable keys" (which Date and RegExp both are).
        issues.push({
          ruleCode: 'VALUE_UNSUPPORTED_TYPE',
          fieldPath: path,
          severity: 'error',
          issueType: 'type',
          message: `${describeType(value)} is not a JSON-compatible value.`,
        });
        return;
      }

      const keys = Object.keys(value as Record<string, unknown>);
      if (keys.length > MAX_KEYS_PER_OBJECT) {
        issues.push({
          ruleCode: 'TOO_MANY_KEYS',
          fieldPath: path,
          severity: 'error',
          issueType: 'limit',
          message: `Object has ${keys.length} keys, exceeding maximum of ${MAX_KEYS_PER_OBJECT}.`,
        });
      }
      for (const key of keys) {
        if (key.length === 0) {
          issues.push({
            ruleCode: 'KEY_EMPTY',
            fieldPath: path,
            severity: 'error',
            issueType: 'type',
            message: 'Object keys must be non-empty strings.',
          });
          continue;
        }
        this.walk(
          (value as Record<string, unknown>)[key],
          `${path}.${key}`,
          depth + 1,
          issues
        );
      }
      return;
    }
  }
}

function describeType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
