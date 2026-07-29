/**
 * Live test for BUILD-24's browser-secret-prevention requirement:
 * infrastructure/deployment/scripts/check-no-browser-secrets.mjs. Runs
 * the real script — against this repository's actual apps/web/src (must
 * pass) and against deliberately-violating fixture directories (must
 * fail with the expected diagnostic) — not a reimplementation of its
 * scanning logic.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const execFileAsync = promisify(execFile);
const CHECK_SCRIPT = resolve(__dirname, '../../../infrastructure/deployment/scripts/check-no-browser-secrets.mjs');

let fixtureDir: string | null = null;

afterEach(() => {
  if (fixtureDir) {
    rmSync(fixtureDir, { recursive: true, force: true });
    fixtureDir = null;
  }
});

function makeFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'browser-secret-fixture-'));
  mkdirSync(join(dir, 'apps/web/src/app'), { recursive: true });
  mkdirSync(join(dir, 'apps/admin/src'), { recursive: true });
  fixtureDir = dir;
  return dir;
}

function runCheck(rootDir?: string) {
  return execFileAsync('node', rootDir ? [CHECK_SCRIPT, rootDir] : [CHECK_SCRIPT]);
}

describe('check-no-browser-secrets.mjs', () => {
  it('passes against this repository\'s real apps/web and apps/admin source', async () => {
    const { stdout } = await runCheck();
    expect(stdout).toContain('Browser-secret check passed');
  });

  it('fails when NEXT_PUBLIC_DATABASE_URL is referenced', async () => {
    const dir = makeFixture();
    writeFileSync(join(dir, 'apps/web/src/app/bad.ts'), 'export const url = process.env.NEXT_PUBLIC_DATABASE_URL;\n');

    let caught: { stderr?: string } | undefined;
    try {
      await runCheck(dir);
    } catch (err) {
      caught = err as { stderr?: string };
    }
    expect(caught, 'check-no-browser-secrets.mjs should have exited non-zero').toBeDefined();
    expect(caught?.stderr).toContain('NEXT_PUBLIC_DATABASE_URL');
  });

  it('fails when a \'use client\' file reads process.env.DATABASE_URL directly', async () => {
    const dir = makeFixture();
    writeFileSync(
      join(dir, 'apps/web/src/app/bad.tsx'),
      "'use client';\nexport function Bad() { return process.env.DATABASE_URL; }\n"
    );

    let caught: { stderr?: string } | undefined;
    try {
      await runCheck(dir);
    } catch (err) {
      caught = err as { stderr?: string };
    }
    expect(caught, 'check-no-browser-secrets.mjs should have exited non-zero').toBeDefined();
    expect(caught?.stderr).toContain("'use client' file references process.env.DATABASE_URL");
  });

  it('does not flag a server component reading process.env.DATABASE_URL (no \'use client\' directive)', async () => {
    const dir = makeFixture();
    writeFileSync(
      join(dir, 'apps/web/src/app/fine.ts'),
      'export function getUrl() { return process.env.DATABASE_URL; }\n'
    );

    const { stdout } = await runCheck(dir);
    expect(stdout).toContain('Browser-secret check passed');
  });
});
