// DAL → BO handoff contract (BUILD-08).
// Carries a validated, published Data Acquisition publication package from
// the DAL layer to Business Operations. Aligned with the canonical
// `da.data.published` event (packageId/targetLayer/targetBlock/recordCount,
// v1.0) and Stage 2B `data_acquisition.publication_packages`. DAL publishes;
// BO consumes in a later authorized build — no BO logic lives here.
import type { LayerHandoff } from '@infinicus/shared-types';

export const DAL_TO_BO_CONTRACT_VERSION = '1.0.0';

/** Statuses a publication package may carry; only 'published' is handoff-able. */
export const PUBLISHABLE_STATUS = 'published';

/** Source reference for the published data (never raw credentials). */
export interface PublicationSourceReference {
  sourceSystem: string;
  /** e.g. data_acquisition.publication_packages.data_reference keys */
  dataReference: Record<string, string | number | boolean | null>;
}

/** Quality summary exactly as scored by Stage 2B — never fabricated. */
export interface PublicationQualitySummary {
  /** data_quality_scores overall score, [0,1]; null when unscored. */
  qualityScore: number | null;
  /** source_reliability_scores overall score, [0,1]; null when unscored. */
  reliabilityScore: number | null;
}

/** Payload of the DAL → BO handoff envelope. Serializable data only. */
export interface DALToBOHandoffPayload {
  contractVersion: typeof DAL_TO_BO_CONTRACT_VERSION;
  tenantId: string;
  workspaceId: string;
  businessId: string | null;
  /** data_acquisition.publication_packages.id */
  publicationPackageId: string;
  packageType: string;
  packageVersion: string;
  targetLayer: 'business_operations';
  targetBlock: string;
  /** publication_packages.status — must be 'published'. */
  status: typeof PUBLISHABLE_STATUS;
  publishedAt: string;
  recordCount: number;
  source: PublicationSourceReference;
  /** detected_schemas reference when available; null when absent. */
  schemaReferenceId: string | null;
  quality: PublicationQualitySummary;
  /** provenance_records ids preserved from publication_packages. */
  provenanceReferenceIds: readonly string[];
  /** consent/sensitivity handling references when the package carries them. */
  consentReferenceIds: readonly string[];
  limitations: readonly string[];
  warnings: readonly string[];
  /** Established idempotency mechanism: replaying the same key is a no-op. */
  idempotencyKey: string;
}

/**
 * The DAL → BO handoff: the canonical CLAUDE.md §8 envelope carrying a
 * published-package payload. correlationId/lineage/status live on the
 * envelope — they are not duplicated inside the payload.
 */
export type DALToBOHandoff = LayerHandoff<DALToBOHandoffPayload>;

export interface DALToBOValidationResult {
  valid: boolean;
  reasons: readonly string[];
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;
const isScoreOrNull = (v: unknown): boolean =>
  v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1);

const CREDENTIAL_KEY_PATTERN = /password|secret|api[_-]?key|token|credential/i;

function collectUnserializable(value: unknown, path: string, reasons: string[]): void {
  if (value === null || value === undefined) return;
  const t = typeof value;
  if (t === 'function') {
    reasons.push(`unserializable_function_at_${path}`);
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
    if (CREDENTIAL_KEY_PATTERN.test(key)) reasons.push(`credential_like_key_at_${path}.${key}`);
    collectUnserializable(child, `${path}.${key}`, reasons);
  }
}

/**
 * Runtime validation with explicit rejection reasons. Accepts only a
 * successfully validated, published DAL publication package inside a
 * complete, serializable, credential-free handoff envelope.
 */
export function validateDALToBOHandoff(value: unknown): DALToBOValidationResult {
  const reasons: string[] = [];
  const h = value as DALToBOHandoff | null | undefined;

  if (!h || typeof h !== 'object') {
    return { valid: false, reasons: ['handoff_required'] };
  }

  // Envelope (CLAUDE.md §8)
  for (const field of ['handoffId', 'sourceBlock', 'targetBlock', 'correlationId', 'createdAt'] as const) {
    if (!isNonEmptyString(h[field])) reasons.push(`${field}_required`);
  }
  if (h.sourceLayer !== 'DAL') reasons.push('source_layer_must_be_DAL');
  if (h.targetLayer !== 'BO') reasons.push('target_layer_must_be_BO');
  if (h.status !== 'ready') reasons.push('handoff_status_must_be_ready');
  if (!Array.isArray(h.lineage)) reasons.push('lineage_array_required');

  const p = h.payload as DALToBOHandoffPayload | undefined;
  if (!p || typeof p !== 'object') {
    reasons.push('payload_required');
    return { valid: false, reasons };
  }

  if (p.contractVersion !== DAL_TO_BO_CONTRACT_VERSION) reasons.push('contract_version_unsupported');

  // Ownership — tenant/workspace mandatory; business explicit (id or null,
  // mirroring publication_packages.business_id nullability).
  if (!isNonEmptyString(p.tenantId)) reasons.push('tenant_id_required');
  if (!isNonEmptyString(p.workspaceId)) reasons.push('workspace_id_required');
  if (p.businessId !== null && !isNonEmptyString(p.businessId)) reasons.push('business_id_invalid');

  if (!isNonEmptyString(p.publicationPackageId)) reasons.push('publication_package_id_required');
  if (!isNonEmptyString(p.packageType)) reasons.push('package_type_required');
  if (!isNonEmptyString(p.packageVersion)) reasons.push('package_version_required');
  if (p.targetLayer !== 'business_operations') reasons.push('target_layer_must_be_business_operations');
  if (!isNonEmptyString(p.targetBlock)) reasons.push('payload_target_block_required');

  // Only successfully validated + published output crosses this boundary.
  if (p.status !== PUBLISHABLE_STATUS) reasons.push('publication_status_must_be_published');
  if (!isNonEmptyString(p.publishedAt) || Number.isNaN(Date.parse(p.publishedAt))) {
    reasons.push('published_at_invalid');
  }
  if (!Number.isInteger(p.recordCount) || p.recordCount < 0) reasons.push('record_count_invalid');

  if (!p.source || typeof p.source !== 'object' || !isNonEmptyString(p.source.sourceSystem)) {
    reasons.push('source_reference_required');
  } else if (!p.source.dataReference || typeof p.source.dataReference !== 'object') {
    reasons.push('source_data_reference_required');
  }

  if (p.schemaReferenceId !== null && !isNonEmptyString(p.schemaReferenceId)) {
    reasons.push('schema_reference_invalid');
  }

  if (!p.quality || typeof p.quality !== 'object') {
    reasons.push('quality_summary_required');
  } else {
    if (!isScoreOrNull(p.quality.qualityScore)) reasons.push('quality_score_invalid');
    if (!isScoreOrNull(p.quality.reliabilityScore)) reasons.push('reliability_score_invalid');
  }

  if (!Array.isArray(p.provenanceReferenceIds)) reasons.push('provenance_reference_ids_required');
  if (!Array.isArray(p.consentReferenceIds)) reasons.push('consent_reference_ids_required');
  if (!Array.isArray(p.limitations)) reasons.push('limitations_array_required');
  if (!Array.isArray(p.warnings)) reasons.push('warnings_array_required');
  if (!isNonEmptyString(p.idempotencyKey)) reasons.push('idempotency_key_required');

  // No Business Operations logic or decisions inside the handoff.
  const forbidden = ['order', 'invoice', 'approval', 'recommendation', 'businessAction'];
  for (const key of forbidden) {
    if (key in (p as unknown as Record<string, unknown>)) reasons.push(`forbidden_field_${key}`);
  }

  collectUnserializable(h, 'handoff', reasons);

  return { valid: reasons.length === 0, reasons };
}
