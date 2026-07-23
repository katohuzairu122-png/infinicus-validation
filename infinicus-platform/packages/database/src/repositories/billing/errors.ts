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

export class PlanNotFoundError extends NotFoundError {}
export class SubscriptionNotFoundError extends NotFoundError {}
export class SubscriptionAlreadyExistsError extends ConflictError {}

export class InvalidSubscriptionTransitionError extends Error {
  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition subscription from "${fromStatus}" to "${toStatus}"`);
    this.name = 'InvalidSubscriptionTransitionError';
  }
}

export class UsageLimitExceededError extends Error {
  constructor(
    public readonly metric: string,
    public readonly limitValue: number,
    public readonly attemptedQuantity: number
  ) {
    super(`Usage limit exceeded for "${metric}": limit ${limitValue}, attempted ${attemptedQuantity}`);
    this.name = 'UsageLimitExceededError';
  }
}
