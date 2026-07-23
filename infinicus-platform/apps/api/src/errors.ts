/**
 * Maps every domain error's `.name` to an HTTP status code. A name-based
 * lookup (rather than importing and instanceof-checking every error class
 * from every package this API wraps) keeps this file from needing to
 * depend on the full transitive set of error classes across
 * @infinicus/database, @infinicus/authentication, @infinicus/authorization,
 * @infinicus/onboarding, and @infinicus/workflow — new error classes added
 * to those packages later just need an entry here, nothing else changes.
 *
 * IMPORTANT: every domain's errors.ts under packages/database defines its
 * specific error classes (MembershipNotFoundError, TenantSlugConflictError,
 * etc.) as EMPTY subclasses of a shared per-domain base (NotFoundError /
 * ConflictError / ValidationError / InvalidTransitionError). The base
 * class's constructor unconditionally sets `this.name` to its own generic
 * name, and an empty subclass doesn't override it — so at runtime every one
 * of those specific-looking error names never actually appears; only the
 * generic base name does. This table keys off what's actually thrown.
 * Errors that DO set their own unique `.name` (auth/authz package errors,
 * onboarding's OnboardingStepOrderError/OnboardingAlreadyTerminalError,
 * this build's own Idempotency* errors) are listed individually below.
 *
 * Anything NOT in this table is treated as an unexpected server error:
 * logged in full server-side, but returned to the client as a generic,
 * redacted 500 — never the original error message or stack (security
 * baseline: "controlled redacted errors").
 */
export const ERROR_STATUS_CODES: Record<string, number> = {
  // Generic per-domain base errors (@infinicus/database) — see note above:
  // every specific NotFoundError/ConflictError/ValidationError subclass
  // across da/bo/bi/dt/simulation/adi/aba/om/cl/auth/onboarding reports
  // one of these names at runtime, not its own subclass name.
  NotFoundError: 404,
  ConflictError: 409,
  ValidationError: 400,
  InvalidTransitionError: 409,

  // Authentication (@infinicus/authentication)
  InvalidCredentialsError: 401,
  AccountNotActiveError: 403,
  SessionExpiredError: 401,
  SessionRevokedError: 401,
  SessionInvalidError: 401,
  ApiKeyInvalidError: 401,
  WeakPasswordError: 400,

  // Authorization (@infinicus/authorization)
  PermissionDeniedError: 403,
  MembershipNotActiveError: 403,
  InvitationTokenInvalidError: 400,
  InvitationExpiredError: 400,

  // Onboarding domain errors that set their own unique name
  // (@infinicus/database/repositories/onboarding — not empty subclasses)
  OnboardingStepOrderError: 409,
  OnboardingAlreadyTerminalError: 409,

  // API layer (this build) — all set their own unique name
  IdempotencyConflictError: 409,
  IdempotencyInProgressError: 409,

  // Fastify / schema validation
  FST_ERR_VALIDATION: 400,
};

export interface ControlledError {
  code: string;
  message: string;
  correlationId: string;
}

export function statusCodeFor(errorName: string | undefined): number {
  if (!errorName) return 500;
  return ERROR_STATUS_CODES[errorName] ?? 500;
}
