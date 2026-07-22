// BI → DT handoff contract (BUILD-12).
// Carries a validated, published Business Intelligence publication package
// into the Business Digital Twin intake boundary. Aligned with
// business_intelligence.bi_publication_packages and the canonical
// LayerHandoff<TPayload> envelope. BI publishes; DT builds its own state
// representation independently — this contract carries the intake
// reference and BI evidence only, never DT/Simulation/ADI conclusions.
import type { LayerHandoff } from '@infinicus/shared-types';

export const BI_TO_DT_CONTRACT_VERSION = '1.0.0';

/** Statuses a BI publication package may carry; only these are intake-able. */
export const BI_TO_DT_INTAKABLE_STATUSES = ['ready', 'dispatched'] as const;
export type BIToDTIntakableStatus = (typeof BI_TO_DT_INTAKABLE_STATUSES)[number];

export interface BIPublicationSourceReference {
  packageCode: string;
  payloadReference: Record<string, string | number | boolean | null>;
}

/** A single named metric evidence entry carried into DT state variables. */
export interface BIMetricEvidence {
  metricCode: string;
  value: number;
  unit: string | null;
}

/** A single named finding evidence entry. */
export interface BIFindingEvidence {
  findingCode: string;
  summary: string;
  confidence: number;
}

/** A single named risk evidence entry. */
export interface BIRiskEvidence {
  riskCode: string;
  severity: string;
  likelihood: number | null;
}

/** A single named constraint evidence entry (governs DT twin_constraints). */
export interface BIConstraintEvidence {
  constraintCode: string;
  operator: string;
  operand: string | number | boolean | null;
}

/** A single named assumption evidence entry (governs DT twin_assumptions). */
export interface BIAssumptionEvidence {
  assumptionCode: string;
  statement: string;
  source: string;
}

/** Quality/freshness/reliability evidence, never fabricated. */
export interface BIQualityEvidence {
  qualityScore: number | null;
  freshnessSeconds: number | null;
  reliabilityScore: number | null;
}

/** Payload of the BI → DT handoff envelope. Serializable data only. */
export interface BIToDTHandoffPayload {
  contractVersion: typeof BI_TO_DT_CONTRACT_VERSION;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  /** business_intelligence.bi_publication_packages.id */
  biPublicationPackageId: string;
  /** business_intelligence.insight_packages.id */
  insightPackageId: string;
  insightVersion: number;
  packageStatus: BIToDTIntakableStatus;
  targetBlock: string;
  periodStart: string;
  periodEnd: string;
  source: BIPublicationSourceReference;
  metrics: readonly BIMetricEvidence[];
  findings: readonly BIFindingEvidence[];
  risks: readonly BIRiskEvidence[];
  constraints: readonly BIConstraintEvidence[];
  assumptions: readonly BIAssumptionEvidence[];
  quality: BIQualityEvidence;
  lineage: readonly string[];
  schemaVersion: string;
  idempotencyKey: string;
}

/**
 * The BI → DT handoff: the canonical CLAUDE.md §8 envelope carrying an
 * intake-ready publication-package reference plus BI evidence. The
 * envelope-level correlationId/lineage/status are distinct from the
 * payload's own `lineage` field (source-artifact lineage references), which
 * is required content per BUILD-12 spec §8.
 */
export type BIToDTHandoff = LayerHandoff<BIToDTHandoffPayload>;

export interface BIToDTValidationResult {
  valid: boolean;
  reasons: readonly string[];
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

const MAX_SERIALIZED_BYTES = 512 * 1024;
const MAX_FREE_TEXT_CHARS = 8000;
const MAX_COLLECTION_ENTRIES = 1000;

const CREDENTIAL_LIKE_KEYS = ['password', 'secret', 'apiKey', 'token', 'credential', 'privateKey'];

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
    if (CREDENTIAL_LIKE_KEYS.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
      reasons.push(`credential_like_field_at_${path}.${key}`);
      continue;
    }
    collectUnserializable(child, `${path}.${key}`, reasons);
  }
}

/**
 * Runtime validation with explicit rejection reasons. Accepts only an
 * intake-eligible (ready/dispatched) BI publication package, carrying
 * governed BI evidence, inside a complete, serializable handoff envelope.
 */
export function validateBIToDTHandoff(value: unknown): BIToDTValidationResult {
  const reasons: string[] = [];
  const h = value as BIToDTHandoff | null | undefined;

  if (!h || typeof h !== 'object') {
    return { valid: false, reasons: ['handoff_required'] };
  }

  for (const field of ['handoffId', 'sourceBlock', 'targetBlock', 'correlationId', 'createdAt'] as const) {
    if (!isNonEmptyString(h[field])) reasons.push(`${field}_required`);
  }
  if (h.sourceLayer !== 'BI') reasons.push('source_layer_must_be_BI');
  if (h.targetLayer !== 'DT') reasons.push('target_layer_must_be_DT');
  if (h.status !== 'ready') reasons.push('handoff_status_must_be_ready');
  if (!Array.isArray(h.lineage)) reasons.push('lineage_array_required');

  const p = h.payload as BIToDTHandoffPayload | undefined;
  if (!p || typeof p !== 'object') {
    reasons.push('payload_required');
    return { valid: false, reasons };
  }

  if (p.contractVersion !== BI_TO_DT_CONTRACT_VERSION) reasons.push('contract_version_unsupported');
  if (!isNonEmptyString(p.tenantId)) reasons.push('tenant_id_required');
  if (!isNonEmptyString(p.workspaceId)) reasons.push('workspace_id_required');
  if (!isNonEmptyString(p.businessId)) reasons.push('business_id_required');
  if (!isNonEmptyString(p.biPublicationPackageId)) reasons.push('bi_publication_package_id_required');
  if (!isNonEmptyString(p.insightPackageId)) reasons.push('insight_package_id_required');
  if (!Number.isInteger(p.insightVersion) || p.insightVersion < 1) reasons.push('insight_version_invalid');
  if (!(BI_TO_DT_INTAKABLE_STATUSES as readonly string[]).includes(p.packageStatus)) {
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
  if (!p.source || typeof p.source !== 'object' || !isNonEmptyString(p.source.packageCode)) {
    reasons.push('source_reference_required');
  }

  if (!Array.isArray(p.metrics)) reasons.push('metrics_array_required');
  else if (p.metrics.length > MAX_COLLECTION_ENTRIES) reasons.push('metrics_collection_too_large');
  else {
    for (const m of p.metrics) {
      if (!m || typeof m !== 'object' || !isNonEmptyString(m.metricCode) || typeof m.value !== 'number' || !Number.isFinite(m.value)) {
        reasons.push('malformed_metric_entry');
        break;
      }
    }
  }

  if (!Array.isArray(p.findings)) reasons.push('findings_array_required');
  else if (p.findings.length > MAX_COLLECTION_ENTRIES) reasons.push('findings_collection_too_large');

  if (!Array.isArray(p.risks)) reasons.push('risks_array_required');
  if (!Array.isArray(p.constraints)) reasons.push('constraints_array_required');
  if (!Array.isArray(p.assumptions)) reasons.push('assumptions_array_required');
  if (!Array.isArray(p.lineage)) reasons.push('payload_lineage_array_required');
  else if (p.lineage.length === 0) reasons.push('missing_evidence_lineage');

  if (!p.quality || typeof p.quality !== 'object') {
    reasons.push('quality_required');
  } else {
    for (const key of ['qualityScore', 'reliabilityScore'] as const) {
      const v = p.quality[key];
      if (v !== null && (typeof v !== 'number' || v < 0 || v > 1)) reasons.push(`quality_${key}_invalid`);
    }
    if (p.quality.freshnessSeconds !== null && (typeof p.quality.freshnessSeconds !== 'number' || p.quality.freshnessSeconds < 0)) {
      reasons.push('quality_freshness_invalid');
    }
  }

  if (!isNonEmptyString(p.schemaVersion)) reasons.push('schema_version_required');
  if (!isNonEmptyString(p.idempotencyKey)) reasons.push('idempotency_key_required');

  const forbidden = [
    'simulationRun',
    'simulationOutput',
    'adiDecision',
    'adiRecommendation',
    'approval',
    'executionResult',
  ];
  for (const key of forbidden) {
    if (key in (p as unknown as Record<string, unknown>)) reasons.push(`forbidden_field_${key}`);
  }

  for (const [key, val] of Object.entries(p as unknown as Record<string, unknown>)) {
    if (typeof val === 'string' && val.length > MAX_FREE_TEXT_CHARS) {
      reasons.push(`free_text_too_large_${key}`);
    }
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
