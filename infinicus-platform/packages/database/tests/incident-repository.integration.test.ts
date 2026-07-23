/**
 * Live PostgreSQL 16 integration tests for BUILD-29's incident response
 * schema (platform.incidents / platform.incident_updates) and
 * PlatformIncidentRepository.
 *
 * Requires:
 *   DATABASE_URL — app_test_user (no RLS applies — platform.incidents is
 *     platform-scoped, matching platform.deployment_events)
 *
 * Guard pattern: describe.runIf(!!process.env.DATABASE_URL)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createPool, closePool,
  PlatformIncidentRepository, PlatformIncidentNotFoundError, PlatformIncidentAlreadyResolvedError,
} from '../src/index.js';

const run = !!process.env.DATABASE_URL;

describe.runIf(run)('PlatformIncidentRepository — live PostgreSQL', () => {
  const repo = new PlatformIncidentRepository();

  beforeAll(() => {
    createPool({ connectionString: process.env.DATABASE_URL! });
  });

  afterAll(async () => {
    await closePool();
  });

  it('declares an incident with an initial "investigating" status and a first timeline entry', async () => {
    const { incident, firstUpdate } = await repo.declare({
      severity: 'sev2', title: 'Elevated API error rate', description: 'p99 error rate above threshold on apps/api',
      declaredBy: 'test-oncall@example.test', affectedSystems: ['apps/api'],
    });
    expect(incident.status).toBe('investigating');
    expect(incident.severity).toBe('sev2');
    expect(incident.resolvedAt).toBeNull();
    expect(firstUpdate.statusAtUpdate).toBe('investigating');
    expect(firstUpdate.incidentId).toBe(incident.id);
  });

  it('rejects an invalid severity value', async () => {
    await expect(
      repo.declare({ severity: 'sev5' as never, title: 'x', description: 'x', declaredBy: 'x' })
    ).rejects.toThrow();
  });

  it('walks an incident through its full lifecycle: investigating -> identified -> monitoring -> resolved', async () => {
    const { incident } = await repo.declare({
      severity: 'sev1', title: 'Database connection pool exhausted', description: 'apps/api unable to serve requests',
      declaredBy: 'test-oncall@example.test', affectedSystems: ['apps/api', 'postgres'],
    });

    await repo.addUpdate(incident.id, 'Root cause identified: connection leak in a background job', 'identified', 'test-oncall@example.test', true);
    const afterIdentified = await repo.getById(incident.id);
    expect(afterIdentified.status).toBe('identified');

    await repo.addUpdate(incident.id, 'Fix deployed, monitoring error rate', 'monitoring', 'test-oncall@example.test', true);
    const afterMonitoring = await repo.getById(incident.id);
    expect(afterMonitoring.status).toBe('monitoring');

    const resolved = await repo.resolve(incident.id, 'test-oncall@example.test', 'https://postmortems.example.test/incident-x');
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedAt).not.toBeNull();
    expect(resolved.postmortemUrl).toBe('https://postmortems.example.test/incident-x');

    const timeline = await repo.listUpdates(incident.id);
    expect(timeline.map((u) => u.statusAtUpdate)).toEqual(['investigating', 'identified', 'monitoring', 'resolved']);
    expect(timeline.every((u) => u.postedAt instanceof Date)).toBe(true);
  });

  it('rejects adding an update or resolving an already-resolved incident', async () => {
    const { incident } = await repo.declare({
      severity: 'sev4', title: 'Minor cosmetic issue', description: 'test', declaredBy: 'test-oncall@example.test',
    });
    await repo.resolve(incident.id, 'test-oncall@example.test');

    await expect(repo.addUpdate(incident.id, 'late update', 'monitoring', 'test-oncall@example.test')).rejects.toThrow(PlatformIncidentAlreadyResolvedError);
    await expect(repo.resolve(incident.id, 'test-oncall@example.test')).rejects.toThrow(PlatformIncidentAlreadyResolvedError);
  });

  it('rejects operations against a nonexistent incident', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000099';
    await expect(repo.getById(fakeId)).rejects.toThrow(PlatformIncidentNotFoundError);
    await expect(repo.addUpdate(fakeId, 'x', 'monitoring', 'x')).rejects.toThrow(PlatformIncidentNotFoundError);
    await expect(repo.resolve(fakeId, 'x')).rejects.toThrow(PlatformIncidentNotFoundError);
  });

  it('listActive excludes resolved incidents; listBySeverity filters correctly', async () => {
    const { incident: active } = await repo.declare({
      severity: 'sev3', title: 'Active incident for listActive test', description: 'test', declaredBy: 'test-oncall@example.test',
    });
    const { incident: toResolve } = await repo.declare({
      severity: 'sev3', title: 'To-be-resolved incident for listActive test', description: 'test', declaredBy: 'test-oncall@example.test',
    });
    await repo.resolve(toResolve.id, 'test-oncall@example.test');

    const activeList = await repo.listActive();
    expect(activeList.some((i) => i.id === active.id)).toBe(true);
    expect(activeList.some((i) => i.id === toResolve.id)).toBe(false);

    const sev3List = await repo.listBySeverity('sev3');
    expect(sev3List.some((i) => i.id === active.id)).toBe(true);
    expect(sev3List.every((i) => i.severity === 'sev3')).toBe(true);
  });

  it('affected_tenant_ids and affected_systems round-trip correctly', async () => {
    const tenantId = '11111111-1111-4111-8111-000000000001';
    const { incident } = await repo.declare({
      severity: 'sev2', title: 'Multi-tenant-impacting incident', description: 'test', declaredBy: 'test-oncall@example.test',
      affectedSystems: ['apps/api', 'billing'], affectedTenantIds: [tenantId],
    });
    expect(incident.affectedSystems).toEqual(['apps/api', 'billing']);
    expect(incident.affectedTenantIds).toEqual([tenantId]);
  });
});

describe.skipIf(run)('PlatformIncidentRepository — live PostgreSQL (skipped, no DATABASE_URL)', () => {
  it('skips live tests when DATABASE_URL is not set', () => {
    expect(run).toBe(false);
  });
});
