import type { AuthenticationService, ValidatedSession } from '@infinicus/authentication';
import type { TenantContext } from '@infinicus/database';
import type { AuthorizationService } from './AuthorizationService.js';

/**
 * Framework-agnostic guards: no HTTP framework has been chosen yet for
 * apps/api (see root CLAUDE.md §4 — "the API application may use Fastify,
 * NestJS, or another framework only after the base architecture is
 * approved"). These functions operate on plain inputs/outputs so any future
 * adapter (Fastify preHandler, NestJS guard, Express middleware) can wrap
 * them with a few lines of glue rather than requiring this package to
 * depend on a framework.
 */

export interface AuthGuardSuccess {
  authorized: true;
  session: ValidatedSession;
}

export interface AuthGuardFailure {
  authorized: false;
  reason: string;
}

export type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure;

/** Validates a raw session token (e.g. extracted from a cookie or Authorization header by the caller). */
export function createAuthGuard(authService: AuthenticationService) {
  return async (rawSessionToken: string | undefined): Promise<AuthGuardResult> => {
    if (!rawSessionToken) return { authorized: false, reason: 'missing_session_token' };
    try {
      const session = await authService.validateSession(rawSessionToken);
      return { authorized: true, session };
    } catch (err) {
      return { authorized: false, reason: err instanceof Error ? err.name : 'session_invalid' };
    }
  };
}

export interface PermissionGuardResult {
  authorized: boolean;
  reason?: string;
}

/** Checks a permission for an already-established TenantContext (post-authentication, post-tenant-selection). */
export function createPermissionGuard(authzService: AuthorizationService, permissionCode: string) {
  return async (ctx: TenantContext): Promise<PermissionGuardResult> => {
    try {
      await authzService.authorize(ctx, permissionCode);
      return { authorized: true };
    } catch (err) {
      return { authorized: false, reason: err instanceof Error ? err.name : 'permission_denied' };
    }
  };
}
