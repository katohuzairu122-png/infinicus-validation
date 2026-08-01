import { z } from 'zod';

export const businessIdParamsSchema = z.object({
  businessId: z.string().uuid(),
});

export const productIdParamsSchema = z.object({
  businessId: z.string().uuid(),
  productId: z.string().uuid(),
});

const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
  icon: z.string().nullable(),
  active: z.boolean(),
  sortOrder: z.number(),
});

export const createProductBodySchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().min(0),
  category: z.string().max(255).optional(),
  icon: z.string().max(16).optional(),
  sortOrder: z.number().int().optional(),
});

export const updateProductBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  price: z.number().min(0).optional(),
  category: z.string().max(255).optional(),
  icon: z.string().max(16).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const productResponseSchema = productSchema;

export const listProductsQuerySchema = z.object({
  includeInactive: z.coerce.boolean().optional().default(false),
});

export const listProductsResponseSchema = z.object({
  products: z.array(productSchema),
});
