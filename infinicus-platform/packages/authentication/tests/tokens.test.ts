import { describe, it, expect } from 'vitest';
import { hashToken, generateSessionToken, defaultSessionExpiry, generateApiKey, parseApiKey } from '../src/tokens.js';

describe('hashToken', () => {
  it('is deterministic for the same input', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
  });

  it('produces different hashes for different inputs', () => {
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
  });

  it('produces a 64-character lowercase hex digest (SHA-256)', () => {
    const hash = hashToken('abc');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generateSessionToken', () => {
  it('generates a 64-character hex string (32 random bytes)', () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('generates distinct tokens on successive calls', () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });
});

describe('defaultSessionExpiry', () => {
  it('returns a timestamp 24 hours after the given now', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const expiry = defaultSessionExpiry(now);
    expect(expiry.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it('defaults to the current time when no argument is given', () => {
    const before = Date.now();
    const expiry = defaultSessionExpiry();
    const after = Date.now();
    expect(expiry.getTime()).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
    expect(expiry.getTime()).toBeLessThanOrEqual(after + 24 * 60 * 60 * 1000);
  });
});

describe('generateApiKey / parseApiKey', () => {
  it('generates a raw key in the form keyPrefix.secret', () => {
    const { keyPrefix, rawKey } = generateApiKey();
    expect(rawKey.startsWith(`${keyPrefix}.`)).toBe(true);
  });

  it('the returned keyHash matches hashToken(rawKey)', () => {
    const { rawKey, keyHash } = generateApiKey();
    expect(keyHash).toBe(hashToken(rawKey));
  });

  it('generates distinct keys on successive calls', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.rawKey).not.toBe(b.rawKey);
    expect(a.keyPrefix).not.toBe(b.keyPrefix);
  });

  it('parseApiKey round-trips a generated key back to its prefix and hash', () => {
    const generated = generateApiKey();
    const parsed = parseApiKey(generated.rawKey);
    expect(parsed).not.toBeNull();
    expect(parsed!.keyPrefix).toBe(generated.keyPrefix);
    expect(parsed!.keyHash).toBe(generated.keyHash);
  });

  it('parseApiKey returns null for a key with no separator', () => {
    expect(parseApiKey('nodotshere')).toBeNull();
  });

  it('parseApiKey returns null for a key with an empty prefix', () => {
    expect(parseApiKey('.secretonly')).toBeNull();
  });
});
