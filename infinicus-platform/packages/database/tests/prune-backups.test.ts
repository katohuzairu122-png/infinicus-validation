/**
 * BUILD-22 — Test for infrastructure/database/scripts/prune-backups.sh's
 * retention logic. Filesystem-only (no live database needed), so this
 * runs unconditionally, not gated behind DATABASE_URL.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, readdir, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const execFileAsync = promisify(execFile);
const PRUNE_SH = resolve(__dirname, '../../../infrastructure/database/scripts/prune-backups.sh');

let testDir: string;

async function touchWithAge(filePath: string, daysAgo: number): Promise<void> {
  await writeFile(filePath, '');
  const time = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  await utimes(filePath, time, time);
}

describe('prune-backups.sh', () => {
  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'infinicus-prune-test-'));
    await touchWithAge(join(testDir, 'infinicus-old-db-1.dump'), 45);
    await touchWithAge(join(testDir, 'infinicus-old-db-2.dump'), 35);
    await touchWithAge(join(testDir, 'infinicus-recent-db.dump'), 10);
    await touchWithAge(join(testDir, 'infinicus-newest-db.dump'), 1);
    await touchWithAge(join(testDir, 'not-a-backup.txt'), 45);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('dry-run reports what would be deleted without deleting anything', async () => {
    const { stdout } = await execFileAsync('bash', [PRUNE_SH, '--dry-run'], {
      env: { ...process.env, BACKUP_DIR: testDir, BACKUP_RETENTION_DAYS: '30' },
    });
    expect(stdout).toContain('would be deleted');
    expect(stdout).toMatch(/2 would be deleted, 2 would be kept/);

    const filesAfter = await readdir(testDir);
    expect(filesAfter).toHaveLength(5);
  });

  it('deletes only .dump files older than the retention window', async () => {
    await execFileAsync('bash', [PRUNE_SH], {
      env: { ...process.env, BACKUP_DIR: testDir, BACKUP_RETENTION_DAYS: '30' },
    });

    const filesAfter = await readdir(testDir);
    expect(filesAfter.sort()).toEqual([
      'infinicus-newest-db.dump',
      'infinicus-recent-db.dump',
      'not-a-backup.txt',
    ]);
  });

  it('rejects a missing BACKUP_DIR', async () => {
    await expect(
      execFileAsync('bash', [PRUNE_SH], { env: { ...process.env, BACKUP_DIR: '' } })
    ).rejects.toThrow();
  });
});
