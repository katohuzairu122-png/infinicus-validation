// CL → DAL handoff contract (BUILD-17).
// Carries an approved, governed improvement proposal — the closing link in
// the platform's learning loop, feeding back from Continuous Learning to
// Data Acquisition. Learning may propose governed changes but must never
// silently mutate frozen historical evidence, decisions, approvals, or
// outcomes, and must never execute a change itself. CL declares what was
// approved for future data acquisition activity to consider; it never
// applies a configuration change, never records a data-acquisition
// outcome, and never overrides an upstream decision. Data Acquisition
// holds sole authority over whether and how to act on the feedback.
import type { LayerHandoff } from '@infinicus/shared-types';

export const CL_FEEDBACK_CONTRACT_VERSION = '1.0.0';

/** improvement_proposals/improvement_proposal_versions statuses eligible for handoff — only decided and approved. */
export const READY_PROPOSAL_STATUSES = ['approved'] as const;
export type ReadyProposalStatus = (typeof READY_PROPOSAL_STATUSES)[number];

/** continuous_learning.cl_feedback_packages.target_layer — the only authorized downstream layer for CL. */
export const DA_REQUIRED_TARGET_LAYER = 'data_acquisition' as const;

export interface CLLessonReference {
  lessonCode: string;
  statement: string;
}

export interface CLImpactReference {
  impactType: string;
  magnitude: unknown;
}

export interface CLRiskReference {
  riskCode: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/** Payload of the CL → DAL handoff envelope. Serializable data only. */
export interface CLFeedbackHandoffPayload {
  contractVersion: typeof CL_FEEDBACK_CONTRACT_VERSION;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  idempotencyKey: string;
  /** continuous_learning.improvement_proposals.id */
  improvementProposalId: string;
  /** continuous_learning.improvement_proposal_versions.id */
  proposalVersionId: string;
  proposalVersion: number;
  proposalStatus: ReadyProposalStatus;
  summary: string;
  lessons: readonly CLLessonReference[];
  impacts: readonly CLImpactReference[];
  risks: readonly CLRiskReference[];
  evidenceReferences: readonly string[];
  /** continuous_learning.cl_feedback_packages.id */
  clFeedbackPackageId: string;
  targetLayer: typeof DA_REQUIRED_TARGET_LAYER;
  targetBlock: string;
  publishedAt: string;
}

/**
 * The CL → DAL handoff: the canonical CLAUDE.md §8 envelope carrying an
 * approved improvement proposal, ready for Data Acquisition to consider.
 * correlationId/lineage/status live on the envelope — they are not
 * duplicated inside the payload.
 */
export type CLFeedbackHandoff = LayerHandoff<CLFeedbackHandoffPayload>;

/** @deprecated retained for backward compatibility with the pre-BUILD-17 placeholder name */
export type CLToDALHandoff = CLFeedbackHandoff;

export interface CLFeedbackValidationResult {
  valid: boolean;
  reasons: readonly string[];
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

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
 * Runtime validation with explicit rejection reasons. Accepts only an
 * approved (decided) improvement proposal, targeted exclusively at Data
 * Acquisition, carried inside a complete, serializable handoff envelope.
 * Rejects anything that would cross the CL/DA authority boundary (a
 * directly-applied configuration change, an execution result, or a
 * data-acquisition outcome record).
 */
export function validateCLFeedbackHandoff(value: unknown): CLFeedbackValidationResult {
  const reasons: string[] = [];
  const h = value as CLFeedbackHandoff | null | undefined;

  if (!h || typeof h !== 'object') {
    return { valid: false, reasons: ['handoff_required'] };
  }

  // Envelope (CLAUDE.md §8)
  for (const field of ['handoffId', 'sourceBlock', 'targetBlock', 'correlationId', 'createdAt'] as const) {
    if (!isNonEmptyString(h[field])) reasons.push(`${field}_required`);
  }
  if (h.sourceLayer !== 'CL') reasons.push('source_layer_must_be_CL');
  if (h.targetLayer !== 'DAL') reasons.push('target_layer_must_be_DAL');
  if (h.status !== 'ready') reasons.push('handoff_status_must_be_ready');
  if (!Array.isArray(h.lineage)) reasons.push('lineage_array_required');

  const p = h.payload as CLFeedbackHandoffPayload | undefined;
  if (!p || typeof p !== 'object') {
    reasons.push('payload_required');
    return { valid: false, reasons };
  }

  if (p.contractVersion !== CL_FEEDBACK_CONTRACT_VERSION) reasons.push('contract_version_unsupported');
  if (!isNonEmptyString(p.tenantId)) reasons.push('tenant_id_required');
  if (!isNonEmptyString(p.workspaceId)) reasons.push('workspace_id_required');
  if (!isNonEmptyString(p.businessId)) reasons.push('business_id_required');
  if (!isNonEmptyString(p.idempotencyKey)) reasons.push('idempotency_key_required');

  if (!isNonEmptyString(p.improvementProposalId)) reasons.push('improvement_proposal_id_required');
  if (!isNonEmptyString(p.proposalVersionId)) reasons.push('proposal_version_id_required');
  if (!Number.isInteger(p.proposalVersion) || p.proposalVersion < 1) {
    reasons.push('proposal_version_invalid');
  }
  if (!READY_PROPOSAL_STATUSES.includes(p.proposalStatus)) {
    reasons.push('proposal_not_approved');
  }
  if (!isNonEmptyString(p.summary)) reasons.push('summary_required');

  if (!Array.isArray(p.lessons)) {
    reasons.push('lessons_array_required');
  } else if (p.lessons.length > MAX_COLLECTION_ENTRIES) {
    reasons.push('lessons_collection_too_large');
  } else {
    for (const l of p.lessons) {
      if (!l || typeof l !== 'object' || !isNonEmptyString(l.lessonCode) || !isNonEmptyString(l.statement)) {
        reasons.push('malformed_lesson_entry');
        break;
      }
    }
  }

  if (!Array.isArray(p.impacts) || p.impacts.length === 0) {
    reasons.push('impacts_required');
  } else {
    for (const i of p.impacts) {
      if (!i || typeof i !== 'object' || !isNonEmptyString(i.impactType) || !('magnitude' in i)) {
        reasons.push('malformed_impact_entry');
        break;
      }
    }
  }

  if (!Array.isArray(p.risks)) {
    reasons.push('risks_array_required');
  } else {
    for (const r of p.risks) {
      if (!r || typeof r !== 'object' || !isNonEmptyString(r.riskCode) || !isNonEmptyString(r.description) || !SEVERITIES.has(r.severity)) {
        reasons.push('malformed_risk_entry');
        break;
      }
    }
  }

  if (!Array.isArray(p.evidenceReferences) || p.evidenceReferences.length === 0) {
    reasons.push('missing_evidence');
  }

  if (!isNonEmptyString(p.clFeedbackPackageId)) reasons.push('cl_feedback_package_id_required');
  if (p.targetLayer !== DA_REQUIRED_TARGET_LAYER) reasons.push('target_layer_invalid');
  if (!isNonEmptyString(p.targetBlock)) reasons.push('target_block_required');
  if (!isNonEmptyString(p.publishedAt) || Number.isNaN(Date.parse(p.publishedAt))) {
    reasons.push('published_at_invalid');
  }

  // Authority boundary: an approved change declaration only — never a
  // directly-applied configuration change, an execution result, or a
  // data-acquisition outcome record. CL-to-DAL must preserve this
  // separation explicitly; Data Acquisition decides whether and how to
  // act on the feedback.
  const forbidden = [
    'configOverride', 'appliedChange', 'connectorConfigChange', 'collectionScheduleOverride',
    'executionResult', 'executedAt', 'actionTaken',
    'outcome', 'observedOutcome',
    'decisionOverride', 'approvalOverride',
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
