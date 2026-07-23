import { z } from 'zod';

export const businessSummarySchema = z.object({
  id: z.string().uuid(),
  legalName: z.string(),
  businessCode: z.string(),
  status: z.string(),
  industry: z.string().nullable(),
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
  reviewCode: z.string().min(1),
  summary: z.string().min(1),
  approverUserId: z.string().uuid(),
  assignmentCode: z.string().min(1),
  decisionCode: z.string().min(1),
  outcome: z.enum(['approve', 'approve_with_modifications', 'reject']),
});

export const decisionResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  decisionCode: z.string(),
});

export const recordOutcomeBodySchema = z.object({
  monitoredActionId: z.string().uuid(),
  observationCode: z.string().min(1),
  summary: z.string().min(1),
  effectiveAt: z.string().datetime(),
  measurements: z.array(z.object({
    metricCode: z.string().min(1),
    measuredValue: z.record(z.unknown()),
    unit: z.string().nullable().optional(),
  })).optional(),
  evidence: z.array(z.object({
    evidenceType: z.enum(['execution_record', 'external_system', 'manual_entry', 'other']),
    evidenceReference: z.record(z.unknown()),
  })).optional(),
});

export const outcomeResponseSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  observationCode: z.string(),
});
