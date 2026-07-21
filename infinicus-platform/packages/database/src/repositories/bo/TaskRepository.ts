import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './errors.js';

export interface Task {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  taskCode: string;
  title: string;
  description: string | null;
  taskType: string;
  priority: string;
  taskStatus: string;
  dueDate: Date | null;
  completedAt: Date | null;
  referenceType: string | null;
  referenceId: string | null;
  parentTaskId: string | null;
  status: string;
  version: number;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}

export interface CreateTaskInput {
  businessId: string;
  taskCode: string;
  title: string;
  description?: string;
  taskType?: string;
  priority?: string;
  dueDate?: Date;
  referenceType?: string;
  referenceId?: string;
  parentTaskId?: string;
  correlationId?: string;
  createdBy?: string;
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id:            row.id             as string,
    tenantId:      row.tenant_id      as string,
    workspaceId:   row.workspace_id   as string,
    businessId:    row.business_id    as string,
    taskCode:      row.task_code      as string,
    title:         row.title          as string,
    description:   row.description    as string | null,
    taskType:      row.task_type      as string,
    priority:      row.priority       as string,
    taskStatus:    row.task_status    as string,
    dueDate:       row.due_date       as Date | null,
    completedAt:   row.completed_at   as Date | null,
    referenceType: row.reference_type as string | null,
    referenceId:   row.reference_id   as string | null,
    parentTaskId:  row.parent_task_id as string | null,
    status:        row.status         as string,
    version:       row.version        as number,
    correlationId: row.correlation_id as string,
    createdAt:     row.created_at     as Date,
    updatedAt:     row.updated_at     as Date,
    createdBy:     row.created_by     as string | null,
  };
}

export class TaskRepository {
  async create(ctx: TenantContext, input: CreateTaskInput): Promise<Task> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_operations.tasks
           (tenant_id, workspace_id, business_id, task_code, title, description,
            task_type, priority, due_date, reference_type, reference_id,
            parent_task_id, correlation_id, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         RETURNING *`,
        [
          ctx.tenantId, ctx.workspaceId,
          input.businessId,
          input.taskCode,
          input.title,
          input.description  ?? null,
          input.taskType     ?? 'general',
          input.priority     ?? 'normal',
          input.dueDate      ?? null,
          input.referenceType ?? null,
          input.referenceId  ?? null,
          input.parentTaskId ?? null,
          input.correlationId ?? randomUUID(),
          input.createdBy    ?? null,
        ]
      );
      return rowToTask(result.rows[0]);
    });
  }

  async findById(ctx: TenantContext, id: string): Promise<Task> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        'SELECT * FROM business_operations.tasks WHERE id = $1',
        [id]
      );
      if (result.rows.length === 0) throw new NotFoundError('Task', id);
      return rowToTask(result.rows[0]);
    });
  }

  async listOpen(ctx: TenantContext): Promise<Task[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_operations.tasks
         WHERE task_status IN ('open','in_progress','blocked')
         ORDER BY priority DESC, due_date ASC NULLS LAST`,
        []
      );
      return result.rows.map(rowToTask);
    });
  }

  async updateStatus(ctx: TenantContext, id: string, taskStatus: string): Promise<Task> {
    return withTenantTransaction(ctx, async (client) => {
      const completedClause = taskStatus === 'completed' ? ', completed_at = now()' : '';
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_operations.tasks
         SET task_status = $2${completedClause}, version = version + 1
         WHERE id = $1
         RETURNING *`,
        [id, taskStatus]
      );
      if (result.rows.length === 0) throw new NotFoundError('Task', id);
      return rowToTask(result.rows[0]);
    });
  }
}
