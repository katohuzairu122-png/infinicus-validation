import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { DigitalTwinInstanceNotFoundError, ValidationError } from './errors.js';

export interface DigitalTwinInstance {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  definitionId: string;
  instanceCode: string;
  status: string;
  latestVersion: number;
}

const VALID_STATUSES = ['initializing', 'active', 'degraded', 'stale', 'suspended', 'retired', 'failed'];

function rowToInstance(row: Record<string, unknown>): DigitalTwinInstance {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    definitionId: row.definition_id as string,
    instanceCode: row.instance_code as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class DigitalTwinInstanceRepository {
  async createInstance(ctx: TenantContext, businessId: string, definitionId: string, instanceCode: string): Promise<DigitalTwinInstance> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.digital_twin_instances (tenant_id, workspace_id, business_id, definition_id, instance_code)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, definitionId, instanceCode]
      );
      return rowToInstance(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, instanceId: string, businessId: string, definitionVersionId: string): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const inst = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.digital_twin_instances WHERE id = $1', [instanceId]);
      if (inst.rows.length === 0) throw new DigitalTwinInstanceNotFoundError('DigitalTwinInstance', instanceId);
      const nextVersion = (inst.rows[0].latest_version as number) + 1;
      const correlationId = randomUUID();
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.digital_twin_instance_versions
           (instance_id, tenant_id, workspace_id, business_id, definition_version_id, version_number, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, version_number`,
        [instanceId, ctx.tenantId, ctx.workspaceId, businessId, definitionVersionId, nextVersion, correlationId]
      );
      await client.query('UPDATE business_digital_twin.digital_twin_instances SET latest_version = $2 WHERE id = $1', [instanceId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async transitionStatus(ctx: TenantContext, instanceId: string, toStatus: string, reason?: string): Promise<DigitalTwinInstance> {
    if (!VALID_STATUSES.includes(toStatus)) {
      throw new ValidationError('DigitalTwinInstance', [`unknown status: ${toStatus}`]);
    }
    return withTenantTransaction(ctx, async (client) => {
      const current = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.digital_twin_instances WHERE id = $1', [instanceId]);
      if (current.rows.length === 0) throw new DigitalTwinInstanceNotFoundError('DigitalTwinInstance', instanceId);
      const fromStatus = current.rows[0].status as string;
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_digital_twin.digital_twin_instances SET status = $2 WHERE id = $1 RETURNING *`,
        [instanceId, toStatus]
      );
      await client.query(
        `INSERT INTO business_digital_twin.digital_twin_instance_status_history
           (instance_id, tenant_id, workspace_id, business_id, from_status, to_status, reason, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [instanceId, ctx.tenantId, ctx.workspaceId, result.rows[0].business_id, fromStatus, toStatus, reason ?? null, randomUUID()]
      );
      return rowToInstance(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<DigitalTwinInstance> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.digital_twin_instances WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new DigitalTwinInstanceNotFoundError('DigitalTwinInstance', id);
      return rowToInstance(result.rows[0]);
    });
  }

  async getActiveForBusiness(ctx: TenantContext, businessId: string): Promise<DigitalTwinInstance[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_digital_twin.digital_twin_instances WHERE business_id = $1 AND status = 'active' ORDER BY created_at DESC`,
        [businessId]
      );
      return result.rows.map(rowToInstance);
    });
  }
}
