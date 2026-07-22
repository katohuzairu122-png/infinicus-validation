// Tests for scripts/build-control/build-preflight.mjs — verifies it resolves
// CLAUDE.md at either the repository root or infinicus-platform/CLAUDE.md,
// using deterministic .git-anchored root discovery rather than process.cwd().
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'build-preflight.mjs');

function scaffoldFakeRepo(claudeMdLayout) {
  const root = mkdtempSync(join(tmpdir(), 'preflight-test-'));
  mkdirSync(join(root, '.git'));
  writeFileSync(join(root, 'CLAUDE-QUEUE-INSTRUCTIONS.md'), '# queue instructions\n');
  mkdirSync(join(root, '.claude/state'), { recursive: true });
  writeFileSync(join(root, '.claude/state/implementation-status.json'), JSON.stringify({ currentReadyBuild: null }));
  mkdirSync(join(root, 'docs/implementation-queue'), { recursive: true });
  writeFileSync(join(root, 'docs/implementation-queue/00-IMPLEMENTATION-MANIFEST.md'), '# manifest\n');
  mkdirSync(join(root, 'infinicus-platform/infrastructure/database/migrations'), { recursive: true });

  if (claudeMdLayout === 'root') {
    writeFileSync(join(root, 'CLAUDE.md'), '# root claude.md\n');
  } else if (claudeMdLayout === 'nested') {
    writeFileSync(join(root, 'infinicus-platform/CLAUDE.md'), '# nested claude.md\n');
  }
  // The script itself must be reachable relative to its own real location —
  // copy it into the fake repo's scripts/build-control/ so that its
  // .git-anchored root discovery walks up to the fake repo, not the real one.
  mkdirSync(join(root, 'scripts/build-control'), { recursive: true });
  writeFileSync(join(root, 'scripts/build-control/build-preflight.mjs'), readFileSync(SCRIPT));

  return root;
}

function runPreflight(root) {
  return execFileSync('node', [join(root, 'scripts/build-control/build-preflight.mjs'), 'BUILD-TEST'], {
    cwd: root,
    encoding: 'utf8',
  });
}

test('resolves CLAUDE.md at the repository root', () => {
  const root = scaffoldFakeRepo('root');
  try {
    const output = JSON.parse(runPreflight(root));
    assert.equal(output.ok, true);
    assert.equal(output.claudeMdLocation, 'CLAUDE.md');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('resolves CLAUDE.md nested at infinicus-platform/CLAUDE.md (this repository\'s actual layout)', () => {
  const root = scaffoldFakeRepo('nested');
  try {
    const output = JSON.parse(runPreflight(root));
    assert.equal(output.ok, true);
    assert.equal(output.claudeMdLocation, 'infinicus-platform/CLAUDE.md');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails when CLAUDE.md exists in neither supported location', () => {
  const root = scaffoldFakeRepo('none');
  try {
    assert.throws(() => runPreflight(root), /Command failed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('root discovery is anchored to .git, not process.cwd()', () => {
  const root = scaffoldFakeRepo('root');
  try {
    // Invoke from a different cwd (the fake repo's migrations subdirectory)
    // to prove the script finds the true root via .git, not via cwd.
    const cwd = join(root, 'infinicus-platform/infrastructure/database/migrations');
    const output = JSON.parse(
      execFileSync('node', [join(root, 'scripts/build-control/build-preflight.mjs'), 'BUILD-TEST'], {
        cwd,
        encoding: 'utf8',
      })
    );
    assert.equal(output.ok, true);
    assert.equal(output.repoRoot, root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('still requires CLAUDE-QUEUE-INSTRUCTIONS.md, implementation-status.json, and the manifest (other checks not weakened)', () => {
  const root = scaffoldFakeRepo('root');
  try {
    rmSync(join(root, 'CLAUDE-QUEUE-INSTRUCTIONS.md'));
    assert.throws(() => runPreflight(root), /Command failed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
