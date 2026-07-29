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

export class TenantNotFoundError extends NotFoundError {}
export class TenantSlugConflictError extends ConflictError {}
export class WorkspaceNotFoundError extends NotFoundError {}
export class WorkspaceSlugConflictError extends ConflictError {}
export class BusinessNotFoundError extends NotFoundError {}
export class BusinessCodeConflictError extends ConflictError {}
export class OnboardingNotFoundError extends NotFoundError {}

/** Thrown when a step is requested out of order (its prerequisite step has not completed yet). */
export class OnboardingStepOrderError extends Error {
  constructor(requestedStep: string, currentStep: string) {
    super(`Cannot record step "${requestedStep}" — onboarding is currently at step "${currentStep}"`);
    this.name = 'OnboardingStepOrderError';
  }
}

export class OnboardingAlreadyTerminalError extends Error {
  constructor(status: string) {
    super(`Onboarding is already ${status} and cannot be modified further`);
    this.name = 'OnboardingAlreadyTerminalError';
  }
}
