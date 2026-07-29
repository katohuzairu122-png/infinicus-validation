// ABA → OM handoff contract (BUILD-15).
// Carries a decided (approved or approved-with-modifications) approval
// decision and its resulting approved action from Approved Business
// Action to Outcome Monitoring. Approval is distinct from execution — ABA
// declares what was approved, never a record of an executed outcome.
// ABA must not: record outcomes; evaluate outcome success or failure;
// modify downstream Outcome Monitoring or Continuous Learning state;
// create learning updates. Outcome Monitoring holds sole authority over
// observing and evaluating outcomes.
import type { LayerHandoff } from '@infinicus/shared-types';

export const ABA_TO_OM_CONTRACT_VERSION = '1.0.0';

/** approval_decisions/approval_decision_versions statuses eligible for handoff — only decided, non-rejected outcomes. */
export const READY_DECISION_STATUSES = ['approved', 'approved_with_modifications'] as const;
export type ReadyDecisionStatus = (typeof READY_DECISION_STATUSES)[number];

/** approved_business_action.aba_publication_packages.target_layer — the only authorized downstream layer for ABA. */
export const OM_REQUIRED_TARGET_LAYER = 'outcome_monitoring' as const;

export interface ABADecisionRationaleReference {
  rationaleCode: string;
  statement: string;
}

export interface ABAActionStepReference {
  stepNumber: number;
  description: string;
}

export interface ABAControlGateSummary {
  gateCode: string;
  gateType: string;
  status: 'passed' | 'waived';
}

/** Payload of the ABA → OM handoff envelope. Serializable data only. */
export interface ABAToOMHandoffPayload {
  contractVersion: typeof ABA_TO_OM_CONTRACT_VERSION;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  idempotencyKey: string;
  /** approved_business_action.approval_decisions.id */
  decisionId: string;
  /** approved_business_action.approval_decision_versions.id */
  decisionVersionId: string;
  decisionVersion: number;
  decisionStatus: ReadyDecisionStatus;
  /** approved_business_action.approved_actions.id */
  approvedActionId: string;
  /** approved_business_action.approved_action_versions.id */
  approvedActionVersionId: string;
  summary: string;
  rationales: readonly ABADecisionRationaleReference[];
  actionSteps: readonly ABAActionStepReference[];
  controlGates: readonly ABAControlGateSummary[];
  evidenceReferences: readonly string[];
  /** approved_business_action.aba_publication_packages.id */
  abaPublicationPackageId: string;
  targetLayer: typeof OM_REQUIRED_TARGET_LAYER;
  targetBlock: string;
  publishedAt: string;
}

/**
 * The ABA → OM handoff: the canonical CLAUDE.md §8 envelope carrying a
 * decided approval decision and its approved action, ready for Outcome
 * Monitoring to begin observation. correlationId/lineage/status live on
 * the envelope — they are not duplicated inside the payload.
 */
export type ABAToOMHandoff = LayerHandoff<ABAToOMHandoffPayload>;

export interface ABAToOMValidationResult {
  valid: boolean;
  reasons: readonly string[];
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

const MAX_SERIALIZED_BYTES = 512 * 1024;
const MAX_COLLECTION_ENTRIES = 1000;

const CREDENTIAL_LIKE_KEYS = ['password', 'secret', 'apiKey', 'token', 'credential', 'privateKey'];
const DANGEROUS_KEYS = ['__proto__', 'prototype', 'constructor'];
const GATE_STATUSES = new Set(['passed', 'waived']);

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
 * decided (approved or approved-with-modifications) decision and its
 * approved action, targeted exclusively at Outcome Monitoring, carried
 * inside a complete, serializable handoff envelope. Rejects anything that
 * would cross the ABA/OM authority boundary (outcome, evaluation, or
 * learning-update content).
 */
export function validateABAToOMHandoff(value: unknown): ABAToOMValidationResult {
  const reasons: string[] = [];
  const h = value as ABAToOMHandoff | null | undefined;

  if (!h || typeof h !== 'object') {
    return { valid: false, reasons: ['handoff_required'] };
  }

  // Envelope (CLAUDE.md §8)
  for (const field of ['handoffId', 'sourceBlock', 'targetBlock', 'correlationId', 'createdAt'] as const) {
    if (!isNonEmptyString(h[field])) reasons.push(`${field}_required`);
  }
  if (h.sourceLayer !== 'ABA') reasons.push('source_layer_must_be_ABA');
  if (h.targetLayer !== 'OM') reasons.push('target_layer_must_be_OM');
  if (h.status !== 'ready') reasons.push('handoff_status_must_be_ready');
  if (!Array.isArray(h.lineage)) reasons.push('lineage_array_required');

  const p = h.payload as ABAToOMHandoffPayload | undefined;
  if (!p || typeof p !== 'object') {
    reasons.push('payload_required');
    return { valid: false, reasons };
  }

  if (p.contractVersion !== ABA_TO_OM_CONTRACT_VERSION) reasons.push('contract_version_unsupported');
  if (!isNonEmptyString(p.tenantId)) reasons.push('tenant_id_required');
  if (!isNonEmptyString(p.workspaceId)) reasons.push('workspace_id_required');
  if (!isNonEmptyString(p.businessId)) reasons.push('business_id_required');
  if (!isNonEmptyString(p.idempotencyKey)) reasons.push('idempotency_key_required');

  if (!isNonEmptyString(p.decisionId)) reasons.push('decision_id_required');
  if (!isNonEmptyString(p.decisionVersionId)) reasons.push('decision_version_id_required');
  if (!Number.isInteger(p.decisionVersion) || p.decisionVersion < 1) {
    reasons.push('decision_version_invalid');
  }
  if (!READY_DECISION_STATUSES.includes(p.decisionStatus)) {
    reasons.push('decision_not_decided');
  }
  if (!isNonEmptyString(p.approvedActionId)) reasons.push('approved_action_id_required');
  if (!isNonEmptyString(p.approvedActionVersionId)) reasons.push('approved_action_version_id_required');
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

  if (!Array.isArray(p.actionSteps)) {
    reasons.push('action_steps_array_required');
  } else {
    for (const s of p.actionSteps) {
      if (!s || typeof s !== 'object' || !Number.isInteger(s.stepNumber) || !isNonEmptyString(s.description)) {
        reasons.push('malformed_action_step_entry');
        break;
      }
    }
  }

  if (!Array.isArray(p.controlGates)) {
    reasons.push('control_gates_array_required');
  } else {
    for (const g of p.controlGates) {
      if (!g || typeof g !== 'object' || !isNonEmptyString(g.gateCode) || !isNonEmptyString(g.gateType) || !GATE_STATUSES.has(g.status)) {
        reasons.push('malformed_control_gate_entry');
        break;
      }
    }
  }

  if (!Array.isArray(p.evidenceReferences) || p.evidenceReferences.length === 0) {
    reasons.push('missing_evidence');
  }

  if (!isNonEmptyString(p.abaPublicationPackageId)) reasons.push('aba_publication_package_id_required');
  if (p.targetLayer !== OM_REQUIRED_TARGET_LAYER) reasons.push('target_layer_invalid');
  if (!isNonEmptyString(p.targetBlock)) reasons.push('target_block_required');
  if (!isNonEmptyString(p.publishedAt) || Number.isNaN(Date.parse(p.publishedAt))) {
    reasons.push('published_at_invalid');
  }

  // Authority boundary: a decided approval declaration only — never an
  // outcome, an outcome evaluation, or a learning update. ABA-to-OM must
  // preserve this separation explicitly.
  const forbidden = [
    'outcome', 'observedOutcome', 'outcomeRecord',
    'verdict', 'evaluationResult',
    'learningUpdate', 'learningRecord',
    'executionResult', 'executedAt', 'actionTaken',
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
