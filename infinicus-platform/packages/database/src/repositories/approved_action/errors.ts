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

export class ABAIntakeValidationError extends ValidationError {}
export class ABAIntakeScopeMismatchError extends ConflictError {}
export class ActionReviewNotFoundError extends NotFoundError {}
export class ActionReviewStateConflictError extends ConflictError {}
export class ApprovalPolicyNotFoundError extends NotFoundError {}
export class ApprovalPolicyStateConflictError extends ConflictError {}
export class ApproverAuthorityNotFoundError extends NotFoundError {}
export class ApproverAuthorityStateConflictError extends ConflictError {}
export class ApprovalDecisionNotFoundError extends NotFoundError {}
export class ApprovalDecisionStateConflictError extends ConflictError {}
export class ApprovalDecisionImmutableError extends ConflictError {}
export class ApprovedActionNotFoundError extends NotFoundError {}
export class ApprovedActionStateConflictError extends ConflictError {}
export class ActionExecutionPlanNotFoundError extends NotFoundError {}
export class ActionExecutionPlanStateConflictError extends ConflictError {}
export class ActionControlGateNotFoundError extends NotFoundError {}
export class ApprovalExceptionNotFoundError extends NotFoundError {}
export class ApprovalAppealNotFoundError extends NotFoundError {}
export class ABAPublicationStateConflictError extends ConflictError {}
export class ABAComponentRegistryNotFoundError extends NotFoundError {}
export class ABADuplicateArtifactError extends ConflictError {}
export class ABAUnsupportedVersionError extends ValidationError {}
export class ABAPayloadTooLargeError extends ValidationError {}
export class ABACredentialContentError extends ValidationError {}
export class ABAEvidenceMissingError extends ValidationError {}
export class ABALineageInvalidError extends ValidationError {}
