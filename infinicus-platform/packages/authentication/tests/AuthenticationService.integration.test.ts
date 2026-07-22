/**
 * Live PostgreSQL 16 integration tests for AuthenticationService, exercising
 * the full register/login/logout/validateSession/revoke/changePassword
 * lifecycle against the real identity.users / identity.sessions /
 * audit.access_events tables (BUILD-18).
 *
 * Requires:
 *   DATABASE_URL — app_test_user (RLS enforced)
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPool, closePool, UserRepository, SessionRepository, AccessEventRepository } from '@infinicus/database';
import { AuthenticationService } from '../src/AuthenticationService.js';
import { generateSessionToken, hashToken } from '../src/tokens.js';
import {
  InvalidCredentialsError, AccountNotActiveError,
  SessionExpiredError, SessionRevokedError, SessionInvalidError,
} from '../src/errors.js';

const run = !!process.env.DATABASE_URL;

function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@authsvc-test.example`;
}

const STRONG_PASSWORD = 'Correct-Horse-9!';

async function registerAndActivate(service: AuthenticationService, users: UserRepository, email = uniqueEmail('svc')) {
  const user = await service.register(email, STRONG_PASSWORD);
  const active = await users.activate(user.id);
  return { email, user: active };
}

describe.runIf(run)('AuthenticationService — live PostgreSQL', () => {
  const users = new UserRepository();
  const sessions = new SessionRepository();
  const accessEvents = new AccessEventRepository();
  const service = new AuthenticationService(users, sessions, accessEvents);

  beforeAll(() => {
    createPool({ connectionString: process.env.DATABASE_URL! });
  });

  afterAll(async () => {
    await closePool();
  });

  describe('register', () => {
    it('creates a new user in pending status (never implicitly active)', async () => {
      const user = await service.register(uniqueEmail('reg'), STRONG_PASSWORD);
      expect(user.status).toBe('pending');
    });

    it('stores a bcrypt hash, never the plaintext password', async () => {
      const email = uniqueEmail('reg-hash');
      const user = await service.register(email, STRONG_PASSWORD);
      const hash = await users.getPasswordHash(user.id);
      expect(hash).not.toBe(STRONG_PASSWORD);
      expect(hash?.startsWith('$2')).toBe(true);
    });

    it('rejects registration with a weak password before creating any user row', async () => {
      const email = uniqueEmail('reg-weak');
      await expect(service.register(email, 'weak')).rejects.toThrow();
      await expect(users.getByEmail(email)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('succeeds for an active user with the correct password and records a login access event', async () => {
      const { email, user } = await registerAndActivate(service, users);
      const result = await service.login(email, STRONG_PASSWORD, { ipAddress: '10.0.0.1', userAgent: 'vitest' });
      expect(result.user.id).toBe(user.id);
      expect(result.session.userId).toBe(user.id);
      expect(result.rawSessionToken).toHaveLength(64);

      const events = await accessEvents.listForUser(user.id);
      expect(events.some((e) => e.eventType === 'login')).toBe(true);
    });

    it('updates last_login_at on successful login', async () => {
      const { email, user } = await registerAndActivate(service, users);
      expect(user.lastLoginAt).toBeNull();
      await service.login(email, STRONG_PASSWORD);
      const reloaded = await users.getById(user.id);
      expect(reloaded.lastLoginAt).not.toBeNull();
    });

    it('rejects an unknown email and records a failed_auth access event', async () => {
      const unknownEmail = uniqueEmail('never-registered');
      await expect(service.login(unknownEmail, STRONG_PASSWORD)).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('rejects the correct email with a wrong password and records a failed_auth access event', async () => {
      const { email, user } = await registerAndActivate(service, users);
      await expect(service.login(email, 'Totally-Wrong-9!')).rejects.toBeInstanceOf(InvalidCredentialsError);
      const events = await accessEvents.listForUser(user.id);
      expect(events.some((e) => e.eventType === 'failed_auth')).toBe(true);
    });

    it('rejects login for a pending (not-yet-activated) account', async () => {
      const email = uniqueEmail('pending');
      await service.register(email, STRONG_PASSWORD);
      await expect(service.login(email, STRONG_PASSWORD)).rejects.toBeInstanceOf(AccountNotActiveError);
    });

    it('rejects login for a suspended account', async () => {
      const { email, user } = await registerAndActivate(service, users);
      await users.suspend(user.id);
      await expect(service.login(email, STRONG_PASSWORD)).rejects.toBeInstanceOf(AccountNotActiveError);
    });
  });

  describe('logout', () => {
    it('revokes the session for a valid raw session token', async () => {
      const { email } = await registerAndActivate(service, users);
      const { session, rawSessionToken } = await service.login(email, STRONG_PASSWORD);
      await service.logout(rawSessionToken);
      const reloaded = await sessions.getById(session.id);
      expect(reloaded.revokedAt).not.toBeNull();
    });

    it('is idempotent for an already-revoked session', async () => {
      const { email } = await registerAndActivate(service, users);
      const { rawSessionToken } = await service.login(email, STRONG_PASSWORD);
      await service.logout(rawSessionToken);
      await expect(service.logout(rawSessionToken)).resolves.toBeUndefined();
    });

    it('is a silent no-op for an unknown session token', async () => {
      await expect(service.logout(generateSessionToken())).resolves.toBeUndefined();
    });
  });

  describe('validateSession', () => {
    it('returns the user and session for a valid, active session', async () => {
      const { email, user } = await registerAndActivate(service, users);
      const { rawSessionToken } = await service.login(email, STRONG_PASSWORD);
      const validated = await service.validateSession(rawSessionToken);
      expect(validated.user.id).toBe(user.id);
    });

    it('throws SessionInvalidError for an unknown raw token', async () => {
      await expect(service.validateSession(generateSessionToken())).rejects.toBeInstanceOf(SessionInvalidError);
    });

    it('throws SessionRevokedError for a revoked session', async () => {
      const { email } = await registerAndActivate(service, users);
      const { rawSessionToken } = await service.login(email, STRONG_PASSWORD);
      await service.logout(rawSessionToken);
      await expect(service.validateSession(rawSessionToken)).rejects.toBeInstanceOf(SessionRevokedError);
    });

    it('throws SessionExpiredError for an expired session', async () => {
      const { user } = await registerAndActivate(service, users);
      const rawToken = generateSessionToken();
      await sessions.createSession(user.id, hashToken(rawToken), new Date(Date.now() - 1000));
      await expect(service.validateSession(rawToken)).rejects.toBeInstanceOf(SessionExpiredError);
    });

    it('throws AccountNotActiveError when the owning account was suspended after the session was issued', async () => {
      const { email, user } = await registerAndActivate(service, users);
      const { rawSessionToken } = await service.login(email, STRONG_PASSWORD);
      await users.suspend(user.id);
      await expect(service.validateSession(rawSessionToken)).rejects.toBeInstanceOf(AccountNotActiveError);
    });
  });

  describe('revokeSession / revokeAllUserSessions', () => {
    it('revokeSession revokes a single session by id and records a session_revocation access event', async () => {
      const { email, user } = await registerAndActivate(service, users);
      const { session } = await service.login(email, STRONG_PASSWORD);
      await service.revokeSession(session.id);
      const reloaded = await sessions.getById(session.id);
      expect(reloaded.revokedAt).not.toBeNull();
      const events = await accessEvents.listForUser(user.id);
      expect(events.some((e) => e.eventType === 'session_revocation')).toBe(true);
    });

    it('revokeAllUserSessions revokes every active session for the user and returns the count', async () => {
      const { email, user } = await registerAndActivate(service, users);
      await service.login(email, STRONG_PASSWORD);
      await service.login(email, STRONG_PASSWORD);
      const count = await service.revokeAllUserSessions(user.id);
      expect(count).toBeGreaterThanOrEqual(2);
      const active = await sessions.listActiveForUser(user.id);
      expect(active).toHaveLength(0);
    });
  });

  describe('changePassword', () => {
    it('updates the password hash and allows login with the new password', async () => {
      const { email, user } = await registerAndActivate(service, users);
      const newPassword = 'New-Correct-Horse-9!';
      await service.changePassword(user.id, STRONG_PASSWORD, newPassword);
      await expect(service.login(email, newPassword)).resolves.toBeDefined();
    });

    it('rejects the change when the old password is wrong, leaving the original password intact', async () => {
      const { email, user } = await registerAndActivate(service, users);
      await expect(service.changePassword(user.id, 'Wrong-Old-Password-9!', 'New-Correct-Horse-9!')).rejects.toBeInstanceOf(InvalidCredentialsError);
      await expect(service.login(email, STRONG_PASSWORD)).resolves.toBeDefined();
    });

    it('revokes all existing sessions as a defense-in-depth side effect', async () => {
      const { email, user } = await registerAndActivate(service, users);
      const { rawSessionToken } = await service.login(email, STRONG_PASSWORD);
      await service.changePassword(user.id, STRONG_PASSWORD, 'New-Correct-Horse-9!');
      await expect(service.validateSession(rawSessionToken)).rejects.toBeInstanceOf(SessionRevokedError);
    });
  });
});

describe.skipIf(run)('AuthenticationService — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
