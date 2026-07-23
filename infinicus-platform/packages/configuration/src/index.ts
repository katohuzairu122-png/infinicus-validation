// Configuration loader — reads process.env once, fails closed on missing required values.
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export interface InfinicusConfig {
  env: 'development' | 'staging' | 'production' | 'test';
  databaseUrl: string;
  port: number;
  logLevel: string;
  rateLimitMax: number;
  rateLimitWindowMs: number;
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) throw new ConfigurationError(`Missing required environment variable: ${key}`);
  return value;
}

function optionalInt(env: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const raw = env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new ConfigurationError(`Environment variable ${key} must be a number, got: ${raw}`);
  return parsed;
}

/** Reads configuration from the given environment (defaults to process.env). Never caches — callers control when it re-reads. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): InfinicusConfig {
  const nodeEnv = env.NODE_ENV;
  const resolvedEnv: InfinicusConfig['env'] =
    nodeEnv === 'production' || nodeEnv === 'staging' || nodeEnv === 'test' ? nodeEnv : 'development';

  return {
    env: resolvedEnv,
    databaseUrl: requireEnv(env, 'DATABASE_URL'),
    port: optionalInt(env, 'PORT', 3000),
    logLevel: env.LOG_LEVEL ?? (resolvedEnv === 'production' ? 'info' : 'debug'),
    rateLimitMax: optionalInt(env, 'RATE_LIMIT_MAX', 100),
    rateLimitWindowMs: optionalInt(env, 'RATE_LIMIT_WINDOW_MS', 60_000),
  };
}
