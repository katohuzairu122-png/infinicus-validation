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
