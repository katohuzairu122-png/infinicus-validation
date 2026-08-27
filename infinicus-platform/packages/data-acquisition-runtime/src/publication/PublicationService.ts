import { PublicationNotReadyError, QualityThresholdError } from '../errors.js';

/**
 * BUILD-31 §4.12 restricts the first production slice to one target layer.
 * Kept as a named constant (rather than a literal string scattered across
 * call sites) so the restriction is one place to change when a second
 * target layer is added.
 */
export const SUPPORTED_TARGET_LAYERS: readonly string[] = Object.freeze(['business_operations']);

/**
 * §4.13 requires publication to be blocked below some quality floor —
 * "publication below minimum quality threshold" is an explicit required
 * test (§8.3) — but does not name the number. 50 is this build's choice:
 * DataQualityScoringService classifies 50-74 as "degraded" and below 50 as
 * "unacceptable" (§4.10); publishing unacceptable data to Business
 * Operations is what this floor exists to prevent.
 */
export const MINIMUM_QUALITY_SCORE_FOR_PUBLICATION = 50;

export interface PackagePreparationInput {
  runState: string;
  targetLayer: string;
  targetBlock: string | undefined;
  qualityScoreExists: boolean;
  /** Provenance records created for this run's accepted records. */
  provenanceCount: number;
  acceptedRecordCount: number;
}

export interface PublishInput {
  packageStatus: string;
  targetLayer: string;
  qualityScore: number | null;
}

/**
 * Pure readiness checks — no database access. DataAcquisitionService reads
 * the facts (run state, quality score, provenance count) through the
 * repositories and passes them in here; this class only decides whether
 * those facts satisfy BUILD-31 §4.12/§4.13, and throws a controlled error
 * naming exactly which requirement failed when they don't.
 */
export class PublicationService {
  /**
   * BUILD-31 §4.12: "run must belong to the business" (checked by the
   * caller before this is reached — a business-scoped repository lookup,
   * not a fact this service can verify on its own), "run must be
   * validated", "quality score must exist", "provenance must exist for
   * accepted records", "record count must be coherent", target layer
   * restricted to business_operations, target block explicit.
   */
  assertReadyForPreparation(input: PackagePreparationInput): void {
    if (input.runState !== 'validated') {
      throw new PublicationNotReadyError(
        'run',
        `collection run must be in state "validated" to prepare a publication package, found "${input.runState}"`
      );
    }
    if (!SUPPORTED_TARGET_LAYERS.includes(input.targetLayer)) {
      throw new PublicationNotReadyError(
        'targetLayer',
        `unsupported target layer "${input.targetLayer}"; only ${SUPPORTED_TARGET_LAYERS.join(', ')} is supported in this build`
      );
    }
    if (!input.targetBlock || input.targetBlock.trim().length === 0) {
      throw new PublicationNotReadyError('targetBlock', 'target block must be explicit');
    }
    if (!input.qualityScoreExists) {
      throw new PublicationNotReadyError('qualityScore', 'no quality score exists for this run');
    }
    if (input.provenanceCount !== input.acceptedRecordCount) {
      throw new PublicationNotReadyError(
        'provenance',
        `expected ${input.acceptedRecordCount} provenance records (one per accepted record), found ${input.provenanceCount}`
      );
    }
  }

  /**
   * BUILD-31 §4.13: "package must be ready", "package must target
   * business_operations", "package cannot be published twice" (a
   * `published` package failing this check reports it as not-ready rather
   * than repeating publish — actually transitioning it twice is guarded at
   * the repository layer by runGuardedTransition, which raises
   * InvalidStateTransitionError; this check exists so the service layer can
   * reject an obviously-wrong request before touching the database), and
   * the quality-threshold floor this build defines.
   */
  assertReadyForPublish(input: PublishInput): void {
    if (input.packageStatus !== 'ready') {
      throw new PublicationNotReadyError(
        'package',
        `publication package must be in status "ready" to publish, found "${input.packageStatus}"`
      );
    }
    if (!SUPPORTED_TARGET_LAYERS.includes(input.targetLayer)) {
      throw new PublicationNotReadyError(
        'targetLayer',
        `unsupported target layer "${input.targetLayer}"; only ${SUPPORTED_TARGET_LAYERS.join(', ')} is supported in this build`
      );
    }
    if (input.qualityScore === null || input.qualityScore < MINIMUM_QUALITY_SCORE_FOR_PUBLICATION) {
      throw new QualityThresholdError(input.qualityScore ?? 0, MINIMUM_QUALITY_SCORE_FOR_PUBLICATION);
    }
  }
}
