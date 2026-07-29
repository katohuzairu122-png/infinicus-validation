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

export class SimulationIntakeValidationError extends ValidationError {}
export class SimulationIntakeScopeMismatchError extends ConflictError {}
export class SimulationModelNotFoundError extends NotFoundError {}
export class SimulationModelStateConflictError extends ConflictError {}
export class SimulationScenarioNotFoundError extends NotFoundError {}
export class SimulationScenarioStateConflictError extends ConflictError {}
export class SimulationRunNotFoundError extends NotFoundError {}
export class SimulationRunStateConflictError extends ConflictError {}
export class SimulationResultNotFoundError extends NotFoundError {}
export class SimulationResultStateConflictError extends ConflictError {}
export class SimulationResultImmutableError extends ConflictError {}
export class SimulationRiskValidationError extends ValidationError {}
export class SimulationSensitivityStateConflictError extends ConflictError {}
export class ScenarioComparisonStateConflictError extends ConflictError {}
export class SimulationValidationStateConflictError extends ConflictError {}
export class SimulationCalibrationStateConflictError extends ConflictError {}
export class SimulationPublicationStateConflictError extends ConflictError {}
export class SimulationDuplicateArtifactError extends ConflictError {}
export class SimulationUnsupportedVersionError extends ValidationError {}
export class SimulationPayloadTooLargeError extends ValidationError {}
export class SimulationCredentialContentError extends ValidationError {}
export class SimulationEvidenceMissingError extends ValidationError {}
export class SimulationLineageInvalidError extends ValidationError {}
