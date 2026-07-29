import { randomUUID } from 'crypto';
import type { TenantContext } from '../../client.js';
import { withTenantTransaction } from '../../client.js';
import { NotFoundError } from './errors.js';

export interface InventoryBalance {
  id: string;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  inventoryItemId: string;
  warehouseId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderPoint: number;
  reorderQuantity: number;
  lastMovementAt: Date | null;
  status: string;
  version: number;
  correlationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInventoryBalanceInput {
  businessId: string;
  inventoryItemId: string;
  warehouseId: string;
  quantityOnHand?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  correlationId?: string;
}

function rowToBalance(row: Record<string, unknown>): InventoryBalance {
  return {
    id:                row.id                  as string,
    tenantId:          row.tenant_id           as string,
    workspaceId:       row.workspace_id        as string,
    businessId:        row.business_id         as string,
    inventoryItemId:   row.inventory_item_id   as string,
    warehouseId:       row.warehouse_id        as string,
    quantityOnHand:    parseFloat(String(row.quantity_on_hand)),
    quantityReserved:  parseFloat(String(row.quantity_reserved)),
    quantityAvailable: parseFloat(String(row.quantity_available)),
    reorderPoint:      parseFloat(String(row.reorder_point)),
    reorderQuantity:   parseFloat(String(row.reorder_quantity)),
    lastMovementAt:    row.last_movement_at    as Date | null,
    status:            row.status              as string,
    version:           row.version             as number,
    correlationId:     row.correlation_id      as string,
    createdAt:         row.created_at          as Date,
    updatedAt:         row.updated_at          as Date,
  };
}

export class InventoryBalanceRepository {
  async create(ctx: TenantContext, input: CreateInventoryBalanceInput): Promise<InventoryBalance> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `INSERT INTO business_operations.inventory_balances
           (tenant_id, workspace_id, business_id, inventory_item_id, warehouse_id,
            quantity_on_hand, reorder_point, reorder_quantity, correlation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          ctx.tenantId, ctx.workspaceId,
          input.businessId,
          input.inventoryItemId,
          input.warehouseId,
          input.quantityOnHand   ?? 0,
          input.reorderPoint     ?? 0,
          input.reorderQuantity  ?? 0,
          input.correlationId    ?? randomUUID(),
        ]
      );
      return rowToBalance(result.rows[0]);
    });
  }

  async findByItemAndWarehouse(
    ctx: TenantContext,
    inventoryItemId: string,
    warehouseId: string
  ): Promise<InventoryBalance> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_operations.inventory_balances
         WHERE inventory_item_id = $1 AND warehouse_id = $2`,
        [inventoryItemId, warehouseId]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('InventoryBalance', `${inventoryItemId}/${warehouseId}`);
      }
      return rowToBalance(result.rows[0]);
    });
  }

  async adjustQuantity(
    ctx: TenantContext,
    id: string,
    delta: number
  ): Promise<InventoryBalance> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `UPDATE business_operations.inventory_balances
         SET quantity_on_hand = quantity_on_hand + $2,
             last_movement_at = now(),
             version = version + 1
         WHERE id = $1
         RETURNING *`,
        [id, delta]
      );
      if (result.rows.length === 0) throw new NotFoundError('InventoryBalance', id);
      return rowToBalance(result.rows[0]);
    });
  }

  async listBelowReorder(ctx: TenantContext): Promise<InventoryBalance[]> {
    return withTenantTransaction(ctx, async (client) => {
      const result = await client.query<Record<string, unknown>>(
        `SELECT * FROM business_operations.inventory_balances
         WHERE quantity_available <= reorder_point AND reorder_point > 0
         ORDER BY quantity_available ASC`,
        []
      );
      return result.rows.map(rowToBalance);
    });
  }
}
