export class NotFoundError extends Error {
  constructor(entity: string, id: string) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(entity: string, reason: string) {
    super(`${entity} conflict: ${reason}`);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends Error {
  constructor(entity: string, reasons: readonly string[]) {
    super(`${entity} invalid: ${reasons.join(', ')}`);
    this.name = 'ValidationError';
  }
}

export class InvalidTransitionError extends Error {
  constructor(entity: string, from: string, to: string) {
    super(`${entity} invalid transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export class CLIntakeValidationError extends ValidationError {}
export class CLIntakeScopeMismatchError extends ConflictError {}
export class LearningCaseNotFoundError extends NotFoundError {}
export class LearningCaseStateConflictError extends ConflictError {}
export class LearningFeedbackNotFoundError extends NotFoundError {}
export class LearningFeedbackStateConflictError extends ConflictError {}
export class LearnedLessonNotFoundError extends NotFoundError {}
export class LearnedLessonStateConflictError extends ConflictError {}
export class LearningPatternNotFoundError extends NotFoundError {}
export class LearningPatternStateConflictError extends ConflictError {}
export class ModelEvaluationNotFoundError extends NotFoundError {}
export class PolicyEvaluationNotFoundError extends NotFoundError {}
export class PolicyChangeProposalNotFoundError extends NotFoundError {}
export class ImprovementProposalNotFoundError extends NotFoundError {}
export class ImprovementProposalStateConflictError extends ConflictError {}
export class ImprovementProposalImmutableError extends ConflictError {}
export class LearningChangeReviewNotFoundError extends NotFoundError {}
export class LearningChangeReviewStateConflictError extends ConflictError {}
export class KnowledgeArtifactNotFoundError extends NotFoundError {}
export class KnowledgeArtifactStateConflictError extends ConflictError {}
export class CLFeedbackPublicationStateConflictError extends ConflictError {}
export class CLComponentRegistryNotFoundError extends NotFoundError {}
export class CLDuplicateArtifactError extends ConflictError {}
export class CLUnsupportedVersionError extends ValidationError {}
export class CLPayloadTooLargeError extends ValidationError {}
export class CLCredentialContentError extends ValidationError {}
export class CLEvidenceMissingError extends ValidationError {}
export class CLLineageInvalidError extends ValidationError {}
