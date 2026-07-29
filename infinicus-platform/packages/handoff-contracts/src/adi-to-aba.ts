// ADI → ABA handoff contract (BUILD-14).
// Carries a published, governed decision recommendation from AI Decision
// Intelligence to Approved Business Action. A recommendation only — ADI
// never approves its own recommendation, never executes actions, never
// modifies downstream ABA state, never records outcomes, and never creates
// learning updates. ABA holds sole authority over approval and execution.
// This contract preserves that separation explicitly by rejecting any
// approval, execution, outcome, or learning-update content in the payload.
import type { LayerHandoff } from '@infinicus/shared-types';

export const ADI_TO_ABA_CONTRACT_VERSION = '1.0.0';

/** decision_recommendations/decision_recommendation_versions status eligible for handoff — only published. */
export const READY_RECOMMENDATION_STATUS = 'published' as const;

/** ai_decision_intelligence.adi_publication_packages.target_layer — the only authorized downstream layer for ADI. */
export const REQUIRED_TARGET_LAYER = 'approved_business_action' as const;

export interface ADIRationaleReference {
  rationaleCode: string;
  statement: string;
}

export interface ADIImplementationStepReference {
  stepNumber: number;
  description: string;
}

export interface ADIConfidenceSummary {
  confidence: number;
  uncertainties: readonly string[];
  limitations: readonly string[];
  assumptions: readonly string[];
}

export interface ADIRiskSummary {
  alternativeId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

/** Payload of the ADI → ABA handoff envelope. Serializable data only. */
export interface ADIToABAHandoffPayload {
  contractVersion: typeof ADI_TO_ABA_CONTRACT_VERSION;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  idempotencyKey: string;
  /** ai_decision_intelligence.decision_cases.id */
  decisionCaseId: string;
  /** ai_decision_intelligence.decision_recommendations.id */
  recommendationId: string;
  /** ai_decision_intelligence.decision_recommendation_versions.id */
  recommendationVersionId: string;
  recommendationVersion: number;
  recommendationStatus: typeof READY_RECOMMENDATION_STATUS;
  summary: string;
  rationales: readonly ADIRationaleReference[];
  implementationSteps: readonly ADIImplementationStepReference[];
  confidence: ADIConfidenceSummary;
  risks: readonly ADIRiskSummary[];
  evidenceReferences: readonly string[];
  /** ai_decision_intelligence.adi_publication_packages.id */
  adiPublicationPackageId: string;
  targetLayer: typeof REQUIRED_TARGET_LAYER;
  targetBlock: string;
  publishedAt: string;
}

/**
 * The ADI → ABA handoff: the canonical CLAUDE.md §8 envelope carrying a
 * published decision recommendation ready for Approved Business Action
 * review. correlationId/lineage/status live on the envelope — they are not
 * duplicated inside the payload.
 */
export type ADIToABAHandoff = LayerHandoff<ADIToABAHandoffPayload>;

export interface ADIToABAValidationResult {
  valid: boolean;
  reasons: readonly string[];
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;
const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const MAX_SERIALIZED_BYTES = 512 * 1024;
const MAX_COLLECTION_ENTRIES = 1000;

const CREDENTIAL_LIKE_KEYS = ['password', 'secret', 'apiKey', 'token', 'credential', 'privateKey'];
const DANGEROUS_KEYS = ['__proto__', 'prototype', 'constructor'];
const SEVERITIES = new Set(['low', 'medium', 'high', 'critical']);

function collectUnserializable(value: unknown, path: string, reasons: string[]): void {
  if (value === null || value === undefined) return;
  const t = typeof value;
  if (t === 'function' || t === 'symbol' || t === 'bigint') {
    reasons.push(`unserializable_${t}_at_${path}`);
    return;
  }
  if (t !== 'object') return;
  if (
    typeof globalThis !== 'undefined' &&
    (value === globalThis || (globalThis as { window?: unknown }).window === value)
  ) {
    reasons.push(`global_reference_at_${path}`);
    return;
  }
  const ctor = (value as { constructor?: { name?: string } }).constructor?.name;
  if (ctor !== undefined && !['Object', 'Array'].includes(ctor)) {
    reasons.push(`non_plain_object_at_${path}`);
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.includes(key)) {
      reasons.push(`dangerous_key_at_${path}.${key}`);
      continue;
    }
    if (CREDENTIAL_LIKE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      reasons.push(`credential_like_field_at_${path}.${key}`);
      continue;
    }
    collectUnserializable(child, `${path}.${key}`, reasons);
  }
}

/**
 * Runtime validation with explicit rejection reasons. Accepts only a
 * published decision recommendation, targeted exclusively at Approved
 * Business Action, carried inside a complete, serializable handoff
 * envelope. Rejects anything that would cross the ADI/ABA authority
 * boundary (approval, execution, outcome, or learning-update content).
 */
export function validateADIToABAHandoff(value: unknown): ADIToABAValidationResult {
  const reasons: string[] = [];
  const h = value as ADIToABAHandoff | null | undefined;

  if (!h || typeof h !== 'object') {
    return { valid: false, reasons: ['handoff_required'] };
  }

  // Envelope (CLAUDE.md §8)
  for (const field of ['handoffId', 'sourceBlock', 'targetBlock', 'correlationId', 'createdAt'] as const) {
    if (!isNonEmptyString(h[field])) reasons.push(`${field}_required`);
  }
  if (h.sourceLayer !== 'ADI') reasons.push('source_layer_must_be_ADI');
  if (h.targetLayer !== 'ABA') reasons.push('target_layer_must_be_ABA');
  if (h.status !== 'ready') reasons.push('handoff_status_must_be_ready');
  if (!Array.isArray(h.lineage)) reasons.push('lineage_array_required');

  const p = h.payload as ADIToABAHandoffPayload | undefined;
  if (!p || typeof p !== 'object') {
    reasons.push('payload_required');
    return { valid: false, reasons };
  }

  if (p.contractVersion !== ADI_TO_ABA_CONTRACT_VERSION) reasons.push('contract_version_unsupported');
  if (!isNonEmptyString(p.tenantId)) reasons.push('tenant_id_required');
  if (!isNonEmptyString(p.workspaceId)) reasons.push('workspace_id_required');
  if (!isNonEmptyString(p.businessId)) reasons.push('business_id_required');
  if (!isNonEmptyString(p.idempotencyKey)) reasons.push('idempotency_key_required');

  if (!isNonEmptyString(p.decisionCaseId)) reasons.push('decision_case_id_required');
  if (!isNonEmptyString(p.recommendationId)) reasons.push('recommendation_id_required');
  if (!isNonEmptyString(p.recommendationVersionId)) reasons.push('recommendation_version_id_required');
  if (!Number.isInteger(p.recommendationVersion) || p.recommendationVersion < 1) {
    reasons.push('recommendation_version_invalid');
  }
  if (p.recommendationStatus !== READY_RECOMMENDATION_STATUS) {
    reasons.push('recommendation_not_published');
  }
  if (!isNonEmptyString(p.summary)) reasons.push('summary_required');

  if (!Array.isArray(p.rationales) || p.rationales.length === 0) {
    reasons.push('rationales_required');
  } else if (p.rationales.length > MAX_COLLECTION_ENTRIES) {
    reasons.push('rationales_collection_too_large');
  } else {
    for (const r of p.rationales) {
      if (!r || typeof r !== 'object' || !isNonEmptyString(r.rationaleCode) || !isNonEmptyString(r.statement)) {
        reasons.push('malformed_rationale_entry');
        break;
      }
    }
  }

  if (!Array.isArray(p.implementationSteps)) {
    reasons.push('implementation_steps_array_required');
  } else {
    for (const s of p.implementationSteps) {
      if (!s || typeof s !== 'object' || !Number.isInteger(s.stepNumber) || !isNonEmptyString(s.description)) {
        reasons.push('malformed_implementation_step_entry');
        break;
      }
    }
  }

  const c = p.confidence;
  if (!c || typeof c !== 'object') {
    reasons.push('confidence_required');
  } else {
    if (!isFiniteNumber(c.confidence) || c.confidence < 0 || c.confidence > 1) {
      reasons.push('confidence_score_invalid');
    }
    if (!Array.isArray(c.uncertainties)) reasons.push('confidence_uncertainties_array_required');
    if (!Array.isArray(c.limitations)) reasons.push('confidence_limitations_array_required');
    if (!Array.isArray(c.assumptions)) reasons.push('confidence_assumptions_array_required');
  }

  if (!Array.isArray(p.risks)) {
    reasons.push('risks_array_required');
  } else {
    for (const r of p.risks) {
      if (!r || typeof r !== 'object' || !isNonEmptyString(r.alternativeId) || !SEVERITIES.has(r.severity) || !isNonEmptyString(r.description)) {
        reasons.push('malformed_risk_entry');
        break;
      }
    }
  }

  if (!Array.isArray(p.evidenceReferences) || p.evidenceReferences.length === 0) {
    reasons.push('missing_evidence');
  }

  if (!isNonEmptyString(p.adiPublicationPackageId)) reasons.push('adi_publication_package_id_required');
  if (p.targetLayer !== REQUIRED_TARGET_LAYER) reasons.push('target_layer_invalid');
  if (!isNonEmptyString(p.targetBlock)) reasons.push('target_block_required');
  if (!isNonEmptyString(p.publishedAt) || Number.isNaN(Date.parse(p.publishedAt))) {
    reasons.push('published_at_invalid');
  }

  // Authority boundary: a recommendation only — never approval, execution,
  // outcome, or learning-update content. ADI-to-ABA must preserve this
  // separation explicitly.
  const forbidden = [
    'approval', 'approved', 'approvedBy', 'approvalStatus',
    'executionResult', 'execute', 'executedAt', 'actionTaken',
    'outcome', 'observedOutcome', 'outcomeRecord',
    'learningUpdate', 'learningRecord',
  ];
  for (const key of forbidden) {
    if (key in (p as unknown as Record<string, unknown>)) reasons.push(`forbidden_field_${key}`);
  }

  collectUnserializable(h, 'handoff', reasons);

  let serializedBytes = 0;
  try {
    // Character-length approximation of the serialized byte size (no
    // TextEncoder/Buffer dependency) — a safe, slightly conservative proxy
    // for the 512 KiB soft limit, exact for ASCII payloads.
    serializedBytes = JSON.stringify(h).length;
  } catch {
    reasons.push('payload_not_serializable');
  }
  if (serializedBytes > MAX_SERIALIZED_BYTES) reasons.push('payload_too_large');

  return { valid: reasons.length === 0, reasons };
}
