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

export class DTIntakeValidationError extends ValidationError {}
export class DTIntakeScopeMismatchError extends ConflictError {}
export class DigitalTwinDefinitionNotFoundError extends NotFoundError {}
export class DigitalTwinDefinitionStateConflictError extends ConflictError {}
export class DigitalTwinInstanceNotFoundError extends NotFoundError {}
export class DigitalTwinInstanceStateConflictError extends ConflictError {}
export class DigitalTwinSnapshotNotFoundError extends NotFoundError {}
export class DigitalTwinSnapshotStateConflictError extends ConflictError {}
export class DigitalTwinSnapshotImmutableError extends ConflictError {}
export class StateVariableValidationError extends ValidationError {}
export class TwinEntityValidationError extends ValidationError {}
export class TwinRelationshipValidationError extends ValidationError {}
export class TwinConstraintValidationError extends ValidationError {}
export class TwinCalibrationStateConflictError extends ConflictError {}
export class TwinValidationStateConflictError extends ConflictError {}
export class ScenarioBaselineValidationError extends ValidationError {}
export class ScenarioBaselineStateConflictError extends ConflictError {}
export class DTPublicationStateConflictError extends ConflictError {}
export class DTDuplicateArtifactError extends ConflictError {}
export class DTPayloadTooLargeError extends ValidationError {}
export class DTCredentialContentError extends ValidationError {}
