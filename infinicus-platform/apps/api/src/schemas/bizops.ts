import { z } from 'zod';

export const businessIdParamsSchema = z.object({
  businessId: z.string().uuid(),
});

const eventTypeSchema = z.enum(['sale', 'expense', 'inventory', 'customer', 'team']);
const eventActionSchema = z.enum(['new', 'return', 'churn', 'hire', 'fire', 'review']);

export const logEventBodySchema = z.object({
  eventType: eventTypeSchema,
  amount: z.number().optional(),
  quantity: z.number().optional(),
  category: z.string().max(255).optional(),
  customerId: z.string().max(255).optional(),
  memberId: z.string().max(255).optional(),
  action: eventActionSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const logEventResponseSchema = z.object({
  id: z.string().uuid(),
  eventType: eventTypeSchema,
});

export const eventsSummaryQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

const salesSummarySchema = z.object({
  transactionCount: z.number(),
  totalRevenue: z.number(),
  totalUnits: z.number(),
  avgSaleValue: z.number(),
  topCustomer: z.object({ id: z.string(), spend: z.number() }).nullable(),
});

const expensesSummarySchema = z.object({
  transactionCount: z.number(),
  totalSpend: z.number(),
  avgExpense: z.number(),
  burnRatePerDay: z.number(),
  byCategory: z.array(z.object({ category: z.string(), amount: z.number(), count: z.number() })),
});

const inventorySummarySchema = z.object({
  netUnitsDelta: z.number(),
  totalCogs: z.number(),
  topItems: z.array(z.object({ item: z.string(), netUnits: z.number() })),
});

const customersSummarySchema = z.object({
  newCustomers: z.number(),
  returning: z.number(),
  churned: z.number(),
  churnRatePct: z.number(),
  avgLtv: z.number(),
});

const teamSummarySchema = z.object({
  hired: z.number(),
  fired: z.number(),
  netHeadcountDelta: z.number(),
  performanceReviews: z.number(),
  totalHoursLogged: z.number(),
});

export const eventsSummaryResponseSchema = z.object({
  businessId: z.string().uuid(),
  period: z.object({ from: z.string(), to: z.string(), days: z.number() }),
  summary: z.object({
    sales: salesSummarySchema,
    expenses: expensesSummarySchema,
    inventory: inventorySummarySchema,
    customers: customersSummarySchema,
    team: teamSummarySchema,
  }),
});
