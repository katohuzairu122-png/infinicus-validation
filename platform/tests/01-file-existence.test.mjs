// BUILD-10 structural tests — spec §22.A
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const BOOTSTRAP = resolve(ROOT, 'platform/platform-bootstrap.js');
const INDEX_HTML = resolve(ROOT, 'index.html');

// 1. platform-bootstrap.js exists
assert.equal(existsSync(BOOTSTRAP), true, 'platform/platform-bootstrap.js must exist');

const html = readFileSync(INDEX_HTML, 'utf8');
const scriptRefs = html.match(/src="\/platform\/platform-bootstrap\.js"/g) || [];

// 2. index.html includes it exactly once
assert.equal(scriptRefs.length, 1, 'index.html must reference platform-bootstrap.js exactly once');

// 3. the tag has the defer attribute
const tagMatch = html.match(/<script src="\/platform\/platform-bootstrap\.js"[^>]*>/);
assert.ok(tagMatch, 'platform-bootstrap.js script tag must exist');
assert.ok(tagMatch[0].includes('defer'), 'platform-bootstrap.js script tag must be deferred');

// 4. the script appears strictly after the ADI bundle tag (frozen location, spec §3.3)
const adiIndex = html.indexOf('src="/ai-decision-intelligence/adi-bundle.js"');
const platformIndex = html.indexOf('src="/platform/platform-bootstrap.js"');
assert.ok(adiIndex !== -1, 'ADI bundle tag must exist');
assert.ok(platformIndex > adiIndex, 'platform-bootstrap.js must appear after the ADI bundle tag');

// 5. no other /platform script tag exists (no duplicate)
const allPlatformScripts = html.match(/<script[^>]*src="\/platform\/[^"]*"[^>]*>/g) || [];
assert.equal(allPlatformScripts.length, 1, 'exactly one /platform/* script tag must exist');

// 6. all 7 existing bundle tags remain present, in the same relative order
const expectedOrder = [
  'src="/data-acquisition/da-bundle.js"',
  'src="/digital-twin/dt-bundle.js"',
  'src="/business-intelligence/bi-bundle.js"',
  'src="/approved-business-action/aba-bundle.js"',
  'src="/outcome-monitoring/om-bundle.js"',
  'src="/continuous-learning/cl-bundle.js"',
  'src="/ai-decision-intelligence/adi-bundle.js"'
];
let lastIndex = -1;
for (const marker of expectedOrder) {
  const idx = html.indexOf(marker);
  assert.ok(idx !== -1, `${marker} must still be present`);
  assert.ok(idx > lastIndex, `${marker} must remain in its existing relative order`);
  lastIndex = idx;
}

// 7. node --check on platform-bootstrap.js exits 0
execFileSync(process.execPath, ['--check', BOOTSTRAP]); // throws on non-zero exit

// 8. no migration newer than 0049 exists (frozen-migration guard, spec §22.A.8)
const migrationsDir = resolve(ROOT, 'infinicus-platform/infrastructure/database/migrations');
const { readdirSync } = await import('node:fs');
const migrationFiles = readdirSync(migrationsDir).filter((f) => /^\d{4}_/.test(f));
const maxNumber = Math.max(...migrationFiles.map((f) => parseInt(f.slice(0, 4), 10)));
assert.equal(maxNumber, 49, 'no migration beyond 0049 may exist after BUILD-10');

console.log('platform/tests/01-file-existence.test.mjs passed.');
