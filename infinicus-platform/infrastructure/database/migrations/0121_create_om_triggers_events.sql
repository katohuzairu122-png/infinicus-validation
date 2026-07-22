-- Migration: 0121_create_om_triggers_events
-- Stage 2I — Outcome Monitoring: updated_at triggers, append-only
--            enforcement, lifecycle-transition guards, outbox event functions

BEGIN;

-- ── updated_at triggers (mutable header tables only) ────────────────────────────
-- Reuses set_updated_at() from Stage 1 (0001_foundation.sql).

CREATE TRIGGER set_updated_at_om_intake_packages BEFORE UPDATE ON outcome_monitoring.om_intake_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_monitoring_plans BEFORE UPDATE ON outcome_monitoring.monitoring_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_monitored_actions BEFORE UPDATE ON outcome_monitoring.monitored_actions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_outcome_observations BEFORE UPDATE ON outcome_monitoring.outcome_observations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_outcome_targets BEFORE UPDATE ON outcome_monitoring.outcome_targets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_outcome_variance_runs BEFORE UPDATE ON outcome_monitoring.outcome_variance_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_monitoring_alert_rules BEFORE UPDATE ON outcome_monitoring.monitoring_alert_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_monitoring_alerts BEFORE UPDATE ON outcome_monitoring.monitoring_alerts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_monitoring_incidents BEFORE UPDATE ON outcome_monitoring.monitoring_incidents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_outcome_attribution_runs BEFORE UPDATE ON outcome_monitoring.outcome_attribution_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_outcome_reviews BEFORE UPDATE ON outcome_monitoring.outcome_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_learning_feedback_packages BEFORE UPDATE ON outcome_monitoring.learning_feedback_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_om_publication_packages BEFORE UPDATE ON outcome_monitoring.om_publication_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_om_component_registry BEFORE UPDATE ON outcome_monitoring.om_component_registry FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_om_deployments BEFORE UPDATE ON outcome_monitoring.om_deployments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── append-only enforcement ─────────────────────────────────────────────────────
-- Historical/evidence tables reject UPDATE and DELETE unconditionally, even for
-- roles that would otherwise be granted those privileges.
--
-- outcome_observation_versions is intentionally EXCLUDED from this list — it is
-- the only _versions table in this schema carrying its own independent status
-- column (repositories update it in place for the record/verify/dispute
-- transition), matching the BUILD-12/13/14/15-established design fix: it gets a
-- dedicated narrowly-scoped guard below instead of unconditional append-only
-- enforcement.

CREATE OR REPLACE FUNCTION outcome_monitoring.forbid_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'outcome_monitoring.%: append-only table — % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'raise_exception';
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'om_intake_package_versions','om_intake_source_references','om_intake_status_history',
    'monitoring_plan_versions','monitoring_plan_metrics','monitoring_plan_schedules',
    'monitored_action_versions','monitored_action_status_history','action_execution_observations',
    'outcome_measurements','outcome_evidence',
    'outcome_target_versions','outcome_thresholds','threshold_breaches',
    'outcome_variance_results','expected_actual_comparisons','variance_explanations',
    'monitoring_alert_rule_versions',
    'outcome_attribution_factors','outcome_attribution_results',
    'outcome_review_findings','outcome_review_actions','outcome_review_status_history',
    'learning_feedback_package_versions','learning_feedback_evidence',
    'om_publication_package_versions','om_publication_events',
    'om_component_registry_versions','om_deployment_rollbacks'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON outcome_monitoring.%1$s FOR EACH ROW EXECUTE FUNCTION outcome_monitoring.forbid_mutation();',
      t
    );
  END LOOP;
END $$;

-- ── immutable-once-decided guard: outcome_observations / outcome_observation_versions ──
-- An observation, once recorded, verified, or disputed, is where OM exercises
-- its actual observation authority — it must be permanently immutable. OM
-- observes and evaluates; it does not silently rewrite historical decisions.

CREATE OR REPLACE FUNCTION outcome_monitoring.enforce_observation_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('recorded','verified','disputed') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'outcome_monitoring.outcome_observations: recorded observations are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_observation_immutability
  BEFORE UPDATE ON outcome_monitoring.outcome_observations
  FOR EACH ROW EXECUTE FUNCTION outcome_monitoring.enforce_observation_immutability();

CREATE OR REPLACE FUNCTION outcome_monitoring.enforce_observation_version_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('recorded','verified','disputed') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'outcome_monitoring.outcome_observation_versions: recorded observation versions are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_observation_version_immutability
  BEFORE UPDATE ON outcome_monitoring.outcome_observation_versions
  FOR EACH ROW EXECUTE FUNCTION outcome_monitoring.enforce_observation_version_immutability();

-- ── lifecycle-transition guard: om_publication_packages ─────────────────────────

CREATE OR REPLACE FUNCTION outcome_monitoring.enforce_publication_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  allowed boolean := false;
BEGIN
  IF NEW.publication_status = OLD.publication_status THEN
    RETURN NEW;
  END IF;
  allowed := CASE OLD.publication_status
    WHEN 'draft'        THEN NEW.publication_status = 'ready'
    WHEN 'ready'         THEN NEW.publication_status = 'dispatched'
    WHEN 'dispatched'     THEN NEW.publication_status IN ('acknowledged','rejected','revoked')
    WHEN 'acknowledged'    THEN NEW.publication_status = 'revoked'
    ELSE false
  END;
  IF NOT allowed THEN
    RAISE EXCEPTION 'outcome_monitoring.om_publication_packages: forbidden transition % -> %', OLD.publication_status, NEW.publication_status
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_publication_transition
  BEFORE UPDATE ON outcome_monitoring.om_publication_packages
  FOR EACH ROW EXECUTE FUNCTION outcome_monitoring.enforce_publication_transition();

-- ── outbox helper (mirrors approved_business_action.emit_outbox_event) ──────────

CREATE OR REPLACE FUNCTION outcome_monitoring.emit_outbox_event(
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

-- ── per-event wrapper functions (10 required om.* events) ───────────────────────

CREATE OR REPLACE FUNCTION outcome_monitoring.emit_intake_received(
  p_tenant_id uuid, p_workspace_id uuid, p_om_intake_package_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN outcome_monitoring.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'om.intake.received', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('omIntakePackageId', p_om_intake_package_id),
    'om_intake_package', p_om_intake_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION outcome_monitoring.emit_monitoring_started(
  p_tenant_id uuid, p_workspace_id uuid, p_monitoring_plan_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN outcome_monitoring.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'om.monitoring.started', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('monitoringPlanId', p_monitoring_plan_id),
    'monitoring_plan', p_monitoring_plan_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION outcome_monitoring.emit_observation_recorded(
  p_tenant_id uuid, p_workspace_id uuid, p_observation_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN outcome_monitoring.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'om.observation.recorded', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('observationVersionId', p_observation_version_id),
    'outcome_observation_version', p_observation_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION outcome_monitoring.emit_target_breached(
  p_tenant_id uuid, p_workspace_id uuid, p_threshold_breach_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN outcome_monitoring.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'om.target.breached', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('thresholdBreachId', p_threshold_breach_id),
    'threshold_breach', p_threshold_breach_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION outcome_monitoring.emit_variance_calculated(
  p_tenant_id uuid, p_workspace_id uuid, p_variance_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN outcome_monitoring.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'om.variance.calculated', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('varianceRunId', p_variance_run_id),
    'outcome_variance_run', p_variance_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION outcome_monitoring.emit_alert_raised(
  p_tenant_id uuid, p_workspace_id uuid, p_monitoring_alert_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN outcome_monitoring.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'om.alert.raised', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('monitoringAlertId', p_monitoring_alert_id),
    'monitoring_alert', p_monitoring_alert_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION outcome_monitoring.emit_incident_opened(
  p_tenant_id uuid, p_workspace_id uuid, p_monitoring_incident_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN outcome_monitoring.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'om.incident.opened', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('monitoringIncidentId', p_monitoring_incident_id),
    'monitoring_incident', p_monitoring_incident_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION outcome_monitoring.emit_review_completed(
  p_tenant_id uuid, p_workspace_id uuid, p_outcome_review_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN outcome_monitoring.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'om.review.completed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('outcomeReviewId', p_outcome_review_id),
    'outcome_review', p_outcome_review_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION outcome_monitoring.emit_feedback_published(
  p_tenant_id uuid, p_workspace_id uuid, p_learning_feedback_package_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN outcome_monitoring.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'om.feedback.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('learningFeedbackPackageId', p_learning_feedback_package_id),
    'learning_feedback_package', p_learning_feedback_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION outcome_monitoring.emit_data_published(
  p_tenant_id uuid, p_workspace_id uuid, p_om_publication_package_id uuid, p_target_layer text, p_target_block text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_target_layer NOT IN ('continuous_learning') THEN
    RAISE EXCEPTION 'outcome_monitoring.emit_data_published: invalid target layer %', p_target_layer
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN outcome_monitoring.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'om.data.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('omPublicationPackageId', p_om_publication_package_id, 'targetLayer', p_target_layer, 'targetBlock', p_target_block),
    'om_publication_package', p_om_publication_package_id
  );
END;
$$;

INSERT INTO _migrations (filename) VALUES ('0121_create_om_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
