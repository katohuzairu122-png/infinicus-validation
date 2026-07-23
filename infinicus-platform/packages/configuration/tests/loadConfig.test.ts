import { describe, it, expect } from 'vitest';
import { loadConfig, ConfigurationError } from '../src/index.js';

describe('loadConfig', () => {
  it('loads a valid config from a full environment', () => {
    const config = loadConfig({ DATABASE_URL: 'postgresql://x', NODE_ENV: 'production', PORT: '4000' });
    expect(config).toEqual({
      env: 'production',
      databaseUrl: 'postgresql://x',
      port: 4000,
      logLevel: 'info',
      rateLimitMax: 100,
      rateLimitWindowMs: 60_000,
    });
  });

  it('throws ConfigurationError when DATABASE_URL is missing', () => {
    expect(() => loadConfig({})).toThrow(ConfigurationError);
  });

  it('defaults env to development for an unrecognized NODE_ENV', () => {
    const config = loadConfig({ DATABASE_URL: 'postgresql://x', NODE_ENV: 'weird' });
    expect(config.env).toBe('development');
  });

  it('defaults env to development when NODE_ENV is unset', () => {
    const config = loadConfig({ DATABASE_URL: 'postgresql://x' });
    expect(config.env).toBe('development');
  });

  it('defaults logLevel to debug outside production', () => {
    const config = loadConfig({ DATABASE_URL: 'postgresql://x', NODE_ENV: 'development' });
    expect(config.logLevel).toBe('debug');
  });

  it('respects an explicit LOG_LEVEL override', () => {
    const config = loadConfig({ DATABASE_URL: 'postgresql://x', LOG_LEVEL: 'warn' });
    expect(config.logLevel).toBe('warn');
  });

  it('applies default port, rateLimitMax, and rateLimitWindowMs when unset', () => {
    const config = loadConfig({ DATABASE_URL: 'postgresql://x' });
    expect(config.port).toBe(3000);
    expect(config.rateLimitMax).toBe(100);
    expect(config.rateLimitWindowMs).toBe(60_000);
  });

  it('throws ConfigurationError for a non-numeric PORT', () => {
    expect(() => loadConfig({ DATABASE_URL: 'postgresql://x', PORT: 'not-a-number' })).toThrow(ConfigurationError);
  });

  it('respects RATE_LIMIT_MAX and RATE_LIMIT_WINDOW_MS overrides', () => {
    const config = loadConfig({ DATABASE_URL: 'postgresql://x', RATE_LIMIT_MAX: '50', RATE_LIMIT_WINDOW_MS: '30000' });
    expect(config.rateLimitMax).toBe(50);
    expect(config.rateLimitWindowMs).toBe(30_000);
  });
});
