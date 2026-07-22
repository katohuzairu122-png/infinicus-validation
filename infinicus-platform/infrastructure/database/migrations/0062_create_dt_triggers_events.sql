-- Migration: 0062_create_dt_triggers_events
-- Stage 2E — Business Digital Twin: updated_at triggers, append-only
--            enforcement, lifecycle-transition guards, outbox event functions

BEGIN;

-- ── updated_at triggers (mutable tables only) ─────────────────────────────────
-- Reuses set_updated_at() from Stage 1 (0001_foundation.sql).

CREATE TRIGGER set_updated_at_digital_twin_definitions BEFORE UPDATE ON business_digital_twin.digital_twin_definitions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_digital_twin_instances BEFORE UPDATE ON business_digital_twin.digital_twin_instances FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_digital_twin_snapshots BEFORE UPDATE ON business_digital_twin.digital_twin_snapshots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_dt_component_registry BEFORE UPDATE ON business_digital_twin.dt_component_registry FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_dt_deployments BEFORE UPDATE ON business_digital_twin.dt_deployments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_dt_insight_packages BEFORE UPDATE ON business_digital_twin.dt_insight_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_dt_intake_packages BEFORE UPDATE ON business_digital_twin.dt_intake_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_dt_publication_packages BEFORE UPDATE ON business_digital_twin.dt_publication_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_scenario_baselines BEFORE UPDATE ON business_digital_twin.scenario_baselines FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_state_variable_definitions BEFORE UPDATE ON business_digital_twin.state_variable_definitions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_twin_assumptions BEFORE UPDATE ON business_digital_twin.twin_assumptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_twin_calibration_runs BEFORE UPDATE ON business_digital_twin.twin_calibration_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_twin_constraints BEFORE UPDATE ON business_digital_twin.twin_constraints FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_twin_entities BEFORE UPDATE ON business_digital_twin.twin_entities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_twin_relationships BEFORE UPDATE ON business_digital_twin.twin_relationships FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_twin_uncertainty_models BEFORE UPDATE ON business_digital_twin.twin_uncertainty_models FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_twin_validation_runs BEFORE UPDATE ON business_digital_twin.twin_validation_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── append-only enforcement ─────────────────────────────────────────────────────
-- Historical/evidence tables reject UPDATE and DELETE unconditionally, even for
-- roles that would otherwise be granted those privileges.

CREATE OR REPLACE FUNCTION business_digital_twin.forbid_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'business_digital_twin.%: append-only table — % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'raise_exception';
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'digital_twin_definition_components','digital_twin_definition_relationships','digital_twin_instance_status_history',
    'digital_twin_instance_versions','digital_twin_snapshot_evidence','digital_twin_snapshot_status_history','digital_twin_snapshot_values',
    'dt_component_registry_versions','dt_deployment_rollbacks','dt_insight_package_versions',
    'dt_intake_package_versions','dt_intake_processing_status_history','dt_intake_source_references','dt_publication_events',
    'scenario_baseline_constraints','scenario_baseline_inputs','state_variable_definition_versions',
    'state_variable_value_quality','state_variable_values','twin_assumption_versions','twin_calibration_inputs',
    'twin_calibration_results','twin_confidence_scores','twin_constraint_evaluations','twin_constraint_versions',
    'twin_entity_versions','twin_relationship_versions','twin_uncertainty_assignments','twin_uncertainty_model_versions',
    'twin_validation_issues','twin_validation_results'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON business_digital_twin.%1$s FOR EACH ROW EXECUTE FUNCTION business_digital_twin.forbid_mutation();',
      t
    );
  END LOOP;
END $$;

-- ── immutable-once-published guard: digital_twin_snapshots ──────────────────────

CREATE OR REPLACE FUNCTION business_digital_twin.enforce_snapshot_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'business_digital_twin.digital_twin_snapshots: published snapshots are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_snapshot_immutability
  BEFORE UPDATE ON business_digital_twin.digital_twin_snapshots
  FOR EACH ROW EXECUTE FUNCTION business_digital_twin.enforce_snapshot_immutability();

-- ── immutable-once-published guard: scenario_baselines ──────────────────────────

CREATE OR REPLACE FUNCTION business_digital_twin.enforce_scenario_baseline_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'business_digital_twin.scenario_baselines: published scenario baselines are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_scenario_baseline_immutability
  BEFORE UPDATE ON business_digital_twin.scenario_baselines
  FOR EACH ROW EXECUTE FUNCTION business_digital_twin.enforce_scenario_baseline_immutability();

-- ── immutable-once-active guard: digital_twin_definitions ───────────────────────

CREATE OR REPLACE FUNCTION business_digital_twin.enforce_definition_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('active','retired') AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'business_digital_twin.digital_twin_definitions: active or retired definitions cannot revert to draft'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_definition_immutability
  BEFORE UPDATE ON business_digital_twin.digital_twin_definitions
  FOR EACH ROW EXECUTE FUNCTION business_digital_twin.enforce_definition_immutability();

-- ── immutable-once-published guard: digital_twin_snapshot_versions ──────────────

CREATE OR REPLACE FUNCTION business_digital_twin.enforce_snapshot_version_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'business_digital_twin.digital_twin_snapshot_versions: published snapshot versions are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_snapshot_version_immutability
  BEFORE UPDATE ON business_digital_twin.digital_twin_snapshot_versions
  FOR EACH ROW EXECUTE FUNCTION business_digital_twin.enforce_snapshot_version_immutability();

-- ── immutable-once-published guard: scenario_baseline_versions ──────────────────

CREATE OR REPLACE FUNCTION business_digital_twin.enforce_scenario_baseline_version_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'business_digital_twin.scenario_baseline_versions: published scenario baseline versions are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_scenario_baseline_version_immutability
  BEFORE UPDATE ON business_digital_twin.scenario_baseline_versions
  FOR EACH ROW EXECUTE FUNCTION business_digital_twin.enforce_scenario_baseline_version_immutability();

-- ── immutable-once-active guard: digital_twin_definition_versions ───────────────

CREATE OR REPLACE FUNCTION business_digital_twin.enforce_definition_version_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('active','retired') AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'business_digital_twin.digital_twin_definition_versions: active or retired versions cannot revert to draft'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_definition_version_immutability
  BEFORE UPDATE ON business_digital_twin.digital_twin_definition_versions
  FOR EACH ROW EXECUTE FUNCTION business_digital_twin.enforce_definition_version_immutability();

-- ── lifecycle-transition guard: dt_publication_packages ─────────────────────────

CREATE OR REPLACE FUNCTION business_digital_twin.enforce_publication_transition()
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
    RAISE EXCEPTION 'business_digital_twin.dt_publication_packages: forbidden transition % -> %', OLD.publication_status, NEW.publication_status
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_publication_transition
  BEFORE UPDATE ON business_digital_twin.dt_publication_packages
  FOR EACH ROW EXECUTE FUNCTION business_digital_twin.enforce_publication_transition();

-- ── outbox helper (mirrors business_intelligence.emit_outbox_event) ────────────

CREATE OR REPLACE FUNCTION business_digital_twin.emit_outbox_event(
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

-- ── per-event wrapper functions (15 required dt.* events) ──────────────────────

CREATE OR REPLACE FUNCTION business_digital_twin.emit_intake_received(
  p_tenant_id uuid, p_workspace_id uuid, p_dt_intake_package_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.intake.received', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('dtIntakePackageId', p_dt_intake_package_id),
    'dt_intake_package', p_dt_intake_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_intake_accepted(
  p_tenant_id uuid, p_workspace_id uuid, p_dt_intake_package_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.intake.accepted', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('dtIntakePackageId', p_dt_intake_package_id),
    'dt_intake_package', p_dt_intake_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_intake_rejected(
  p_tenant_id uuid, p_workspace_id uuid, p_dt_intake_package_id uuid, p_reason text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.intake.rejected', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('dtIntakePackageId', p_dt_intake_package_id, 'reason', p_reason),
    'dt_intake_package', p_dt_intake_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_definition_published(
  p_tenant_id uuid, p_workspace_id uuid, p_definition_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.definition.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('definitionVersionId', p_definition_version_id),
    'digital_twin_definition_version', p_definition_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_instance_created(
  p_tenant_id uuid, p_workspace_id uuid, p_instance_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.instance.created', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('instanceId', p_instance_id),
    'digital_twin_instance', p_instance_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_instance_status_changed(
  p_tenant_id uuid, p_workspace_id uuid, p_instance_id uuid, p_to_status text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.instance.status_changed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('instanceId', p_instance_id, 'toStatus', p_to_status),
    'digital_twin_instance', p_instance_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_snapshot_created(
  p_tenant_id uuid, p_workspace_id uuid, p_snapshot_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.snapshot.created', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('snapshotVersionId', p_snapshot_version_id),
    'digital_twin_snapshot_version', p_snapshot_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_snapshot_validated(
  p_tenant_id uuid, p_workspace_id uuid, p_snapshot_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.snapshot.validated', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('snapshotVersionId', p_snapshot_version_id),
    'digital_twin_snapshot_version', p_snapshot_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_snapshot_published(
  p_tenant_id uuid, p_workspace_id uuid, p_snapshot_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.snapshot.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('snapshotVersionId', p_snapshot_version_id),
    'digital_twin_snapshot_version', p_snapshot_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_calibration_started(
  p_tenant_id uuid, p_workspace_id uuid, p_calibration_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.calibration.started', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('calibrationRunId', p_calibration_run_id),
    'twin_calibration_run', p_calibration_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_calibration_completed(
  p_tenant_id uuid, p_workspace_id uuid, p_calibration_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.calibration.completed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('calibrationRunId', p_calibration_run_id),
    'twin_calibration_run', p_calibration_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_calibration_failed(
  p_tenant_id uuid, p_workspace_id uuid, p_calibration_run_id uuid, p_failure_code text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.calibration.failed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('calibrationRunId', p_calibration_run_id, 'failureCode', p_failure_code),
    'twin_calibration_run', p_calibration_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_validation_completed(
  p_tenant_id uuid, p_workspace_id uuid, p_validation_run_id uuid, p_outcome text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.validation.completed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('validationRunId', p_validation_run_id, 'outcome', p_outcome),
    'twin_validation_run', p_validation_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_scenario_baseline_created(
  p_tenant_id uuid, p_workspace_id uuid, p_scenario_baseline_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.scenario_baseline.created', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('scenarioBaselineVersionId', p_scenario_baseline_version_id),
    'scenario_baseline_version', p_scenario_baseline_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_scenario_baseline_published(
  p_tenant_id uuid, p_workspace_id uuid, p_scenario_baseline_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.scenario_baseline.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('scenarioBaselineVersionId', p_scenario_baseline_version_id),
    'scenario_baseline_version', p_scenario_baseline_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION business_digital_twin.emit_data_published(
  p_tenant_id uuid, p_workspace_id uuid, p_dt_publication_package_id uuid, p_target_layer text, p_target_block text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_target_layer NOT IN ('simulation') THEN
    RAISE EXCEPTION 'business_digital_twin.emit_data_published: invalid target layer %', p_target_layer
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN business_digital_twin.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'dt.data.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('dtPublicationPackageId', p_dt_publication_package_id, 'targetLayer', p_target_layer, 'targetBlock', p_target_block),
    'dt_publication_package', p_dt_publication_package_id
  );
END;
$$;

INSERT INTO _migrations (filename) VALUES ('0062_create_dt_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
