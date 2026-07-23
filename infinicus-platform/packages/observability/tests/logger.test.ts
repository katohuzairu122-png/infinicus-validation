import { describe, it, expect } from 'vitest';
import { Writable } from 'node:stream';
import { createLogger, withCorrelationId, logAuditEntry } from '../src/index.js';

/** Captures every line createLogger's pino instance writes, parsed as JSON, for assertion. */
function capturingLogger(options: Parameters<typeof createLogger>[0] = { name: 'test-logger' }) {
  const lines: Record<string, unknown>[] = [];
  const destination = new Writable({
    write(chunk, _enc, callback) {
      lines.push(JSON.parse(chunk.toString()));
      callback();
    },
  });
  const logger = createLogger({ ...options, destination });
  return { logger, lines };
}

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

describe('redaction (BUILD-24)', () => {
  it('redacts config.databaseUrl regardless of its value', () => {
    const { logger, lines } = capturingLogger();
    logger.info({ config: { databaseUrl: 'postgresql://u:s3cr3t@host/db' } }, 'startup');
    expect((lines[0].config as Record<string, unknown>).databaseUrl).toBe('[REDACTED]');
  });

  it('redacts req.headers.authorization', () => {
    const { logger, lines } = capturingLogger();
    logger.info({ req: { headers: { authorization: 'Bearer secret-token' } } }, 'request');
    const req = lines[0].req as { headers: Record<string, unknown> };
    expect(req.headers.authorization).toBe('[REDACTED]');
  });

  it('does not redact unrelated fields', () => {
    const { logger, lines } = capturingLogger();
    logger.info({ route: '/v1/health', statusCode: 200 }, 'ok');
    expect(lines[0].route).toBe('/v1/health');
    expect(lines[0].statusCode).toBe(200);
  });

  it('merges caller-supplied redactPaths with the defaults', () => {
    const { logger, lines } = capturingLogger({ name: 'test-logger', redactPaths: ['customSecret'] });
    logger.info({ customSecret: 'leaked-value', route: '/v1/health' }, 'custom');
    expect(lines[0].customSecret).toBe('[REDACTED]');
    expect(lines[0].route).toBe('/v1/health');
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
