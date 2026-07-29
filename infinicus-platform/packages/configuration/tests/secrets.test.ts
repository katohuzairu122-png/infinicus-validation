import { describe, it, expect } from 'vitest';
import {
  SECRET_INVENTORY,
  EnvSecretProvider,
  validateSecretInventory,
  looksLikeLocalOrTestCredential,
  redactSecretValues,
  ConfigurationError,
} from '../src/index.js';

describe('SECRET_INVENTORY', () => {
  it('every entry has a non-empty name, owner, and description', () => {
    for (const secret of SECRET_INVENTORY) {
      expect(secret.name.length).toBeGreaterThan(0);
      expect(secret.owner.length).toBeGreaterThan(0);
      expect(secret.description.length).toBeGreaterThan(0);
    }
  });

  it('classifies DATABASE_URL and ADMIN_DATABASE_URL as secrets', () => {
    const dbUrl = SECRET_INVENTORY.find((s) => s.name === 'DATABASE_URL');
    const adminDbUrl = SECRET_INVENTORY.find((s) => s.name === 'ADMIN_DATABASE_URL');
    expect(dbUrl?.classification).toBe('secret');
    expect(adminDbUrl?.classification).toBe('secret');
  });

  it('only DATABASE_URL is required for the application process to start', () => {
    const required = SECRET_INVENTORY.filter((s) => s.required).map((s) => s.name);
    expect(required).toEqual(['DATABASE_URL']);
  });

  it('non-secret entries have no rotation policy', () => {
    for (const secret of SECRET_INVENTORY.filter((s) => s.classification === 'non-secret')) {
      expect(secret.rotationPolicyDays).toBeNull();
    }
  });
});

describe('EnvSecretProvider', () => {
  it('reads values from the given environment record', () => {
    const provider = new EnvSecretProvider({ DATABASE_URL: 'postgresql://x' });
    expect(provider.get('DATABASE_URL')).toBe('postgresql://x');
    expect(provider.get('MISSING')).toBeUndefined();
  });
});

describe('validateSecretInventory', () => {
  it('does not throw when every required secret is present', () => {
    const provider = new EnvSecretProvider({ DATABASE_URL: 'postgresql://x' });
    expect(() => validateSecretInventory(provider)).not.toThrow();
  });

  it('throws ConfigurationError naming every missing required secret', () => {
    const provider = new EnvSecretProvider({});
    expect(() => validateSecretInventory(provider)).toThrow(ConfigurationError);
    try {
      validateSecretInventory(provider);
      throw new Error('expected validateSecretInventory to throw');
    } catch (err) {
      expect((err as Error).message).toContain('DATABASE_URL');
    }
  });
});

describe('looksLikeLocalOrTestCredential', () => {
  it.each([
    'postgresql://infinicus_test_admin:local_admin_pw@localhost:5432/infinicus_test',
    'postgresql://app_test_user:local_app_pw@localhost:5432/infinicus_test',
    'postgresql://infinicus_ci_admin:ci_admin_pw@localhost:5432/infinicus_ci',
    'postgresql://user:pass@127.0.0.1:5432/db',
  ])('flags %s as a local/test credential', (value) => {
    expect(looksLikeLocalOrTestCredential(value)).toBe(true);
  });

  it('does not flag a value containing no known local/test pattern', () => {
    expect(looksLikeLocalOrTestCredential('postgresql://prod_app_role:x9k2m@prod-db.internal:5432/infinicus_production')).toBe(false);
  });
});

describe('redactSecretValues', () => {
  it('replaces a configured secret value wherever it appears in free-form text', () => {
    const provider = new EnvSecretProvider({ DATABASE_URL: 'postgresql://u:s3cr3t@host:5432/db' });
    const text = 'connect failed: postgresql://u:s3cr3t@host:5432/db timed out';
    expect(redactSecretValues(text, provider)).toBe('connect failed: [REDACTED] timed out');
  });

  it('redacts every occurrence, not just the first', () => {
    const provider = new EnvSecretProvider({ DATABASE_URL: 'secretvalue' });
    const text = 'secretvalue appears twice: secretvalue';
    expect(redactSecretValues(text, provider)).toBe('[REDACTED] appears twice: [REDACTED]');
  });

  it('leaves text unchanged when no configured secret is present', () => {
    const provider = new EnvSecretProvider({});
    expect(redactSecretValues('nothing secret here', provider)).toBe('nothing secret here');
  });

  it('does not touch non-secret-classified values', () => {
    const provider = new EnvSecretProvider({ DATABASE_URL: 'postgresql://x', PORT: '3000' });
    expect(redactSecretValues('listening on 3000', provider)).toBe('listening on 3000');
  });
});
