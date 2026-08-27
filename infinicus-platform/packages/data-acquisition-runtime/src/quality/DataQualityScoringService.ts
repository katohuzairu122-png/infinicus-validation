import type {
  BatchValidationOutcome,
  QualityClassification,
  QualityDimensionScores,
  QualityScoreResult,
} from '../types.js';

/**
 * BUILD-31 §4.10's minimum default weighting. Frozen, summing to 1.0,
 * tested directly in this package's unit tests.
 */
export const DEFAULT_QUALITY_WEIGHTS: Readonly<QualityDimensionScores> = Object.freeze({
  completeness: 0.20,
  validity:     0.25,
  consistency:  0.15,
  timeliness:   0.10,
  uniqueness:   0.20,
  conformity:   0.10,
});

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function classify(overallScore: number): QualityClassification {
  if (overallScore >= 90) return 'excellent';
  if (overallScore >= 75) return 'acceptable';
  if (overallScore >= 50) return 'degraded';
  return 'unacceptable';
}

/**
 * Heuristic used only by the timeliness dimension: a key name that looks
 * like a timestamp field, so a record's own declared time can inform
 * scoring when one is present. Not a schema — records are never required
 * to have a field matching this.
 */
const TIMESTAMP_KEY_PATTERN = /(_at|date|time|timestamp)$/i;

/** Timeliness treats data within this many days of "now" as fully timely. */
const TIMELINESS_WINDOW_DAYS = 90;

/**
 * Recursively collects every leaf value (non-object, non-array) in a JSON
 * value, for the completeness dimension.
 */
function collectLeaves(value: unknown, out: unknown[]): void {
  if (value === null || typeof value !== 'object') {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectLeaves(item, out);
    return;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    collectLeaves((value as Record<string, unknown>)[key], out);
  }
}

/** The top-level key set of a record, sorted, joined — a "shape fingerprint." */
function shapeKey(record: unknown): string | null {
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return null;
  return Object.keys(record as Record<string, unknown>).sort().join(',');
}

/**
 * Recursively collects `{ path, value }` pairs for every leaf, so conformity
 * can compare the JS type observed at the same field path across records.
 */
function collectLeafPaths(value: unknown, path: string, out: Array<{ path: string; value: unknown }>): void {
  if (value === null || typeof value !== 'object') {
    out.push({ path, value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectLeafPaths(item, `${path}[${i}]`, out));
    return;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    collectLeafPaths((value as Record<string, unknown>)[key], `${path}.${key}`, out);
  }
}

function typeTag(value: unknown): string {
  if (value === null) return 'null';
  return typeof value;
}

function findTimestampValues(record: unknown): Date[] {
  const found: Date[] = [];
  if (record === null || typeof record !== 'object' || Array.isArray(record)) return found;
  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    if (typeof value === 'string' && TIMESTAMP_KEY_PATTERN.test(key)) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) found.push(parsed);
    }
  }
  return found;
}

/**
 * Deterministic quality scoring over one manual-intake batch (BUILD-31
 * §4.10). Every dimension is computed from the records and the validation
 * outcome already produced by ManualRecordValidator — nothing here is
 * user-supplied or inferred from external state, so the same batch always
 * scores identically.
 *
 * BUILD-31 names the six dimensions and the default weights but does not
 * define per-dimension formulas; each one below is a documented design
 * decision, not a value taken from the spec:
 *
 *   validity      — fraction of records with zero validation errors.
 *   completeness  — fraction of leaf values across all records that are
 *                   non-null and non-empty-string (a distinct signal from
 *                   validity: a record can be well-formed JSON yet mostly
 *                   blank).
 *   uniqueness    — fraction of records not flagged as duplicates by
 *                   ManualRecordValidator's canonical-key comparison.
 *   consistency   — fraction of records whose top-level key set matches
 *                   the batch's most common ("mode") shape. Manual JSON has
 *                   no fixed schema, so structural agreement across the
 *                   batch is the only consistency signal available.
 *   conformity    — for every field path that appears in more than one
 *                   record, whether its JS type is the same everywhere it
 *                   appears; conformity is the fraction of such paths that
 *                   stay type-consistent. A batch with no repeated field
 *                   paths (e.g. a single record) is vacuously conformant.
 *   timeliness    — records carrying a recognizable timestamp-like field
 *                   (key ending in _at/date/time/timestamp) score by how
 *                   many of those values fall within TIMELINESS_WINDOW_DAYS
 *                   of now; a batch with no timestamp fields at all scores
 *                   100 rather than being penalized for data that was
 *                   never asked to carry a time.
 */
export class DataQualityScoringService {
  score(
    records: unknown[],
    validation: BatchValidationOutcome,
    weights: QualityDimensionScores = DEFAULT_QUALITY_WEIGHTS
  ): QualityScoreResult {
    const total = records.length;

    const validity = total === 0 ? 0 : ((total - countInvalid(validation)) / total) * 100;
    const completeness = scoreCompleteness(records);
    const uniqueness = total === 0
      ? 0
      : ((total - validation.duplicateRecordIndexes.length) / total) * 100;
    const consistency = scoreConsistency(records);
    const conformity = scoreConformity(records);
    const timeliness = scoreTimeliness(records);

    const dims: QualityDimensionScores = {
      completeness: round2(completeness),
      validity:     round2(validity),
      consistency:  round2(consistency),
      timeliness:   round2(timeliness),
      uniqueness:   round2(uniqueness),
      conformity:   round2(conformity),
    };

    const overallScore = round2(
      dims.completeness * weights.completeness +
      dims.validity     * weights.validity +
      dims.consistency  * weights.consistency +
      dims.timeliness   * weights.timeliness +
      dims.uniqueness   * weights.uniqueness +
      dims.conformity   * weights.conformity
    );

    return {
      ...dims,
      overallScore,
      classification: classify(overallScore),
      weights,
    };
  }
}

function countInvalid(validation: BatchValidationOutcome): number {
  return validation.records.filter((r) => !r.isValid).length;
}

function scoreCompleteness(records: unknown[]): number {
  const leaves: unknown[] = [];
  for (const record of records) collectLeaves(record, leaves);
  if (leaves.length === 0) return 0;
  const filled = leaves.filter((v) => v !== null && v !== undefined && v !== '').length;
  return (filled / leaves.length) * 100;
}

function scoreConsistency(records: unknown[]): number {
  const shapes = records.map(shapeKey).filter((s): s is string => s !== null);
  if (shapes.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const shape of shapes) counts.set(shape, (counts.get(shape) ?? 0) + 1);
  const modeCount = Math.max(...counts.values());
  return (modeCount / records.length) * 100;
}

function scoreConformity(records: unknown[]): number {
  const byPath = new Map<string, Set<string>>();
  for (const record of records) {
    const leaves: Array<{ path: string; value: unknown }> = [];
    collectLeafPaths(record, '$', leaves);
    for (const { path, value } of leaves) {
      const types = byPath.get(path) ?? new Set<string>();
      types.add(typeTag(value));
      byPath.set(path, types);
    }
  }
  const repeatedPaths = [...byPath.values()];
  if (repeatedPaths.length === 0) return 100;
  const conformant = repeatedPaths.filter((types) => types.size === 1).length;
  return (conformant / repeatedPaths.length) * 100;
}

function scoreTimeliness(records: unknown[]): number {
  const now = Date.now();
  const windowMs = TIMELINESS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const timestamps = records.flatMap(findTimestampValues);
  if (timestamps.length === 0) return 100;
  const withinWindow = timestamps.filter((d) => now - d.getTime() <= windowMs && d.getTime() <= now).length;
  return (withinWindow / timestamps.length) * 100;
}
