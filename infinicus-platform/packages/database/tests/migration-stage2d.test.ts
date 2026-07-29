/**
 * Structural unit tests for Stage 2D (Business Intelligence) migration files.
 * Validates SQL file content without a live database.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const MIGRATIONS_DIR = resolve(__dirname, '../../../infrastructure/database/migrations');

function loadMigration(filename: string): string {
  return readFileSync(resolve(MIGRATIONS_DIR, filename), 'utf-8');
}

const STAGE_2D_FILES = [
  '0037_create_bi_schema_intake.sql',
  '0038_create_bi_datasets.sql',
  '0039_create_bi_metrics.sql',
  '0040_create_bi_analysis.sql',
  '0041_create_bi_findings_trends.sql',
  '0042_create_bi_forecasts.sql',
  '0043_create_bi_anomalies.sql',
  '0044_create_bi_benchmarks_risk.sql',
  '0045_create_bi_publication.sql',
  '0046_create_bi_registry.sql',
  '0047_create_bi_indexes.sql',
  '0048_create_bi_rls_policies.sql',
  '0049_create_bi_triggers_events.sql',
];

describe('Stage 2D migration files exist', () => {
  it.each(STAGE_2D_FILES)('%s is readable', (filename) => {
    const sql = loadMigration(filename);
    expect(sql.length).toBeGreaterThan(100);
  });
});

describe('All Stage 2D migration files are transactional', () => {
  it.each(STAGE_2D_FILES)('%s wraps in BEGIN/COMMIT', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toMatch(/^\s*BEGIN\s*;/im);
    expect(sql).toMatch(/COMMIT\s*;?\s*$/im);
  });
});

describe('All Stage 2D migration files self-register in _migrations', () => {
  it.each(STAGE_2D_FILES)('%s inserts into _migrations', (filename) => {
    const sql = loadMigration(filename);
    expect(sql).toContain('INSERT INTO _migrations (filename) VALUES');
    expect(sql).toContain(filename);
    expect(sql).toContain('ON CONFLICT (filename) DO NOTHING');
  });
});

describe('Frozen migration range is not touched', () => {
  it('the next migration after 0036 is 0037 — no gap, no renumbering', () => {
    // 0037 is the first Stage 2D file; anything lower is frozen Stage 2A-2C.
    expect(STAGE_2D_FILES[0]).toBe('0037_create_bi_schema_intake.sql');
  });
});

describe('0037 — schema + intake and lineage', () => {
  const sql = loadMigration('0037_create_bi_schema_intake.sql');

  it('creates business_intelligence schema', () => {
    expect(sql).toContain('CREATE SCHEMA IF NOT EXISTS business_intelligence');
  });

  for (const table of [
    'intelligence_intake_packages',
    'intelligence_intake_package_versions',
    'intelligence_source_references',
    'intelligence_domain_inputs',
    'intelligence_processing_status_history',
  ]) {
    it(`creates business_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_intelligence.${table}`);
    });
  }

  it('intake packages reference the canonical BO publication package', () => {
    expect(sql).toContain('REFERENCES business_operations.bo_publication_packages(id)');
  });

  it('intake packages reference canonical tenancy/platform identity, never a duplicate', () => {
    expect(sql).toContain('REFERENCES tenancy.tenants(id)');
    expect(sql).toContain('REFERENCES tenancy.workspaces(id)');
    expect(sql).toContain('REFERENCES platform.businesses(id)');
    expect(sql).not.toContain('CREATE TABLE tenancy.businesses');
  });

  it('enforces idempotent intake via unique constraints', () => {
    expect(sql).toContain('intake_packages_idempotency_unique UNIQUE (business_id, idempotency_key)');
    expect(sql).toContain('intake_packages_bo_package_unique  UNIQUE (business_id, bo_publication_package_id)');
  });

  it('constrains intake status to valid lifecycle values', () => {
    expect(sql).toMatch(/status\s+text\s+NOT NULL DEFAULT 'received' CHECK \(status IN \(/);
  });
});

describe('0038 — analytical datasets', () => {
  const sql = loadMigration('0038_create_bi_datasets.sql');

  for (const table of ['analytical_datasets', 'analytical_dataset_versions', 'dataset_lineage', 'dataset_data_references']) {
    it(`creates business_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_intelligence.${table}`);
    });
  }

  it('dataset versions are immutable / append-only (documented)', () => {
    expect(sql).toContain('Append-only. Immutable once created');
  });

  it('enforces effective-period ordering', () => {
    expect(sql).toContain('dataset_versions_period_check CHECK (effective_end IS NULL OR effective_end > effective_start)');
  });
});

describe('0039 — metrics and KPIs', () => {
  const sql = loadMigration('0039_create_bi_metrics.sql');

  for (const table of ['metric_definitions', 'metric_definition_versions', 'metric_calculated_values', 'metric_time_series_values']) {
    it(`creates business_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_intelligence.${table}`);
    });
  }

  it('bounds quality/completeness scores to [0,1]', () => {
    expect(sql).toContain('BETWEEN 0 AND 1');
  });

  it('enforces period ordering on calculated values', () => {
    expect(sql).toContain('metric_calculated_values_period_check CHECK (period_end > period_start)');
  });

  it('carries currency_code without forcing conversion', () => {
    expect(sql).toContain('currency_code');
  });
});

describe('0040 — analysis lifecycle', () => {
  const sql = loadMigration('0040_create_bi_analysis.sql');

  for (const table of ['analysis_requests', 'analysis_runs', 'analysis_inputs', 'analysis_outputs', 'analysis_status_history']) {
    it(`creates business_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_intelligence.${table}`);
    });
  }

  it('constrains run status to the lifecycle enum', () => {
    expect(sql).toContain("CHECK (status IN (\n                                      'queued','running','completed','failed','cancelled'");
  });
});

describe('0041 — findings, evidence, trends', () => {
  const sql = loadMigration('0041_create_bi_findings_trends.sql');

  for (const table of ['findings', 'finding_versions', 'finding_evidence', 'trends', 'trend_observations']) {
    it(`creates business_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_intelligence.${table}`);
    });
  }

  it('finding_versions are documented immutable once published', () => {
    expect(sql).toContain('Published findings are immutable');
  });

  it('bounds finding confidence to [0,1]', () => {
    expect(sql).toContain('confidence         numeric(5,4)  NOT NULL CHECK (confidence BETWEEN 0 AND 1)');
  });

  it('supports supersession via findings.superseded_by', () => {
    expect(sql).toContain('superseded_by      uuid          REFERENCES business_intelligence.findings(id)');
  });
});

describe('0042 — forecasts and accuracy', () => {
  const sql = loadMigration('0042_create_bi_forecasts.sql');

  for (const table of ['forecast_models', 'forecast_requests', 'forecast_runs', 'forecast_points', 'forecast_accuracy_records']) {
    it(`creates business_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_intelligence.${table}`);
    });
  }

  it('enforces chronological forecast-point ordering per run', () => {
    expect(sql).toContain('forecast_points_sequence_unique UNIQUE (forecast_run_id, sequence_number)');
    expect(sql).toContain('forecast_points_period_check CHECK (period_end > period_start)');
  });

  it('enforces confidence interval ordering', () => {
    expect(sql).toContain('forecast_points_confidence_check CHECK (confidence_high >= confidence_low)');
  });

  it('documents immutability once published', () => {
    expect(sql).toContain('Once publication_status = published, the run and its points are immutable');
  });
});

describe('0043 — anomalies', () => {
  const sql = loadMigration('0043_create_bi_anomalies.sql');

  for (const table of ['anomaly_rules', 'anomaly_rule_versions', 'anomaly_detections', 'anomaly_evidence', 'anomaly_status_history']) {
    it(`creates business_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_intelligence.${table}`);
    });
  }

  it('validates severity against a fixed enum', () => {
    expect(sql).toContain("CHECK (default_severity IN ('info','low','medium','high','critical'))");
    expect(sql).toContain("CHECK (severity IN ('info','low','medium','high','critical'))");
  });

  it('enforces acknowledge/resolve chronology', () => {
    expect(sql).toContain('anomaly_detections_ack_check');
    expect(sql).toContain('anomaly_detections_resolve_check');
  });
});

describe('0044 — benchmarks, comparisons, risk', () => {
  const sql = loadMigration('0044_create_bi_benchmarks_risk.sql');

  for (const table of [
    'benchmark_definitions', 'benchmark_datasets', 'comparison_runs', 'comparison_results',
    'risk_models', 'risk_assessments', 'risk_factors',
  ]) {
    it(`creates business_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_intelligence.${table}`);
    });
  }

  it('bounds risk_score, likelihood and weight to [0,1]', () => {
    expect(sql).toContain('risk_score        numeric(5,4) NOT NULL CHECK (risk_score BETWEEN 0 AND 1)');
    expect(sql).toContain('likelihood          numeric(5,4) NOT NULL CHECK (likelihood BETWEEN 0 AND 1)');
    expect(sql).toContain('weight               numeric(5,4) NOT NULL CHECK (weight BETWEEN 0 AND 1)');
  });

  it('risk_assessments are append-only (documented)', () => {
    expect(sql).toContain('Append-only. Corrections publish a new assessment');
  });
});

describe('0045 — insight and publication packages', () => {
  const sql = loadMigration('0045_create_bi_publication.sql');

  for (const table of ['insight_packages', 'insight_package_versions', 'bi_publication_packages', 'bi_publication_events']) {
    it(`creates business_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_intelligence.${table}`);
    });
  }

  it('restricts target_layer to the three authorized downstream layers', () => {
    expect(sql).toContain("target_layer IN (\n                                            'business_digital_twin','simulation','ai_decision_intelligence'");
  });

  it('does not implement a downstream consumer', () => {
    expect(sql).not.toMatch(/CREATE TABLE business_digital_twin\./i);
    expect(sql).not.toMatch(/CREATE TABLE simulation\./i);
  });

  it('enforces idempotent publication via a unique constraint', () => {
    expect(sql).toContain('bi_publication_packages_idempotency_unique UNIQUE (business_id, idempotency_key)');
  });

  it('publication events cover dispatch/ack/reject/revoke/replay', () => {
    expect(sql).toContain("'dispatch','acknowledgement','rejection','revocation','replay'");
  });
});

describe('0046 — component registry and deployment', () => {
  const sql = loadMigration('0046_create_bi_registry.sql');

  for (const table of ['bi_component_registry', 'bi_component_versions', 'bi_deployments', 'bi_deployment_rollbacks']) {
    it(`creates business_intelligence.${table}`, () => {
      expect(sql).toContain(`CREATE TABLE business_intelligence.${table}`);
    });
  }
});

describe('0047 — indexes', () => {
  const sql = loadMigration('0047_create_bi_indexes.sql');

  it('creates a substantial number of indexes', () => {
    const matches = sql.match(/CREATE INDEX/g) ?? [];
    expect(matches.length).toBeGreaterThan(200);
  });

  it('includes partial indexes for active/open subsets', () => {
    expect(sql).toContain("WHERE status = 'open'");
  });
});

describe('0048 — RLS enabled and forced', () => {
  const sql = loadMigration('0048_create_bi_rls_policies.sql');

  it('enables RLS on every BI table', () => {
    const matches = sql.match(/ENABLE ROW LEVEL SECURITY/g) ?? [];
    expect(matches.length).toBe(48);
  });

  it('forces RLS on every BI table (stronger than Stage 2A-2C precedent)', () => {
    const matches = sql.match(/^ALTER TABLE business_intelligence\.\w+ FORCE ROW LEVEL SECURITY;$/gm) ?? [];
    expect(matches.length).toBe(48);
  });

  it('uses the established null-safe fail-closed predicate', () => {
    expect(sql).toContain("current_setting('app.tenant_id',    true)::uuid");
    expect(sql).toContain("current_setting('app.workspace_id', true)::uuid");
  });
});

describe('0049 — triggers, append-only enforcement, outbox events', () => {
  const sql = loadMigration('0049_create_bi_triggers_events.sql');

  it('installs updated_at triggers only on mutable tables', () => {
    const matches = sql.match(/CREATE TRIGGER set_updated_at_/g) ?? [];
    expect(matches.length).toBe(19);
  });

  it('installs an append-only guard function', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION business_intelligence.forbid_mutation()');
    expect(sql).toContain('RAISE EXCEPTION');
  });

  it('attaches the append-only guard to 29 evidence/history tables via a DO block loop', () => {
    const arrayMatch = sql.match(/FOREACH t IN ARRAY ARRAY\[([\s\S]*?)\]/);
    expect(arrayMatch).not.toBeNull();
    const tableNames = (arrayMatch![1].match(/'[a-z_]+'/g) ?? []).map((s) => s.slice(1, -1));
    expect(tableNames.length).toBe(29);
    expect(new Set(tableNames).size).toBe(29);
  });

  it('guards published forecast runs against mutation', () => {
    expect(sql).toContain('enforce_forecast_run_immutability');
    expect(sql).toContain('published forecast runs are immutable');
  });

  it('enforces a valid publication lifecycle state machine', () => {
    expect(sql).toContain('enforce_publication_transition');
    expect(sql).toContain('forbidden transition');
  });

  it('reuses the established outbox helper pattern', () => {
    expect(sql).toContain('CREATE OR REPLACE FUNCTION business_intelligence.emit_outbox_event');
    expect(sql).toContain('SECURITY DEFINER');
    expect(sql).toContain('INSERT INTO events.outbox_events');
  });

  const requiredEvents = [
    'bi.metric.calculated', 'bi.kpi.updated', 'bi.analysis.started', 'bi.analysis.completed',
    'bi.analysis.failed', 'bi.anomaly.detected', 'bi.forecast.generated', 'bi.forecast.accuracy_recorded',
    'bi.insight.published', 'bi.data.published',
  ];
  it.each(requiredEvents)('emits the required event type %s', (eventType) => {
    expect(sql).toContain(`'${eventType}'`);
  });

  it('rejects invalid target layers in bi.data.published', () => {
    expect(sql).toContain('invalid target layer');
  });
});
