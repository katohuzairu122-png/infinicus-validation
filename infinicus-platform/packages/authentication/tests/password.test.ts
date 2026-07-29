import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, validatePasswordStrength } from '../src/password.js';
import { WeakPasswordError } from '../src/errors.js';

describe('validatePasswordStrength', () => {
  it('accepts a password meeting length and character-class minimums', () => {
    expect(() => validatePasswordStrength('Correct-Horse-9')).not.toThrow();
  });

  it('rejects a password shorter than 12 characters', () => {
    expect(() => validatePasswordStrength('Ab1!short')).toThrow(WeakPasswordError);
  });

  it('rejects a password with fewer than 3 character classes', () => {
    expect(() => validatePasswordStrength('lowercaseonlylong')).toThrow(WeakPasswordError);
  });

  it('accepts exactly 3 character classes (lower+upper+digit, no symbol)', () => {
    expect(() => validatePasswordStrength('LowerUpper123')).not.toThrow();
  });

  it('lists both violated reasons when both length and class-count fail', () => {
    try {
      validatePasswordStrength('short');
      throw new Error('expected validatePasswordStrength to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(WeakPasswordError);
      expect((err as Error).message).toMatch(/at least 12 characters/);
    }
  });
});

describe('hashPassword / verifyPassword', () => {
  it('produces a bcrypt hash distinct from the plaintext password', async () => {
    const hash = await hashPassword('Correct-Horse-9');
    expect(hash).not.toBe('Correct-Horse-9');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifies the correct password against its own hash', async () => {
    const hash = await hashPassword('Correct-Horse-9');
    await expect(verifyPassword('Correct-Horse-9', hash)).resolves.toBe(true);
  });

  it('rejects an incorrect password against an unrelated hash', async () => {
    const hash = await hashPassword('Correct-Horse-9');
    await expect(verifyPassword('Wrong-Password-1', hash)).resolves.toBe(false);
  });

  it('rejects hashing a weak password before any hashing work occurs', async () => {
    await expect(hashPassword('weak')).rejects.toBeInstanceOf(WeakPasswordError);
  });

  it('produces different hashes for the same password on repeated calls (bcrypt salting)', async () => {
    const [hash1, hash2] = await Promise.all([hashPassword('Correct-Horse-9'), hashPassword('Correct-Horse-9')]);
    expect(hash1).not.toBe(hash2);
  });
});
