// Explicit Simulation integration error types (BUILD-07).
// Deterministic, typed — never silent, never fabricated success.

export type SimulationIntegrationErrorCode =
  | 'SIM_ENGINE_UNAVAILABLE'
  | 'SIM_ENGINE_OPERATION_UNAVAILABLE'
  | 'SIM_REQUEST_INVALID'
  | 'SIM_EXECUTION_FAILED'
  | 'SIM_RUN_NOT_FOUND'
  | 'SIM_RUN_NOT_COMPLETED'
  | 'SIM_RUN_TENANT_MISMATCH'
  | 'SIM_RESULT_INVALID';

export class SimulationIntegrationError extends Error {
  readonly code: SimulationIntegrationErrorCode;
  readonly details: readonly string[];

  constructor(code: SimulationIntegrationErrorCode, message: string, details: readonly string[] = []) {
    super(`${code}: ${message}`);
    this.name = 'SimulationIntegrationError';
    this.code = code;
    this.details = details;
  }
}

export class SimulationEngineUnavailableError extends SimulationIntegrationError {
  constructor(namespace: string) {
    super('SIM_ENGINE_UNAVAILABLE', `Simulation engine namespace ${namespace} is not available.`);
    this.name = 'SimulationEngineUnavailableError';
  }
}

export class SimulationOperationUnavailableError extends SimulationIntegrationError {
  constructor(operation: string) {
    super('SIM_ENGINE_OPERATION_UNAVAILABLE', `Simulation engine operation ${operation} is not available.`);
    this.name = 'SimulationOperationUnavailableError';
  }
}

export class SimulationRequestInvalidError extends SimulationIntegrationError {
  constructor(reasons: readonly string[]) {
    super('SIM_REQUEST_INVALID', 'Simulation execution request is invalid.', reasons);
    this.name = 'SimulationRequestInvalidError';
  }
}

export class SimulationRunNotFoundError extends SimulationIntegrationError {
  constructor(runId: string) {
    super('SIM_RUN_NOT_FOUND', `Completed simulation run ${runId} was not found.`);
    this.name = 'SimulationRunNotFoundError';
  }
}

export class SimulationRunNotCompletedError extends SimulationIntegrationError {
  constructor(runId: string, status: string) {
    super('SIM_RUN_NOT_COMPLETED', `Simulation run ${runId} is not completed (status: ${status}).`);
    this.name = 'SimulationRunNotCompletedError';
  }
}

export class SimulationTenantBoundaryError extends SimulationIntegrationError {
  constructor() {
    super('SIM_RUN_TENANT_MISMATCH', 'Simulation run does not belong to the requesting tenant/business boundary.');
    this.name = 'SimulationTenantBoundaryError';
  }
}

export class SimulationResultInvalidError extends SimulationIntegrationError {
  constructor(reasons: readonly string[]) {
    super('SIM_RESULT_INVALID', 'Simulation engine returned an invalid result.', reasons);
    this.name = 'SimulationResultInvalidError';
  }
}
