// @infinicus/authorization — role/permission checks, membership and invitation lifecycle.
export {
  PermissionDeniedError, MembershipNotActiveError,
  InvitationTokenInvalidError, InvitationExpiredError,
} from './errors.js';

export { AuthorizationService } from './AuthorizationService.js';
export type { CreatedInvitation } from './AuthorizationService.js';

export {
  generateInvitationToken, parseInvitationToken, defaultInvitationExpiry,
} from './invitationTokens.js';
export type { GeneratedInvitationToken, ParsedInvitationToken } from './invitationTokens.js';

export {
  createAuthGuard, createPermissionGuard,
} from './guards.js';
export type { AuthGuardResult, AuthGuardSuccess, AuthGuardFailure, PermissionGuardResult } from './guards.js';
