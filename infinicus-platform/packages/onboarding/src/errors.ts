/**
 * OnboardingService intentionally does not define its own error hierarchy —
 * it propagates the specific errors already thrown by the repositories it
 * composes (TenantSlugConflictError, WorkspaceSlugConflictError,
 * BusinessCodeConflictError, OnboardingStepOrderError,
 * OnboardingAlreadyTerminalError, OnboardingNotFoundError, and the
 * membership/role errors from @infinicus/database and @infinicus/authorization).
 * Re-exported here purely for callers who only import from @infinicus/onboarding.
 */
export {
  TenantNotFoundError, TenantSlugConflictError,
  WorkspaceNotFoundError, WorkspaceSlugConflictError,
  BusinessNotFoundError, BusinessCodeConflictError,
  OnboardingNotFoundError, OnboardingStepOrderError, OnboardingAlreadyTerminalError,
} from '@infinicus/database';
