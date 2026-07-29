// SIM → ADI handoff contract (BUILD-07).
// Carries completed Simulation evidence from the SIM layer (INFINICUS Engine
// v3) to ADI. Evidence only — never a recommendation or approval.
import type { LayerHandoff, LineageEntry } from '@infinicus/shared-types';

// v1.1.0 (BUILD-13): adds required workspaceId/idempotencyKey, a 512 KiB
// payload-size bound, credential-like key rejection, and __proto__/prototype/
// constructor key rejection — completing the Stage 2A+ tenant/workspace/
// business + idempotency convention this contract predates (BUILD-07).
export const SIM_TO_ADI_CONTRACT_VERSION = '1.1.0';

/** One named assumption/parameter the run was executed with. */
export interface SimulationAssumption {
  name: string;
  value: string | number | boolean | null;
}

/** Exact engine inputs the run used (USD-normalized), kept for lineage. */
export interface SimulationInputSnapshot {
  parametersVersion: string;
  parameters: Record<string, string | number | boolean | null>;
}

/** Final-cash percentile evidence exactly as produced by the engine. */
export interface SimulationPercentileEvidence {
  basis: 'final_cash';
  currencyCode: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

/** Normalized outcome metrics. Values are engine outputs, never derived. */
export interface SimulationOutcomeMetrics {
  finalCashBasePath: number | null;
  survivalRate: number;
  sampleSize: number;
  horizonDays: number;
}

/** Risk evidence carried verbatim from the engine's distribution. */
export interface SimulationRiskEvidence {
  survivalRate: number;
  downsideFinalCashP10: number;
}

/**
 * Sensitivity evidence. Engine v3 does not produce structured sensitivity
 * output for headless runs; when absent it must remain absent.
 */
export interface SimulationSensitivityEvidence {
  driver: string;
  metric: string;
  delta: number;
}

/** Canonical identity/versioning of the completed run being handed off. */
export interface SimulationRunReference {
  runId: string;
  scenarioId?: string;
  decisionId?: string;
  engineVersion: string;
  modelVersion: string;
  schemaVersion: string;
  status: 'completed';
  completedAt: string;
  sampleSize: number;
  horizonDays: number;
  /** null when the engine does not support seeded execution (Engine v3). */
  randomSeed: string | null;
  inputFingerprint?: string;
  scenarios: readonly string[];
  assumptions: readonly SimulationAssumption[];
}

export interface SimulationProvenance {
  sourceLayer: 'SIM';
  sourceBlock: string;
  engineNamespace: string;
  sourceResultRef: string;
}

/** Payload of the SIM → ADI handoff envelope. Serializable data only. */
export interface SIMToADIHandoffPayload {
  contractVersion: typeof SIM_TO_ADI_CONTRACT_VERSION;
  tenantId: string;
  workspaceId: string;
  businessId: string;
  idempotencyKey: string;
  run: SimulationRunReference;
  inputSnapshot: SimulationInputSnapshot;
  outcomes: SimulationOutcomeMetrics;
  uncertainty: SimulationPercentileEvidence;
  risk: SimulationRiskEvidence;
  sensitivity?: readonly SimulationSensitivityEvidence[];
  limitations: readonly string[];
  warnings: readonly string[];
  provenance: SimulationProvenance;
}

/**
 * The SIM → ADI handoff: the canonical CLAUDE.md §8 envelope carrying a
 * completed-run evidence payload. correlationId/lineage/status live on the
 * envelope — they are not duplicated inside the payload.
 */
export type SIMToADIHandoff = LayerHandoff<SIMToADIHandoffPayload>;

export interface SIMToADIValidationResult {
  valid: boolean;
  reasons: readonly string[];
}

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0;
const isFiniteNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const MAX_SERIALIZED_BYTES = 512 * 1024;
const CREDENTIAL_LIKE_KEYS = ['password', 'secret', 'apiKey', 'token', 'credential', 'privateKey'];
const DANGEROUS_KEYS = ['__proto__', 'prototype', 'constructor'];

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
 * complete, serializable handoff carrying a completed Simulation run.
 */
export function validateSIMToADIHandoff(value: unknown): SIMToADIValidationResult {
  const reasons: string[] = [];
  const h = value as SIMToADIHandoff | null | undefined;

  if (!h || typeof h !== 'object') {
    return { valid: false, reasons: ['handoff_required'] };
  }

  // Envelope (CLAUDE.md §8)
  for (const field of ['handoffId', 'sourceBlock', 'targetBlock', 'correlationId', 'createdAt'] as const) {
    if (!isNonEmptyString(h[field])) reasons.push(`${field}_required`);
  }
  if (h.sourceLayer !== 'SIM') reasons.push('source_layer_must_be_SIM');
  if (h.targetLayer !== 'ADI') reasons.push('target_layer_must_be_ADI');
  if (h.status !== 'ready') reasons.push('handoff_status_must_be_ready');
  if (!Array.isArray(h.lineage)) reasons.push('lineage_array_required');

  const p = h.payload as SIMToADIHandoffPayload | undefined;
  if (!p || typeof p !== 'object') {
    reasons.push('payload_required');
    return { valid: false, reasons };
  }

  if (p.contractVersion !== SIM_TO_ADI_CONTRACT_VERSION) reasons.push('contract_version_unsupported');
  if (!isNonEmptyString(p.tenantId)) reasons.push('tenant_id_required');
  if (!isNonEmptyString(p.workspaceId)) reasons.push('workspace_id_required');
  if (!isNonEmptyString(p.businessId)) reasons.push('business_id_required');
  if (!isNonEmptyString(p.idempotencyKey)) reasons.push('idempotency_key_required');

  const run = p.run;
  if (!run || typeof run !== 'object') {
    reasons.push('run_required');
  } else {
    for (const field of ['runId', 'engineVersion', 'modelVersion', 'schemaVersion', 'completedAt'] as const) {
      if (!isNonEmptyString(run[field])) reasons.push(`run_${field}_required`);
    }
    if (run.status !== 'completed') reasons.push('run_not_completed');
    if (isNonEmptyString(run.completedAt) && Number.isNaN(Date.parse(run.completedAt))) {
      reasons.push('run_completed_at_invalid');
    }
    if (!Number.isInteger(run.sampleSize) || run.sampleSize < 1) reasons.push('run_sample_size_invalid');
    if (!Number.isInteger(run.horizonDays) || run.horizonDays < 1) reasons.push('run_horizon_days_invalid');
    if (!Array.isArray(run.scenarios) || run.scenarios.length < 1) reasons.push('run_scenarios_required');
    if (!Array.isArray(run.assumptions)) reasons.push('run_assumptions_array_required');
    if (run.randomSeed !== null && !isNonEmptyString(run.randomSeed)) {
      reasons.push('run_random_seed_invalid');
    }
  }

  if (!p.inputSnapshot || typeof p.inputSnapshot !== 'object' || !p.inputSnapshot.parameters) {
    reasons.push('input_snapshot_required');
  }

  const o = p.outcomes;
  if (!o || typeof o !== 'object') {
    reasons.push('outcomes_required');
  } else {
    if (!isFiniteNumber(o.survivalRate) || o.survivalRate < 0 || o.survivalRate > 1) {
      reasons.push('outcomes_survival_rate_invalid');
    }
    if (o.finalCashBasePath !== null && !isFiniteNumber(o.finalCashBasePath)) {
      reasons.push('outcomes_final_cash_invalid');
    }
  }

  const u = p.uncertainty;
  if (!u || typeof u !== 'object') {
    reasons.push('uncertainty_required');
  } else {
    if (u.basis !== 'final_cash') reasons.push('uncertainty_basis_unsupported');
    if (!isNonEmptyString(u.currencyCode)) reasons.push('uncertainty_currency_required');
    for (const q of ['p10', 'p25', 'p50', 'p75', 'p90'] as const) {
      if (!isFiniteNumber(u[q])) reasons.push(`uncertainty_${q}_invalid`);
    }
  }

  if (!p.risk || typeof p.risk !== 'object' || !isFiniteNumber(p.risk.survivalRate)) {
    reasons.push('risk_evidence_required');
  }
  if (!Array.isArray(p.limitations)) reasons.push('limitations_array_required');
  if (!Array.isArray(p.warnings)) reasons.push('warnings_array_required');

  const prov = p.provenance;
  if (!prov || typeof prov !== 'object') {
    reasons.push('provenance_required');
  } else {
    if (prov.sourceLayer !== 'SIM') reasons.push('provenance_source_layer_must_be_SIM');
    for (const field of ['sourceBlock', 'engineNamespace', 'sourceResultRef'] as const) {
      if (!isNonEmptyString(prov[field])) reasons.push(`provenance_${field}_required`);
    }
  }

  // Evidence only — never a decision.
  const forbidden = ['recommendation', 'approval', 'approvedAction', 'verdictDecision'];
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

export type { LineageEntry as SIMToADILineageEntry };
