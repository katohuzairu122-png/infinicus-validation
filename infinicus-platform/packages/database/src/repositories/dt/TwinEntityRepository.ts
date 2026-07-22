import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError, TwinEntityValidationError } from './errors.js';

export interface TwinEntity {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  instanceId: string;
  entityCode: string;
  entityType: string;
  name: string;
  latestVersion: number;
}

export interface TwinRelationship {
  id: string;
  instanceId: string;
  fromEntityId: string;
  toEntityId: string;
  relationshipType: string;
  latestVersion: number;
}

const VALID_ENTITY_TYPES = ['customer', 'product', 'location', 'channel', 'resource', 'team', 'supplier', 'other'];

function rowToEntity(row: Record<string, unknown>): TwinEntity {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    instanceId: row.instance_id as string,
    entityCode: row.entity_code as string,
    entityType: row.entity_type as string,
    name: row.name as string,
    latestVersion: row.latest_version as number,
  };
}

function rowToRelationship(row: Record<string, unknown>): TwinRelationship {
  return {
    id: row.id as string,
    instanceId: row.instance_id as string,
    fromEntityId: row.from_entity_id as string,
    toEntityId: row.to_entity_id as string,
    relationshipType: row.relationship_type as string,
    latestVersion: row.latest_version as number,
  };
}

export class TwinEntityRepository {
  async createEntity(ctx: TenantContext, businessId: string, instanceId: string, entityCode: string, entityType: string, name: string): Promise<TwinEntity> {
    if (!VALID_ENTITY_TYPES.includes(entityType)) throw new TwinEntityValidationError('TwinEntity', [`unknown entity type: ${entityType}`]);
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.twin_entities (tenant_id, workspace_id, business_id, instance_id, entity_code, entity_type, name)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, instanceId, entityCode, entityType, name]
      );
      return rowToEntity(result.rows[0]);
    });
  }

  async createEntityVersion(ctx: TenantContext, entityId: string, businessId: string, attributes: Record<string, unknown>): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const entity = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_entities WHERE id = $1', [entityId]);
      if (entity.rows.length === 0) throw new NotFoundError('TwinEntity', entityId);
      const nextVersion = (entity.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.twin_entity_versions (entity_id, tenant_id, workspace_id, business_id, version_number, attributes, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, version_number`,
        [entityId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, JSON.stringify(attributes), randomUUID()]
      );
      await client.query('UPDATE business_digital_twin.twin_entities SET latest_version = $2 WHERE id = $1', [entityId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async createRelationship(ctx: TenantContext, businessId: string, instanceId: string, fromEntityId: string, toEntityId: string, relationshipType: string): Promise<TwinRelationship> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.twin_relationships (tenant_id, workspace_id, business_id, instance_id, from_entity_id, to_entity_id, relationship_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, instanceId, fromEntityId, toEntityId, relationshipType]
      );
      return rowToRelationship(result.rows[0]);
    });
  }

  async createRelationshipVersion(ctx: TenantContext, relationshipId: string, businessId: string, attributes: Record<string, unknown>): Promise<{ id: string; versionNumber: number }> {
    return withTenantTransaction(ctx, async (client) => {
      const rel = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_relationships WHERE id = $1', [relationshipId]);
      if (rel.rows.length === 0) throw new NotFoundError('TwinRelationship', relationshipId);
      const nextVersion = (rel.rows[0].latest_version as number) + 1;
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_digital_twin.twin_relationship_versions (relationship_id, tenant_id, workspace_id, business_id, version_number, attributes, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, version_number`,
        [relationshipId, ctx.tenantId, ctx.workspaceId, businessId, nextVersion, JSON.stringify(attributes), randomUUID()]
      );
      await client.query('UPDATE business_digital_twin.twin_relationships SET latest_version = $2 WHERE id = $1', [relationshipId, nextVersion]);
      return { id: result.rows[0].id as string, versionNumber: result.rows[0].version_number as number };
    });
  }

  async getEntityGraph(ctx: TenantContext, instanceId: string): Promise<{ entities: TwinEntity[]; relationships: TwinRelationship[] }> {
    return withTenantTransaction(ctx, async (client) => {
      const entities = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_entities WHERE instance_id = $1', [instanceId]);
      const relationships = await client.query<Record<string, unknown>>('SELECT * FROM business_digital_twin.twin_relationships WHERE instance_id = $1', [instanceId]);
      return { entities: entities.rows.map(rowToEntity), relationships: relationships.rows.map(rowToRelationship) };
    });
  }
}
