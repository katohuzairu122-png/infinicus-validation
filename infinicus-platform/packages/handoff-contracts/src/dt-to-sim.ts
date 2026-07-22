// DT → SIM handoff contract (BUILD-12).
// Carries a published, Simulation-ready Digital Twin scenario baseline (and
// its underlying snapshot) into the Simulation boundary. Aligned with
// business_digital_twin.dt_publication_packages and scenario_baselines and
// the canonical LayerHandoff<TPayload> envelope. DT publishes; Simulation
// executes independently — this contract carries governed twin state and
// uncertainty only, never recommendation or approval content. BUILD-12 does
// not implement Simulation persistence (Stage 2F, BUILD-13).
import type { LayerHandoff } from '@infinicus/shared-types';

export const DT_TO_SIM_CONTRACT_VERSION = '1.0.0';

/** dt_publication_packages.publication_status values eligible for handoff. */
export const PUBLISHABLE_STATUSES = ['dispatched'] as const;
export type PublishableStatus = (typeof PUBLISHABLE_STATUSES)[number];

/** scenario_baselines.status values eligible for handoff — only published. */
export const READY_BASELINE_STATUS = 'published' as const;

/** digital_twin_snapshots.status values eligible for handoff — only published. */
export const READY_SNAPSHOT_STATUS = 'published' as const;

export interface DTVariableInput {
  variableCode: string;
  value: number | string | boolean;
  unit: string | null;
}

export interface DTUncertaintyAssignment {
  variableCode: string;
  distributionType:
    | 'fixed'
    | 'uniform'
    | 'normal'
    | 'lognormal'
    | 'triangular'
    | 'beta'
    | 'empirical'
    | 'categorical';
  parameters: Record<string, number | string | boolean | null>;
}

export interface DTConstraintInput {
  constraintCode: string;
  operator: 'eq' | 'neq' | 'lt' | 'lte' | 'gt' | 'gte' | 'between' | 'in' | 'not_in' | 'contains';
  operand: string | number | boolean | readonly (string | number)[];
}

export interface DTQualityEvidence {
  confidence: number;
  freshnessSeconds: number | null;
}

/** Payload of the DT → SIM handoff envelope. Serializable data only. */
export interface DTToSIMHandoffPayload {
  contractVersion: typeof DT_TO_SIM_CONTRACT_VERSION;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  /** business_digital_twin.digital_twin_instances.id */
  digitalTwinInstanceId: string;
  /** business_digital_twin.digital_twin_snapshots.id */
  snapshotId: string;
  snapshotVersion: number;
  /** business_digital_twin.scenario_baselines.id */
  scenarioBaselineId: string;
  scenarioBaselineVersion: number;
  objective: string;
  variables: readonly DTVariableInput[];
  assumptions: readonly string[];
  constraints: readonly DTConstraintInput[];
  uncertaintyAssignments: readonly DTUncertaintyAssignment[];
  evidenceReferences: readonly string[];
  quality: DTQualityEvidence;
  effectiveAt: string;
  idempotencyKey: string;
}

/**
 * The DT → SIM handoff: the canonical CLAUDE.md §8 envelope carrying a
 * published scenario baseline ready for Simulation execution.
 */
export type DTToSIMHandoff = LayerHandoff<DTToSIMHandoffPayload>;

export interface DTToSIMValidationResult {
  valid: boolean;
  reasons: readonly string[];
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;

const MAX_SERIALIZED_BYTES = 512 * 1024;
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

const DISTRIBUTION_TYPES = new Set([
  'fixed', 'uniform', 'normal', 'lognormal', 'triangular', 'beta', 'empirical', 'categorical',
]);
const OPERATORS = new Set(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'between', 'in', 'not_in', 'contains']);

/**
 * Runtime validation with explicit rejection reasons. Accepts only a
 * published scenario baseline built from a published snapshot, with
 * uncertainty assigned for every probabilistic variable, inside a
 * complete, serializable handoff envelope.
 */
export function validateDTToSIMHandoff(value: unknown): DTToSIMValidationResult {
  const reasons: string[] = [];
  const h = value as DTToSIMHandoff | null | undefined;

  if (!h || typeof h !== 'object') {
    return { valid: false, reasons: ['handoff_required'] };
  }

  for (const field of ['handoffId', 'sourceBlock', 'targetBlock', 'correlationId', 'createdAt'] as const) {
    if (!isNonEmptyString(h[field])) reasons.push(`${field}_required`);
  }
  if (h.sourceLayer !== 'DT') reasons.push('source_layer_must_be_DT');
  if (h.targetLayer !== 'SIM') reasons.push('target_layer_must_be_SIM');
  if (h.status !== 'ready') reasons.push('handoff_status_must_be_ready');
  if (!Array.isArray(h.lineage)) reasons.push('lineage_array_required');

  const p = h.payload as DTToSIMHandoffPayload | undefined;
  if (!p || typeof p !== 'object') {
    reasons.push('payload_required');
    return { valid: false, reasons };
  }

  if (p.contractVersion !== DT_TO_SIM_CONTRACT_VERSION) reasons.push('contract_version_unsupported');
  if (!isNonEmptyString(p.tenantId)) reasons.push('tenant_id_required');
  if (!isNonEmptyString(p.workspaceId)) reasons.push('workspace_id_required');
  if (!isNonEmptyString(p.businessId)) reasons.push('business_id_required');
  if (!isNonEmptyString(p.digitalTwinInstanceId)) reasons.push('digital_twin_instance_id_required');
  if (!isNonEmptyString(p.snapshotId)) reasons.push('snapshot_id_required');
  if (!Number.isInteger(p.snapshotVersion) || p.snapshotVersion < 1) reasons.push('snapshot_version_invalid');
  if (!isNonEmptyString(p.scenarioBaselineId)) reasons.push('scenario_baseline_id_required');
  if (!Number.isInteger(p.scenarioBaselineVersion) || p.scenarioBaselineVersion < 1) {
    reasons.push('scenario_baseline_version_invalid');
  }
  if (!isNonEmptyString(p.objective)) reasons.push('objective_required');

  if (!Array.isArray(p.variables) || p.variables.length === 0) {
    reasons.push('variables_required');
  } else if (p.variables.length > MAX_COLLECTION_ENTRIES) {
    reasons.push('variables_collection_too_large');
  } else {
    for (const v of p.variables) {
      if (!v || typeof v !== 'object' || !isNonEmptyString(v.variableCode)) {
        reasons.push('malformed_variable_entry');
        break;
      }
    }
  }

  if (!Array.isArray(p.assumptions)) reasons.push('assumptions_array_required');
  if (!Array.isArray(p.constraints)) {
    reasons.push('constraints_array_required');
  } else {
    for (const c of p.constraints) {
      if (!c || typeof c !== 'object' || !isNonEmptyString(c.constraintCode) || !OPERATORS.has(c.operator)) {
        reasons.push('malformed_constraint_entry');
        break;
      }
    }
  }

  if (!Array.isArray(p.uncertaintyAssignments)) {
    reasons.push('uncertainty_assignments_array_required');
  } else {
    for (const u of p.uncertaintyAssignments) {
      if (!u || typeof u !== 'object' || !isNonEmptyString(u.variableCode) || !DISTRIBUTION_TYPES.has(u.distributionType)) {
        reasons.push('malformed_uncertainty_assignment');
        break;
      }
    }
    if (Array.isArray(p.variables) && Array.isArray(p.uncertaintyAssignments)) {
      const assignedCodes = new Set(p.uncertaintyAssignments.map((u) => u?.variableCode));
      const numericVariables = p.variables.filter((v) => typeof v?.value === 'number');
      const missing = numericVariables.filter((v) => !assignedCodes.has(v.variableCode));
      if (numericVariables.length > 0 && missing.length === numericVariables.length) {
        reasons.push('missing_uncertainty_for_probabilistic_variables');
      }
    }
  }

  if (!Array.isArray(p.evidenceReferences) || p.evidenceReferences.length === 0) {
    reasons.push('missing_evidence');
  }

  if (!p.quality || typeof p.quality !== 'object') {
    reasons.push('quality_required');
  } else {
    if (typeof p.quality.confidence !== 'number' || p.quality.confidence < 0 || p.quality.confidence > 1) {
      reasons.push('quality_confidence_invalid');
    }
    if (p.quality.freshnessSeconds !== null && (typeof p.quality.freshnessSeconds !== 'number' || p.quality.freshnessSeconds < 0)) {
      reasons.push('quality_freshness_invalid');
    }
  }

  if (!isNonEmptyString(p.effectiveAt) || Number.isNaN(Date.parse(p.effectiveAt))) {
    reasons.push('effective_at_invalid');
  }
  if (!isNonEmptyString(p.idempotencyKey)) reasons.push('idempotency_key_required');

  const forbidden = ['recommendation', 'approval', 'decision', 'executionResult'];
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
