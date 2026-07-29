import { z } from 'zod';

export const businessSummarySchema = z.object({
  id: z.string().uuid(),
  legalName: z.string(),
  businessCode: z.string(),
  status: z.string(),
  industry: z.string().nullable(),
});

export const createBusinessBodySchema = z.object({
  legalName: z.string().min(1).max(500),
  tradingName: z.string().min(1).max(500).optional(),
  businessCode: z.string().min(1).max(255),
  industry: z.string().min(1).max(255).optional(),
  legalStructure: z.string().min(1).max(255).optional(),
  businessModel: z.string().min(1).max(255).optional(),
});

export const createBusinessResponseSchema = businessSummarySchema;

const industryCodeSchema = z.enum([
  'food', 'retail', 'saas', 'service', 'fitness', 'agency', 'health',
  'edtech', 'marketplace', 'events', 'fintech', 'realestate', 'logistics',
]);

export const startSimulationBodySchema = z.object({
  ideaText: z.string().min(1).max(4_000),
  capital: z.number().positive(),
  price: z.number().positive(),
  mktBud: z.number().min(0),
  team: z.number().int().min(1),
  industry: industryCodeSchema,
  loc: z.string().max(255).optional(),
  mkt: z.string().max(500).optional(),
  exp: z.enum(['first', 'some', 'serial', 'expert']).optional(),
  comp: z.enum(['low', 'medium', 'high', 'red']).optional(),
  engMode: z.enum(['balanced', 'lean', 'aggressive', 'investor']).optional(),
});

export const startSimulationResponseSchema = z.object({
  runId: z.string().uuid(),
  status: z.string(),
});

export const simulationRunParamsSchema = z.object({
  businessId: z.string().uuid(),
  runId: z.string().uuid(),
});

const simulationRunResultSchema = z.object({
  finalCash: z.number(),
  finalCustomers: z.number(),
  totalRevenue: z.number(),
  totalCost: z.number(),
  profitableDays: z.number(),
  survivalRate: z.number(),
  percentiles: z.object({ p10: z.number(), p25: z.number(), p50: z.number(), p75: z.number(), p90: z.number() }),
  scores: z.object({ VIABILITY: z.number(), 'MKT FIT': z.number(), EXECUTION: z.number(), FINANCIAL: z.number() }),
  verdict: z.enum(['go', 'modify', 'stop']),
  capRatio: z.number(),
});

export const simulationRunStatusResponseSchema = z.object({
  runId: z.string().uuid(),
  status: z.string(),
  failureMessage: z.string().nullable(),
  result: simulationRunResultSchema.nullable(),
});

export const businessListResponseSchema = z.object({
  items: z.array(businessSummarySchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
});

export const businessIdParamsSchema = z.object({
  businessId: z.string().uuid(),
});

export const workflowViewResponseSchema = z.object({
  business: businessSummarySchema,
  biEvidenceCount: z.number(),
  dtInstanceCount: z.number(),
  hasDtSnapshot: z.boolean(),
  simulationRunCount: z.number(),
  hasSimulationResult: z.boolean(),
  adiCaseCount: z.number(),
  hasAdiRecommendation: z.boolean(),
  abaReviewCount: z.number(),
  hasAbaDecision: z.boolean(),
  outcomeCount: z.number(),
});

export const createDecisionBodySchema = z.object({
  intakePackageId: z.string().uuid(),
  reviewCode: z.string().min(1).max(255),
  summary: z.string().min(1).max(10_000),
  approverUserId: z.string().uuid(),
  assignmentCode: z.string().min(1).max(255),
  decisionCode: z.string().min(1).max(255),
  outcome: z.enum(['approve', 'approve_with_modifications', 'reject']),
});

export const decisionResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  decisionCode: z.string(),
});

export const recordOutcomeBodySchema = z.object({
  monitoredActionId: z.string().uuid(),
  observationCode: z.string().min(1).max(255),
  summary: z.string().min(1).max(10_000),
  effectiveAt: z.string().datetime(),
  measurements: z.array(z.object({
    metricCode: z.string().min(1).max(255),
    measuredValue: z.record(z.unknown()),
    unit: z.string().max(64).nullable().optional(),
  })).max(100).optional(),
  evidence: z.array(z.object({
    evidenceType: z.enum(['execution_record', 'external_system', 'manual_entry', 'other']),
    evidenceReference: z.record(z.unknown()),
  })).max(100).optional(),
});

export const outcomeResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  observationCode: z.string(),
});
