#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const baselinePath = process.argv[2];
if (!baselinePath) {
  console.error('Usage: node scripts/check-frozen-migrations.mjs <baseline-json>');
  process.exit(2);
}

const root = process.cwd();
const baseline = JSON.parse(fs.readFileSync(path.resolve(baselinePath), 'utf8'));
const failures = [];

for (const [relative, expected] of Object.entries(baseline.files ?? {})) {
  const full = path.join(root, relative);
  if (!fs.existsSync(full)) {
    failures.push(`${relative}: missing`);
    continue;
  }
  const actual = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
  if (actual !== expected) failures.push(`${relative}: ${actual} != ${expected}`);
}

if (failures.length) {
  console.error('Frozen migration verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Frozen migration verification passed for ${Object.keys(baseline.files ?? {}).length} files.`);
