import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const MIGRATIONS_DIR = resolve(__dirname, '../../../infrastructure/database/migrations');

function readMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), 'utf-8');
}

describe('0169_add_manual_json_connector_type', () => {
  const sql = readMigration('0169_add_manual_json_connector_type.sql');

  it('replaces connectors_type_check', () => {
    expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS connectors_type_check/);
    expect(sql).toMatch(/ADD CONSTRAINT connectors_type_check CHECK/);
  });

  it('permits manual_json', () => {
    expect(sql).toMatch(/'manual_json'/);
  });

  it('preserves all twelve original connector types', () => {
    for (const type of [
      'rest_api', 'graphql', 'webhook', 'postgres', 'mysql', 'mssql',
      'sqlite', 'sftp', 'object_storage', 'file_upload', 'event_stream', 'custom',
    ]) {
      expect(sql).toContain(`'${type}'`);
    }
  });

  it('is transactional and self-registering', () => {
    expect(sql).toMatch(/BEGIN;/);
    expect(sql).toMatch(/COMMIT;/);
    expect(sql).toMatch(/INSERT INTO _migrations.*0169_add_manual_json_connector_type\.sql/s);
  });
});
