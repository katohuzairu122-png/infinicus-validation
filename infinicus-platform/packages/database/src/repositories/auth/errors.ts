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

export class UserNotFoundError extends NotFoundError {}
export class UserAlreadyExistsError extends ConflictError {}
export class SessionNotFoundError extends NotFoundError {}
export class ServiceAccountNotFoundError extends NotFoundError {}
export class ApiKeyNotFoundError extends NotFoundError {}
export class RoleNotFoundError extends NotFoundError {}
export class PermissionNotFoundError extends NotFoundError {}
export class MembershipNotFoundError extends NotFoundError {}
export class MembershipAlreadyExistsError extends ConflictError {}
export class InvitationNotFoundError extends NotFoundError {}
export class InvitationStateConflictError extends ConflictError {}
