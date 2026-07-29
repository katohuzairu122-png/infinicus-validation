import {
  UserRepository, SessionRepository, AccessEventRepository,
  UserNotFoundError, SessionNotFoundError,
  type User, type Session,
} from '@infinicus/database';
import { hashPassword, verifyPassword } from './password.js';
import { generateSessionToken, hashToken, defaultSessionExpiry } from './tokens.js';
import {
  InvalidCredentialsError, AccountNotActiveError,
  SessionExpiredError, SessionRevokedError, SessionInvalidError,
} from './errors.js';

export interface LoginResult {
  user: User;
  session: Session;
  rawSessionToken: string;
}

export interface ValidatedSession {
  user: User;
  session: Session;
}

export interface RequestMetadata {
  ipAddress?: string;
  userAgent?: string;
}

export class AuthenticationService {
  constructor(
    private readonly users: UserRepository = new UserRepository(),
    private readonly sessions: SessionRepository = new SessionRepository(),
    private readonly accessEvents: AccessEventRepository = new AccessEventRepository()
  ) {}

  /** New accounts start in 'pending' status — activation is a deliberate separate step, never implicit at registration. */
  async register(email: string, password: string): Promise<User> {
    const passwordHash = await hashPassword(password);
    return this.users.createUser({ email, passwordHash });
  }

  async login(email: string, password: string, meta: RequestMetadata = {}): Promise<LoginResult> {
    let user: User;
    try {
      user = await this.users.getByEmail(email);
    } catch (err) {
      if (err instanceof UserNotFoundError) {
        await this.accessEvents.record(null, null, 'failed_auth', meta.ipAddress ?? null, meta.userAgent ?? null, { reason: 'unknown_email' });
        throw new InvalidCredentialsError();
      }
      throw err;
    }

    const passwordHash = await this.users.getPasswordHash(user.id);
    const validPassword = passwordHash !== null && (await verifyPassword(password, passwordHash));
    if (!validPassword) {
      await this.accessEvents.record(null, user.id, 'failed_auth', meta.ipAddress ?? null, meta.userAgent ?? null, { reason: 'bad_password' });
      throw new InvalidCredentialsError();
    }

    if (user.status !== 'active') {
      await this.accessEvents.record(null, user.id, 'failed_auth', meta.ipAddress ?? null, meta.userAgent ?? null, { reason: 'account_not_active', status: user.status });
      throw new AccountNotActiveError(user.status);
    }

    const rawSessionToken = generateSessionToken();
    const session = await this.sessions.createSession(user.id, hashToken(rawSessionToken), defaultSessionExpiry(), meta.ipAddress, meta.userAgent);
    await this.users.recordLogin(user.id);
    await this.accessEvents.record(null, user.id, 'login', meta.ipAddress ?? null, meta.userAgent ?? null, { sessionId: session.id });

    return { user, session, rawSessionToken };
  }

  async logout(rawSessionToken: string, meta: RequestMetadata = {}): Promise<void> {
    const session = await this.sessions.getByTokenHash(hashToken(rawSessionToken)).catch(() => null);
    if (!session) return; // idempotent: logging out an unknown/already-gone session is a no-op, not an error
    if (!session.revokedAt) {
      await this.sessions.revoke(session.id);
    }
    await this.accessEvents.record(null, session.userId, 'logout', meta.ipAddress ?? null, meta.userAgent ?? null, { sessionId: session.id });
  }

  /** Fail-closed: any expired/revoked/unknown session throws rather than silently returning null. */
  async validateSession(rawSessionToken: string): Promise<ValidatedSession> {
    let session: Session;
    try {
      session = await this.sessions.getByTokenHash(hashToken(rawSessionToken));
    } catch (err) {
      if (err instanceof SessionNotFoundError) throw new SessionInvalidError();
      throw err;
    }
    if (session.revokedAt) throw new SessionRevokedError();
    if (session.expiresAt.getTime() < Date.now()) throw new SessionExpiredError();

    const user = await this.users.getById(session.userId);
    if (user.status !== 'active') throw new AccountNotActiveError(user.status);

    return { user, session };
  }

  async revokeSession(sessionId: string, meta: RequestMetadata = {}): Promise<void> {
    const session = await this.sessions.revoke(sessionId);
    await this.accessEvents.record(null, session.userId, 'session_revocation', meta.ipAddress ?? null, meta.userAgent ?? null, { sessionId: session.id });
  }

  async revokeAllUserSessions(userId: string, meta: RequestMetadata = {}): Promise<number> {
    const count = await this.sessions.revokeAllForUser(userId);
    await this.accessEvents.record(null, userId, 'session_revocation', meta.ipAddress ?? null, meta.userAgent ?? null, { count, scope: 'all_sessions' });
    return count;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const passwordHash = await this.users.getPasswordHash(userId);
    const validPassword = passwordHash !== null && (await verifyPassword(oldPassword, passwordHash));
    if (!validPassword) throw new InvalidCredentialsError();

    const newHash = await hashPassword(newPassword);
    await this.users.updatePasswordHash(userId, newHash);
    // A password change is a security-sensitive event — revoke every existing session so the new
    // credential immediately supersedes anything issued under the old one (defense in depth).
    await this.sessions.revokeAllForUser(userId);
  }
}
