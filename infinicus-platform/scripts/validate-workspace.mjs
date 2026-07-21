#!/usr/bin/env node
/**
 * validate-workspace.mjs
 * Confirms every required directory and root file exists.
 * Run: node scripts/validate-workspace.mjs
 */

import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const REQUIRED_FILES = [
  'package.json',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.base.json',
  '.gitignore',
  '.env.example',
  'README.md',
  'CLAUDE.md',
];

const REQUIRED_DIRS = [
  // apps
  'apps/web',
  'apps/admin',
  'apps/api',
  // layers
  'layers/data-acquisition',
  'layers/business-operations',
  'layers/business-intelligence',
  'layers/business-digital-twin',
  'layers/simulation',
  'layers/ai-decision-intelligence',
  'layers/approved-business-action',
  'layers/outcome-monitoring',
  'layers/continuous-learning',
  // packages
  'packages/shared-types',
  'packages/database',
  'packages/event-contracts',
  'packages/handoff-contracts',
  'packages/authentication',
  'packages/authorization',
  'packages/configuration',
  'packages/observability',
  'packages/testing',
  // infrastructure
  'infrastructure/database',
  'infrastructure/deployment',
  'infrastructure/monitoring',
  'infrastructure/backups',
  // top-level
  'docs',
  'tests',
  'scripts',
];

const REQUIRED_DOCS = [
  'docs/architecture-manifest.md',
  'scripts/validate-workspace.mjs',
];

let passed = 0;
let failed = 0;
const errors = [];

function check(relPath, label) {
  const abs = resolve(ROOT, relPath);
  if (existsSync(abs)) {
    console.log(`  ✓  ${relPath}`);
    passed++;
  } else {
    console.error(`  ✗  ${relPath}   ← MISSING (${label})`);
    errors.push(relPath);
    failed++;
  }
}

console.log('\n── Root files ──────────────────────────────────────────────');
for (const f of REQUIRED_FILES) check(f, 'root file');

console.log('\n── Directories ─────────────────────────────────────────────');
for (const d of REQUIRED_DIRS) check(d, 'directory');

console.log('\n── Additional required files ───────────────────────────────');
for (const f of REQUIRED_DOCS) check(f, 'required file');

console.log(`\n────────────────────────────────────────────────────────────`);
console.log(`Result: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\nMissing:\n${errors.map(e => `  - ${e}`).join('\n')}`);
  process.exit(1);
} else {
  console.log('\nWorkspace structure validated successfully.\n');
}
