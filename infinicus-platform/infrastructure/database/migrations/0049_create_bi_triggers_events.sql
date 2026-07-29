-- Migration: 0049_create_bi_triggers_events
-- Stage 2D — Business Intelligence: updated_at triggers, append-only
--            enforcement, lifecycle-transition guards, outbox event functions

BEGIN;

-- ── updated_at triggers (mutable tables only) ──────────────────────────────────
-- Reuses set_updated_at() from Stage 1 (0001_foundation.sql).

CREATE TRIGGER set_updated_at_analysis_requests        BEFORE UPDATE ON business_intelligence.analysis_requests        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_analysis_runs             BEFORE UPDATE ON business_intelligence.analysis_runs             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_analytical_datasets       BEFORE UPDATE ON business_intelligence.analytical_datasets       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_anomaly_detections        BEFORE UPDATE ON business_intelligence.anomaly_detections        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_anomaly_rules             BEFORE UPDATE ON business_intelligence.anomaly_rules             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_benchmark_definitions     BEFORE UPDATE ON business_intelligence.benchmark_definitions     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_bi_component_registry     BEFORE UPDATE ON business_intelligence.bi_component_registry     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_bi_deployments            BEFORE UPDATE ON business_intelligence.bi_deployments            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_bi_publication_packages   BEFORE UPDATE ON business_intelligence.bi_publication_packages   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_findings                  BEFORE UPDATE ON business_intelligence.findings                  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_forecast_models           BEFORE UPDATE ON business_intelligence.forecast_models           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_forecast_requests         BEFORE UPDATE ON business_intelligence.forecast_requests         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_forecast_runs             BEFORE UPDATE ON business_intelligence.forecast_runs             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_insight_packages          BEFORE UPDATE ON business_intelligence.insight_packages          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_intelligence_domain_inputs BEFORE UPDATE ON business_intelligence.intelligence_domain_inputs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_intelligence_intake_packages BEFORE UPDATE ON business_intelligence.intelligence_intake_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_metric_definitions        BEFORE UPDATE ON business_intelligence.metric_definitions        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_risk_models               BEFORE UPDATE ON business_intelligence.risk_models               FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trends                    BEFORE UPDATE ON business_intelligence.trends                    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── append-only enforcement ─────────────────────────────────────────────────────
-- Historical/evidence tables reject UPDATE and DELETE unconditionally, even for
-- roles that would otherwise be granted those privileges.

CREATE OR REPLACE FUNCTION business_intelligence.forbid_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'business_intelligence.%: append-only table — % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'raise_exception';
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'intelligence_intake_package_versions','intelligence_source_references','intelligence_processing_status_history',
    'analytical_dataset_versions','dataset_lineage','dataset_data_references',
    'metric_definition_versions','metric_calculated_values','metric_time_series_values',
    'analysis_inputs','analysis_outputs','analysis_status_history',
    'finding_versions','finding_evidence','trend_observations',
    'forecast_points','forecast_accuracy_records',
    'anomaly_rule_versions','anomaly_evidence','anomaly_status_history',
    'benchmark_datasets','comparison_runs','comparison_results',
    'risk_assessments','risk_factors',
    'insight_package_versions','bi_publication_events',
    'bi_component_versions','bi_deployment_rollbacks'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON business_intelligence.%1$s FOR EACH ROW EXECUTE FUNCTION business_intelligence.forbid_mutation();',
      t
    );
  END LOOP;
END $$;

-- ── immutable-once-published guard: forecast_runs ───────────────────────────────

CREATE OR REPLACE FUNCTION business_intelligence.enforce_forecast_run_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.publication_status = 'published' AND (
       NEW.publication_status IS DISTINCT FROM OLD.publication_status
    OR NEW.status              IS DISTINCT FROM OLD.status
    OR NEW.assumptions         IS DISTINCT FROM OLD.assumptions
  ) THEN
    RAISE EXCEPTION 'business_intelligence.forecast_runs: published forecast runs are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_forecast_run_immutability
  BEFORE UPDATE ON business_intelligence.forecast_runs
  FOR EACH ROW EXECUTE FUNCTION business_intelligence.enforce_forecast_run_immutability();

-- ── lifecycle-transition guard: bi_publication_packages ─────────────────────────

CREATE OR REPLACE FUNCTION business_intelligence.enforce_publication_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  allowed boolean := false;
BEGIN
  IF NEW.publication_status = OLD.publication_status THEN
    RETURN NEW;
  END IF;
  allowed := CASE OLD.publication_status
    WHEN 'draft'      THEN NEW.publication_status = 'ready'
    WHEN 'ready'       THEN NEW.publication_status = 'dispatched'
    WHEN 'dispatched'   THEN NEW.publication_status IN ('acknowledged','rejected','revoked')
    WHEN 'acknowledged'  THEN NEW.publication_status = 'revoked'
    ELSE false
  END;
  IF NOT allowed THEN
    RAISE EXCEPTION 'business_intelligence.bi_publication_packages: forbidden transition % -> %', OLD.publication_status, NEW.publication_status
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_publication_transition
  BEFORE UPDATE ON business_intelligence.bi_publication_packages
  FOR EACH ROW EXECUTE FUNCTION business_intelligence.enforce_publication_transition();

-- ── outbox helper (mirrors business_operations.emit_outbox_event) ──────────────

CREATE OR REPLACE FUNCTION business_intelligence.emit_outbox_event(
  p_tenant_id       uuid,
  p_workspace_id    uuid,
  p_event_type      text,
  p_event_version   text,
  p_correlation_id  uuid,
  p_causation_id    uuid,
  p_payload         jsonb,
  p_aggregate_type  text DEFAULT NULL,
  p_aggregate_id    uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO events.outbox_events (
    id, tenant_id, workspace_id, event_type, event_version,
    payload, correlation_id, causation_id,
    aggregate_type, aggregate_id, status, created_at
  ) VALUES (
    gen_random_uuid(), p_tenant_id, p_workspace_id, p_event_type, p_event_version,
    p_payload, p_correlation_id, p_causation_id,
    p_aggregate_type, p_aggregate_id, 'pending', now()
  ) RETURNING id INTO v_event_id;
  RETURN v_event_id;
END;
$$;

-- ── per-event wrapper functions (10 required bi.* events) ──────────────────────

CREATE OR REPLACE FUNCTION business_intelligence.emit_metric_calculated(
  p_tenant_id uuid, p_workspace_id uuid, p_metric_calculated_value_id uuid,
  p_metric_definition_id uuid, p_value numeric, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bi.metric.calculated', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('metricCalculatedValueId', p_metric_calculated_value_id, 'metricDefinitionId', p_metric_definition_id, 'value', p_value),
    'metric_calculated_value', p_metric_calculated_value_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_intelligence.emit_kpi_updated(
  p_tenant_id uuid, p_workspace_id uuid, p_metric_definition_id uuid,
  p_metric_calculated_value_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bi.kpi.updated', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('metricDefinitionId', p_metric_definition_id, 'metricCalculatedValueId', p_metric_calculated_value_id),
    'metric_definition', p_metric_definition_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_intelligence.emit_analysis_started(
  p_tenant_id uuid, p_workspace_id uuid, p_analysis_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bi.analysis.started', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('analysisRunId', p_analysis_run_id),
    'analysis_run', p_analysis_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_intelligence.emit_analysis_completed(
  p_tenant_id uuid, p_workspace_id uuid, p_analysis_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bi.analysis.completed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('analysisRunId', p_analysis_run_id),
    'analysis_run', p_analysis_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_intelligence.emit_analysis_failed(
  p_tenant_id uuid, p_workspace_id uuid, p_analysis_run_id uuid, p_failure_code text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bi.analysis.failed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('analysisRunId', p_analysis_run_id, 'failureCode', p_failure_code),
    'analysis_run', p_analysis_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_intelligence.emit_anomaly_detected(
  p_tenant_id uuid, p_workspace_id uuid, p_anomaly_detection_id uuid, p_severity text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bi.anomaly.detected', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('anomalyDetectionId', p_anomaly_detection_id, 'severity', p_severity),
    'anomaly_detection', p_anomaly_detection_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_intelligence.emit_forecast_generated(
  p_tenant_id uuid, p_workspace_id uuid, p_forecast_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bi.forecast.generated', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('forecastRunId', p_forecast_run_id),
    'forecast_run', p_forecast_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_intelligence.emit_forecast_accuracy_recorded(
  p_tenant_id uuid, p_workspace_id uuid, p_forecast_accuracy_record_id uuid, p_forecast_point_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bi.forecast.accuracy_recorded', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('forecastAccuracyRecordId', p_forecast_accuracy_record_id, 'forecastPointId', p_forecast_point_id),
    'forecast_accuracy_record', p_forecast_accuracy_record_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_intelligence.emit_insight_published(
  p_tenant_id uuid, p_workspace_id uuid, p_insight_package_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bi.insight.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('insightPackageVersionId', p_insight_package_version_id),
    'insight_package_version', p_insight_package_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_intelligence.emit_data_published(
  p_tenant_id uuid, p_workspace_id uuid, p_bi_publication_package_id uuid, p_target_layer text, p_target_block text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_target_layer NOT IN ('business_digital_twin','simulation','ai_decision_intelligence') THEN
    RAISE EXCEPTION 'business_intelligence.emit_data_published: invalid target layer %', p_target_layer
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN business_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'bi.data.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('biPublicationPackageId', p_bi_publication_package_id, 'targetLayer', p_target_layer, 'targetBlock', p_target_block),
    'bi_publication_package', p_bi_publication_package_id
  );
END;
$$;

INSERT INTO _migrations (filename) VALUES ('0049_create_bi_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
