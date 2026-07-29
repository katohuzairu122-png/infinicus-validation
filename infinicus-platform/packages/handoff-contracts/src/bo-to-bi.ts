// BO → BI handoff contract (BUILD-09).
// Carries a validated, published Business Operations publication package
// into the Business Intelligence intake boundary. Aligned with
// business_operations.bo_publication_packages and the canonical
// LayerHandoff<TPayload> envelope. BO publishes; BI performs its own
// analysis independently — this contract carries the intake reference
// only, never BI conclusions.
import type { LayerHandoff } from '@infinicus/shared-types';

export const BO_TO_BI_CONTRACT_VERSION = '1.0.0';

/** Statuses a BO publication package may carry; only these are intake-able. */
export const INTAKABLE_STATUSES = ['ready', 'dispatched'] as const;
export type IntakableStatus = (typeof INTAKABLE_STATUSES)[number];

export interface BOPublicationSourceReference {
  packageCode: string;
  payloadReference: Record<string, string | number | boolean | null>;
}

/** Payload of the BO → BI handoff envelope. Serializable data only. */
export interface BOToBIHandoffPayload {
  contractVersion: typeof BO_TO_BI_CONTRACT_VERSION;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  /** business_operations.bo_publication_packages.id */
  boPublicationPackageId: string;
  packageStatus: IntakableStatus;
  targetBlock: string;
  periodStart: string;
  periodEnd: string;
  recordCount: number;
  source: BOPublicationSourceReference;
  schemaVersion: string;
  idempotencyKey: string;
}

/**
 * The BO → BI handoff: the canonical CLAUDE.md §8 envelope carrying an
 * intake-ready publication-package reference. correlationId/lineage/status
 * live on the envelope — they are not duplicated inside the payload.
 */
export type BOToBIHandoff = LayerHandoff<BOToBIHandoffPayload>;

export interface BOToBIValidationResult {
  valid: boolean;
  reasons: readonly string[];
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

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
    collectUnserializable(child, `${path}.${key}`, reasons);
  }
}

/**
 * Runtime validation with explicit rejection reasons. Accepts only an
 * intake-eligible (ready/dispatched) BO publication package inside a
 * complete, serializable handoff envelope.
 */
export function validateBOToBIHandoff(value: unknown): BOToBIValidationResult {
  const reasons: string[] = [];
  const h = value as BOToBIHandoff | null | undefined;

  if (!h || typeof h !== 'object') {
    return { valid: false, reasons: ['handoff_required'] };
  }

  for (const field of ['handoffId', 'sourceBlock', 'targetBlock', 'correlationId', 'createdAt'] as const) {
    if (!isNonEmptyString(h[field])) reasons.push(`${field}_required`);
  }
  if (h.sourceLayer !== 'BO') reasons.push('source_layer_must_be_BO');
  if (h.targetLayer !== 'BI') reasons.push('target_layer_must_be_BI');
  if (h.status !== 'ready') reasons.push('handoff_status_must_be_ready');
  if (!Array.isArray(h.lineage)) reasons.push('lineage_array_required');

  const p = h.payload as BOToBIHandoffPayload | undefined;
  if (!p || typeof p !== 'object') {
    reasons.push('payload_required');
    return { valid: false, reasons };
  }

  if (p.contractVersion !== BO_TO_BI_CONTRACT_VERSION) reasons.push('contract_version_unsupported');
  if (!isNonEmptyString(p.tenantId)) reasons.push('tenant_id_required');
  if (!isNonEmptyString(p.workspaceId)) reasons.push('workspace_id_required');
  if (!isNonEmptyString(p.businessId)) reasons.push('business_id_required');
  if (!isNonEmptyString(p.boPublicationPackageId)) reasons.push('bo_publication_package_id_required');
  if (!(INTAKABLE_STATUSES as readonly string[]).includes(p.packageStatus)) {
    reasons.push('package_status_not_intakable');
  }
  if (!isNonEmptyString(p.targetBlock)) reasons.push('target_block_required');
  if (!isNonEmptyString(p.periodStart) || Number.isNaN(Date.parse(p.periodStart))) {
    reasons.push('period_start_invalid');
  }
  if (!isNonEmptyString(p.periodEnd) || Number.isNaN(Date.parse(p.periodEnd))) {
    reasons.push('period_end_invalid');
  }
  if (
    isNonEmptyString(p.periodStart) &&
    isNonEmptyString(p.periodEnd) &&
    !Number.isNaN(Date.parse(p.periodStart)) &&
    !Number.isNaN(Date.parse(p.periodEnd)) &&
    Date.parse(p.periodEnd) <= Date.parse(p.periodStart)
  ) {
    reasons.push('period_order_invalid');
  }
  if (!Number.isInteger(p.recordCount) || p.recordCount < 0) reasons.push('record_count_invalid');
  if (!p.source || typeof p.source !== 'object' || !isNonEmptyString(p.source.packageCode)) {
    reasons.push('source_reference_required');
  }
  if (!isNonEmptyString(p.schemaVersion)) reasons.push('schema_version_required');
  if (!isNonEmptyString(p.idempotencyKey)) reasons.push('idempotency_key_required');

  const forbidden = ['finding', 'insight', 'recommendation', 'analysisResult'];
  for (const key of forbidden) {
    if (key in (p as unknown as Record<string, unknown>)) reasons.push(`forbidden_field_${key}`);
  }

  collectUnserializable(h, 'handoff', reasons);

  return { valid: reasons.length === 0, reasons };
}
