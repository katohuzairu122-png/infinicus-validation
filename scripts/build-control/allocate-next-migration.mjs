#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const migrationDir = path.join(root, 'infinicus-platform/infrastructure/database/migrations');

if (!fs.existsSync(migrationDir)) {
  console.error(`Migration directory not found: ${migrationDir}`);
  process.exit(1);
}

const numbers = fs.readdirSync(migrationDir)
  .map((name) => /^(\d{4})_.+\.sql$/.exec(name))
  .filter(Boolean)
  .map((match) => Number(match[1]))
  .sort((a, b) => a - b);

const highest = numbers.length ? numbers.at(-1) : 0;
const next = highest + 1;

console.log(JSON.stringify({
  highestExisting: highest || null,
  nextFree: String(next).padStart(4, '0'),
  warning: 'Re-run immediately before creating migrations. Do not reserve numbers across branches.'
}, null, 2));
