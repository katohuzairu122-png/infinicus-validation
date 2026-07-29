// @infinicus/authentication — password credentials, session lifecycle, service-account API keys.
export {
  InvalidCredentialsError, AccountNotActiveError,
  SessionExpiredError, SessionRevokedError, SessionInvalidError,
  ApiKeyInvalidError, WeakPasswordError,
} from './errors.js';

export { validatePasswordStrength, hashPassword, verifyPassword } from './password.js';

export {
  hashToken, generateSessionToken, defaultSessionExpiry,
  generateApiKey, parseApiKey,
} from './tokens.js';
export type { GeneratedApiKey } from './tokens.js';

export { AuthenticationService } from './AuthenticationService.js';
export type { LoginResult, ValidatedSession, RequestMetadata } from './AuthenticationService.js';
