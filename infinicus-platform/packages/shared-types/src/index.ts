// @infinicus/shared-types — canonical platform types (CLAUDE.md §§ 7-10)

export type LayerId =
  | 'DAL' | 'BO' | 'BI' | 'DT'
  | 'SIM' | 'ADI' | 'ABA' | 'OM' | 'CL';

// ── § 7 — Canonical shared fields ────────────────────────────────────────────

export interface LineageEntry {
  layer:     LayerId;
  block:     string;
  recordId:  string;
  timestamp: string;
  action:    string;
}

export interface BaseRecord {
  id:              string;
  tenantId:        string;
  workspaceId:     string;
  businessId:      string;
  status:          string;
  version:         number;
  sourceSystem:    string;
  sourceRecordId?: string;
  correlationId:   string;
  createdAt:       string;
  updatedAt:       string;
  createdBy?:      string;
  lineage:         LineageEntry[];
}

// ── § 8 — Handoff contract ───────────────────────────────────────────────────

export type HandoffStatus = 'ready' | 'blocked' | 'failed';

export interface LayerHandoff<TPayload = unknown> {
  handoffId:     string;
  sourceLayer:   string;
  sourceBlock:   string;
  targetLayer:   string;
  targetBlock:   string;
  payload:       TPayload;
  correlationId: string;
  lineage:       LineageEntry[];
  status:        HandoffStatus;
  createdAt:     string;
}

// ── § 9 — Event contract ─────────────────────────────────────────────────────

export interface PlatformEvent<TPayload = unknown> {
  eventId:       string;
  eventType:     string;
  eventVersion:  string;
  tenantId:      string;
  businessId:    string;
  correlationId: string;
  causationId?:  string;
  payload:       TPayload;
  occurredAt:    string;
  publishedAt:   string;
}

// ── § 10 — Operational state ─────────────────────────────────────────────────

export type OperationalStatus =
  | 'planned'
  | 'authorized'
  | 'executed'
  | 'completed'
  | 'failed'
  | 'reversed';

// ── Utility ──────────────────────────────────────────────────────────────────

export interface LayerResult<T = unknown> {
  ok:     boolean;
  data?:  T;
  error?: string;
  code?:  string;
}
