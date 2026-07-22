import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { KnowledgeArtifactNotFoundError } from './errors.js';

export interface KnowledgeArtifact {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  artifactCode: string;
  artifactType: string;
  status: string;
  latestVersion: number;
}

function rowToArtifact(row: Record<string, unknown>): KnowledgeArtifact {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    workspaceId: row.workspace_id as string,
    businessId: row.business_id as string,
    artifactCode: row.artifact_code as string,
    artifactType: row.artifact_type as string,
    status: row.status as string,
    latestVersion: row.latest_version as number,
  };
}

export class KnowledgeArtifactRepository {
  async createArtifact(ctx: TenantContext, businessId: string, artifactCode: string, artifactType: string, contentReference: Record<string, unknown>): Promise<{ artifact: KnowledgeArtifact; versionId: string }> {
    return withTenantTransaction(ctx, async (client) => {
      const artRow = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.knowledge_artifacts (tenant_id, workspace_id, business_id, artifact_code, artifact_type, latest_version)
         VALUES ($1,$2,$3,$4,$5,1) RETURNING *`,
        [ctx.tenantId, ctx.workspaceId, businessId, artifactCode, artifactType]
      );
      const versionResult = await client.query<Record<string, unknown>>(
        `INSERT INTO continuous_learning.knowledge_artifact_versions (artifact_id, tenant_id, workspace_id, business_id, version_number, content_reference, correlation_id)
         VALUES ($1,$2,$3,$4,1,$5,$6) RETURNING id`,
        [artRow.rows[0].id, ctx.tenantId, ctx.workspaceId, businessId, JSON.stringify(contentReference), randomUUID()]
      );
      return { artifact: rowToArtifact(artRow.rows[0]), versionId: versionResult.rows[0].id as string };
    });
  }

  async addRelationship(ctx: TenantContext, artifactVersionId: string, businessId: string, relatedArtifactId: string, relationshipType: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.knowledge_relationships (artifact_version_id, tenant_id, workspace_id, business_id, related_artifact_id, relationship_type)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [artifactVersionId, ctx.tenantId, ctx.workspaceId, businessId, relatedArtifactId, relationshipType]
      );
    });
  }

  async recordSupersession(ctx: TenantContext, businessId: string, supersededArtifactId: string, supersedingArtifactId: string, reason: string): Promise<void> {
    return withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO continuous_learning.knowledge_supersessions (tenant_id, workspace_id, business_id, superseded_artifact_id, superseding_artifact_id, reason)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [ctx.tenantId, ctx.workspaceId, businessId, supersededArtifactId, supersedingArtifactId, reason]
      );
      await client.query(`UPDATE continuous_learning.knowledge_artifacts SET status = 'superseded' WHERE id = $1`, [supersededArtifactId]);
    });
  }

  async publish(ctx: TenantContext, id: string): Promise<KnowledgeArtifact> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.knowledge_artifacts SET status = 'published' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new KnowledgeArtifactNotFoundError('KnowledgeArtifact', id);
      return rowToArtifact(result.rows[0]);
    });
  }

  async retire(ctx: TenantContext, id: string): Promise<KnowledgeArtifact> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE continuous_learning.knowledge_artifacts SET status = 'retired' WHERE id = $1 RETURNING *`, [id]
      );
      if (result.rows.length === 0) throw new KnowledgeArtifactNotFoundError('KnowledgeArtifact', id);
      return rowToArtifact(result.rows[0]);
    });
  }

  async getById(ctx: TenantContext, id: string): Promise<KnowledgeArtifact> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>('SELECT * FROM continuous_learning.knowledge_artifacts WHERE id = $1', [id]);
      if (result.rows.length === 0) throw new KnowledgeArtifactNotFoundError('KnowledgeArtifact', id);
      return rowToArtifact(result.rows[0]);
    });
  }
}
