import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, DigitalTwinDefinitionNotFoundError, DigitalTwinDefinitionStateConflictError } from './errors.js';

export interface DigitalTwinDefinition {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  definitionCode: string;
  name: string;
  status: string;
  latestVersion: number;
}

export interface DigitalTwinDefinitionVersion {
  id: string;
  definitionId: string;
  versionNumber: number;
  schemaReference: Record<string, unknown>;
  status: string;
  correlationId: string;
}

function rowToDefinition(row: Record<string, unknown>): DigitalTwinDefinition {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    definitionCode: row.definition_code as string,
    name: row.name as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToVersion(row: Record<string, unknown>): DigitalTwinDefinitionVersion {
  return {
    id: row.id as string,
    definitionId: row.definition_id as string,
    versionNumber: row.version_number as number,
    schemaReference: row.schema_reference as Record<string, unknown>,
    status: row.status as string,
    correlationId: row.correlation_id as string,
  };
}

export class DigitalTwinDefinitionRepository {
  async createDefinition(ctx: TenantContext, businessId: string, definitionCode: string, name: string): Promise<DigitalTwinDefinition> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.digital_twin_definitions (tenant_id, workspace_id, business_id, definition_code, name)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, definitionCode, name]
      );
      return rowToDefinition(result.rows[0]);
    });
  }

  async createVersion(ctx: TenantContext, definitionId: string, businessId: string, schemaReference: Record<string, unknown>): Promise<DigitalTwinDefinitionVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const def = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.digital_twin_definitions WHERE id = $1', [definitionId]);
      if (def.rows.length === 0) throw new DigitalTwinDefinitionNotFoundError('DigitalTwinDefinition', definitionId);
      const nextVersion = (def.rows[0].latest_version as number) + 1;
      const correlationId = randomUUID();
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.digital_twin_definition_versions
           (definition_id, tenant_id, workspace_id, business_id, version_number, schema_reference, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [definitionId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, JSON.stringify(schemaReference), correlationId]
      );
      await client.query('UPDATE business_digital_twin.digital_twin_definitions SET latest_version = $2 WHERE id = $1', [definitionId, nextVersion]);
      return rowToVersion(result.rows[0]);
    });
  }

  async validateVersion(ctx: TenantContext, versionId: string): Promise<DigitalTwinDefinitionVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_digital_twin.digital_twin_definition_versions SET status = 'validated' WHERE id = $1 RETURNING *`,
        [versionId]
      );
      if (result.rows.length === 0) throw new DigitalTwinDefinitionNotFoundError('DigitalTwinDefinitionVersion', versionId);
      return rowToVersion(result.rows[0]);
    });
  }

  async activateVersion(ctx: TenantContext, versionId: string): Promise<DigitalTwinDefinitionVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const version = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.digital_twin_definition_versions WHERE id = $1', [versionId]);
      if (version.rows.length === 0) throw new DigitalTwinDefinitionNotFoundError('DigitalTwinDefinitionVersion', versionId);
      if (version.rows[0].status !== 'validated') {
        throw new DigitalTwinDefinitionStateConflictError('DigitalTwinDefinitionVersion', 'must be validated before activation');
      }
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_digital_twin.digital_twin_definition_versions SET status = 'active' WHERE id = $1 RETURNING *`,
        [versionId]
      );
      await client.query(
        `UPDATE business_digital_twin.digital_twin_definitions SET status = 'active' WHERE id = $1`,
        [version.rows[0].definition_id]
      );
      return rowToVersion(result.rows[0]);
    });
  }

  async supersedeVersion(ctx: TenantContext, versionId: string): Promise<DigitalTwinDefinitionVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_digital_twin.digital_twin_definition_versions SET status = 'superseded' WHERE id = $1 RETURNING *`,
        [versionId]
      );
      if (result.rows.length === 0) throw new DigitalTwinDefinitionNotFoundError('DigitalTwinDefinitionVersion', versionId);
      return rowToVersion(result.rows[0]);
    });
  }

  async getActiveVersion(ctx: TenantContext, definitionId: string): Promise<DigitalTwinDefinitionVersion> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_digital_twin.digital_twin_definition_versions
         WHERE definition_id = $1 AND status = 'active' ORDER BY version_number DESC LIMIT 1`,
        [definitionId]
      );
      if (result.rows.length === 0) throw new NotFoundError('ActiveDigitalTwinDefinitionVersion', definitionId);
      return rowToVersion(result.rows[0]);
    });
  }
}
