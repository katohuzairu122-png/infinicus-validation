#!/usr/bin/env node
// BUILD-24 — CLI helper for rotate-db-credential.sh: records a
// platform.secret_rotation_events row via SecretRotationEventRepository,
// and checks whether a secret's most recent rotation is expired or
// approaching expiry. Never stores the secret value itself — only
// rotation metadata.
//
// Follows deployment-audit.cjs's argv-only pattern (BUILD-23): every
// value crosses the bash-to-node boundary as an argv element, never
// interpolated into an eval'd string.
//
// Usage:
//   node secret-rotation-audit.cjs record <secretName> <environment> <rotatedBy> <expiresAtISO|-> <notes>
//     -> prints the new secret_rotation_events id to stdout
//   node secret-rotation-audit.cjs check-expiration <secretName> <environment> <warnDays>
//     -> exit 0 if the secret has never been rotated (nothing to check) or
//        its latest rotation is not within warnDays of expiring;
//        exit 1 if the latest rotation is expired or within warnDays of
//        expiring, or has no recorded expiry at all.
//
// Requires DATABASE_URL in the environment.

const path = require('node:path');
const { createPool, SecretRotationEventRepository, closePool } = require(
  path.join(__dirname, '..', '..', '..', 'packages', 'database', 'dist', 'index.js')
);

async function main() {
  const [, , command, ...args] = process.argv;
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }
  createPool({ connectionString: process.env.DATABASE_URL });
  const repo = new SecretRotationEventRepository();

  try {
    if (command === 'record') {
      const [secretName, environment, rotatedBy, expiresAtRaw, notes] = args;
      const expiresAt = expiresAtRaw && expiresAtRaw !== '-' ? new Date(expiresAtRaw) : undefined;
      const event = await repo.record({ secretName, environment, rotatedBy, expiresAt, notes });
      console.log(event.id);
    } else if (command === 'check-expiration') {
      const [secretName, environment, warnDaysRaw] = args;
      const warnDays = Number(warnDaysRaw);
      const latest = await repo.latestForSecret(secretName, environment);
      if (!latest) {
        console.log(`No rotation recorded for "${secretName}" in "${environment}" — nothing to check.`);
        return;
      }
      if (!latest.expiresAt) {
        console.error(`ERROR: latest rotation of "${secretName}" in "${environment}" (${latest.rotatedAt.toISOString()}) has no recorded expiry.`);
        process.exitCode = 1;
        return;
      }
      const daysUntilExpiry = (latest.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      if (daysUntilExpiry <= 0) {
        console.error(`ERROR: "${secretName}" in "${environment}" expired ${Math.abs(daysUntilExpiry).toFixed(1)} day(s) ago (expiresAt=${latest.expiresAt.toISOString()}).`);
        process.exitCode = 1;
        return;
      }
      if (daysUntilExpiry <= warnDays) {
        console.error(`ERROR: "${secretName}" in "${environment}" expires in ${daysUntilExpiry.toFixed(1)} day(s), within the ${warnDays}-day warning window (expiresAt=${latest.expiresAt.toISOString()}).`);
        process.exitCode = 1;
        return;
      }
      console.log(`"${secretName}" in "${environment}" expires in ${daysUntilExpiry.toFixed(1)} day(s) — outside the ${warnDays}-day warning window.`);
    } else {
      console.error(`ERROR: unknown command "${command}" (expected record|check-expiration)`);
      process.exit(1);
    }
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
