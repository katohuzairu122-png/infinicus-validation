import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const MIGRATION = resolve(
  __dirname,
  '../../../infrastructure/database/migrations/0001_foundation.sql'
);

describe('0001_foundation migration', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it('wraps in a transaction', () => {
    expect(sql).toMatch(/^\s*BEGIN/m);
    expect(sql).toMatch(/COMMIT\s*;?\s*$/m);
  });

  it('creates all required tables', () => {
    const tables = [
      '_migrations', 'tenants', 'workspaces', 'users',
      'workspace_members', 'businesses', 'audit_log', 'platform_events',
    ];
    for (const t of tables) {
      // Accept both CREATE TABLE and CREATE TABLE IF NOT EXISTS
      expect(sql, `missing table: ${t}`).toMatch(
        new RegExp(`CREATE TABLE(?:\\s+IF NOT EXISTS)?\\s+${t}\\b`)
      );
    }
  });

  it('enables RLS on every data table', () => {
    const normalized = sql.replace(/\s+/g, ' ');
    const tables = [
      'tenants', 'workspaces', 'users', 'workspace_members',
      'businesses', 'audit_log', 'platform_events',
    ];
    for (const t of tables) {
      expect(normalized, `missing RLS: ${t}`).toContain(
        `ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`
      );
    }
  });

  it('every table has tenant_id (except _migrations and tenants itself)', () => {
    const tenanted = ['workspaces','users','workspace_members','businesses','audit_log','platform_events'];
    for (const t of tenanted) {
      const tableBlock = sql.slice(sql.indexOf(`CREATE TABLE ${t}`));
      const blockEnd   = tableBlock.indexOf(';');
      expect(tableBlock.slice(0, blockEnd), `${t} missing tenant_id`).toContain('tenant_id');
    }
  });

  it('includes updated_at triggers for mutable tables', () => {
    const triggers = ['trg_tenants_updated_at','trg_workspaces_updated_at','trg_users_updated_at','trg_businesses_updated_at'];
    for (const tr of triggers) {
      expect(sql, `missing trigger: ${tr}`).toContain(tr);
    }
  });

  it('registers itself in _migrations', () => {
    expect(sql).toContain("INSERT INTO _migrations (filename) VALUES ('0001_foundation.sql')");
  });
});
