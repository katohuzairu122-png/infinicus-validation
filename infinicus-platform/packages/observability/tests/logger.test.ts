import { describe, it, expect } from 'vitest';
import { createLogger, withCorrelationId, logAuditEntry } from '../src/index.js';

describe('createLogger', () => {
  it('creates a pino logger with the given name and default level', () => {
    const logger = createLogger({ name: 'test-logger' });
    expect(logger.level).toBe('info');
  });

  it('respects an explicit level', () => {
    const logger = createLogger({ name: 'test-logger', level: 'debug' });
    expect(logger.level).toBe('debug');
  });
});

describe('withCorrelationId', () => {
  it('returns a child logger without throwing', () => {
    const logger = createLogger({ name: 'test-logger', level: 'silent' });
    const child = withCorrelationId(logger, 'corr-123');
    expect(typeof child.info).toBe('function');
  });
});

describe('logAuditEntry', () => {
  it('logs an audit entry without throwing', () => {
    const logger = createLogger({ name: 'test-logger', level: 'silent' });
    expect(() =>
      logAuditEntry(logger, {
        correlationId: 'corr-1', tenantId: 'tenant-1', userId: 'user-1',
        method: 'GET', route: '/v1/businesses', statusCode: 200, durationMs: 12,
      })
    ).not.toThrow();
  });

  it('accepts null tenantId/userId for pre-authentication requests', () => {
    const logger = createLogger({ name: 'test-logger', level: 'silent' });
    expect(() =>
      logAuditEntry(logger, {
        correlationId: 'corr-2', tenantId: null, userId: null,
        method: 'POST', route: '/v1/auth/login', statusCode: 401, durationMs: 5,
      })
    ).not.toThrow();
  });
});
