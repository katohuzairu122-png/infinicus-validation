import bcrypt from 'bcryptjs';
import { WeakPasswordError } from './errors.js';

const BCRYPT_COST_FACTOR = 12;
const MIN_LENGTH = 12;

/**
 * Minimum bar: length plus at least three of the four character classes.
 * Deliberately not a full entropy estimator — this is a floor, not a policy engine.
 */
export function validatePasswordStrength(password: string): void {
  const reasons: string[] = [];
  if (password.length < MIN_LENGTH) reasons.push(`must be at least ${MIN_LENGTH} characters`);

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(password)).length;
  if (classes < 3) reasons.push('must contain at least 3 of: lowercase, uppercase, digit, symbol');

  if (reasons.length > 0) throw new WeakPasswordError(reasons);
}

/** Never logs or returns the plaintext password — only the resulting bcrypt hash. */
export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
