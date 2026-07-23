export class IdempotencyConflictError extends Error {
  constructor(idempotencyKey: string) {
    super(`Idempotency-Key "${idempotencyKey}" was already used with a different request body`);
    this.name = 'IdempotencyConflictError';
  }
}
