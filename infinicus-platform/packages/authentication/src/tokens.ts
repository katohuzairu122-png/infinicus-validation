import { randomBytes, createHash } from 'node:crypto';

const SESSION_TOKEN_BYTES = 32;
const API_KEY_PREFIX_BYTES = 6;
const API_KEY_SECRET_BYTES = 32;
const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** SHA-256 is deliberately used instead of bcrypt here: session/API-key tokens
 * already carry 256 bits of random entropy, so a fast, deterministic hash is
 * both sufficient and necessary for the high-frequency per-request lookup
 * this backs (bcrypt's intentional slowness is for low-entropy passwords). */
export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

/** Raw token is returned to the caller exactly once and never persisted — only its hash is stored. */
export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString('hex');
}

export function defaultSessionExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + DEFAULT_SESSION_TTL_MS);
}

export interface GeneratedApiKey {
  keyPrefix: string;
  rawKey: string;
  keyHash: string;
}

/**
 * The raw key is `${keyPrefix}.${secret}` — the prefix is non-secret and
 * stored in the clear for fast lookup; the full raw key is hashed and only
 * the hash is persisted (identity.api_key_references.key_hash).
 */
export function generateApiKey(): GeneratedApiKey {
  const keyPrefix = randomBytes(API_KEY_PREFIX_BYTES).toString('hex');
  const secret = randomBytes(API_KEY_SECRET_BYTES).toString('hex');
  const rawKey = `${keyPrefix}.${secret}`;
  return { keyPrefix, rawKey, keyHash: hashToken(rawKey) };
}

export function parseApiKey(rawKey: string): { keyPrefix: string; keyHash: string } | null {
  const dot = rawKey.indexOf('.');
  if (dot <= 0) return null;
  return { keyPrefix: rawKey.slice(0, dot), keyHash: hashToken(rawKey) };
}
