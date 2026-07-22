#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const buildId = process.argv[2];
if (!buildId) {
  console.error('Usage: node scripts/build-preflight.mjs BUILD-XX');
  process.exit(2);
}

const root = process.cwd();
const required = [
  'CLAUDE.md',
  'CLAUDE-QUEUE-INSTRUCTIONS.md',
  '.claude/state/implementation-status.json',
  'docs/implementation-queue/00-IMPLEMENTATION-MANIFEST.md'
];

const missing = required.filter((p) => !fs.existsSync(path.join(root, p)));
if (missing.length) {
  console.error('Missing required repository files:');
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

const queuePath = path.join(root, '.claude/state/implementation-status.json');
let queue;
try {
  queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
} catch (error) {
  console.error(`Invalid queue JSON: ${error.message}`);
  process.exit(1);
}

function walk(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, results);
    else results.push(full);
  }
  return results;
}

const migrationDir = path.join(root, 'infinicus-platform/infrastructure/database/migrations');
const migrations = walk(migrationDir)
  .filter((p) => /^\d{4}_.+\.sql$/.test(path.basename(p)))
  .sort();

const highest = migrations.length ? path.basename(migrations.at(-1)).slice(0, 4) : 'none';
const digest = crypto.createHash('sha256');
for (const file of migrations) {
  digest.update(path.relative(root, file));
  digest.update(fs.readFileSync(file));
}

console.log(JSON.stringify({
  ok: true,
  buildId,
  currentReadyBuild: queue.currentReadyBuild ?? null,
  migrationCount: migrations.length,
  highestMigration: highest,
  migrationSetSha256: digest.digest('hex'),
  checkedAt: new Date().toISOString()
}, null, 2));
