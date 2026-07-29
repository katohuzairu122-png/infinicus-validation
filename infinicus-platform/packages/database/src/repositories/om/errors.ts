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

export class OMIntakeValidationError extends ValidationError {}
export class OMIntakeScopeMismatchError extends ConflictError {}
export class MonitoringPlanNotFoundError extends NotFoundError {}
export class MonitoringPlanStateConflictError extends ConflictError {}
export class MonitoredActionNotFoundError extends NotFoundError {}
export class MonitoredActionStateConflictError extends ConflictError {}
export class OutcomeObservationNotFoundError extends NotFoundError {}
export class OutcomeObservationStateConflictError extends ConflictError {}
export class OutcomeObservationImmutableError extends ConflictError {}
export class OutcomeTargetNotFoundError extends NotFoundError {}
export class OutcomeTargetStateConflictError extends ConflictError {}
export class OutcomeVarianceNotFoundError extends NotFoundError {}
export class OutcomeVarianceStateConflictError extends ConflictError {}
export class MonitoringAlertNotFoundError extends NotFoundError {}
export class MonitoringIncidentNotFoundError extends NotFoundError {}
export class OutcomeAttributionNotFoundError extends NotFoundError {}
export class OutcomeReviewNotFoundError extends NotFoundError {}
export class OutcomeReviewStateConflictError extends ConflictError {}
export class LearningFeedbackPackageNotFoundError extends NotFoundError {}
export class LearningFeedbackPackageStateConflictError extends ConflictError {}
export class OMPublicationStateConflictError extends ConflictError {}
export class OMComponentRegistryNotFoundError extends NotFoundError {}
export class OMDuplicateArtifactError extends ConflictError {}
export class OMUnsupportedVersionError extends ValidationError {}
export class OMPayloadTooLargeError extends ValidationError {}
export class OMCredentialContentError extends ValidationError {}
export class OMEvidenceMissingError extends ValidationError {}
export class OMLineageInvalidError extends ValidationError {}
