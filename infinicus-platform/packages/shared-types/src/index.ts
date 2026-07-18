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

// ── Branded ID types ─────────────────────────────────────────────────────────

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type TenantId              = Brand<string, 'TenantId'>;
export type WorkspaceId           = Brand<string, 'WorkspaceId'>;
export type BusinessId            = Brand<string, 'BusinessId'>;
export type CorrelationId         = Brand<string, 'CorrelationId'>;

// ── Data Acquisition branded IDs ─────────────────────────────────────────────

export type DataSourceId          = Brand<string, 'DataSourceId'>;
export type ConnectorId           = Brand<string, 'ConnectorId'>;
export type CollectionRunId       = Brand<string, 'CollectionRunId'>;
export type PublicationPackageId  = Brand<string, 'PublicationPackageId'>;

// ── Data Acquisition enums ────────────────────────────────────────────────────

export type CollectionState =
  | 'planned'
  | 'scheduled'
  | 'collecting'
  | 'collected'
  | 'validated'
  | 'published'
  | 'failed'
  | 'quarantined'
  | 'cancelled';

export type DataSourceType =
  | 'manual'
  | 'file'
  | 'document'
  | 'api'
  | 'database'
  | 'webhook'
  | 'stream'
  | 'application'
  | 'sensor'
  | 'external_dataset';

export type SensitivityLevel =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'highly_restricted';

export type PublicationStatus =
  | 'draft'
  | 'ready'
  | 'published'
  | 'blocked'
  | 'failed'
  | 'revoked';

// ── Utility ──────────────────────────────────────────────────────────────────

export interface LayerResult<T = unknown> {
  ok:     boolean;
  data?:  T;
  error?: string;
  code?:  string;
}
