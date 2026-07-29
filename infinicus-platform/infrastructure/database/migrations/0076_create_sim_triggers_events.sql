-- Migration: 0076_create_sim_triggers_events
-- Stage 2F — Simulation: updated_at triggers, append-only enforcement,
--            lifecycle-transition guards, outbox event functions

BEGIN;

-- ── updated_at triggers (mutable tables only) ─────────────────────────────────
-- Reuses set_updated_at() from Stage 1 (0001_foundation.sql).

CREATE TRIGGER set_updated_at_simulation_models BEFORE UPDATE ON simulation.simulation_models FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_simulation_scenarios BEFORE UPDATE ON simulation.simulation_scenarios FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_simulation_requests_intake BEFORE UPDATE ON simulation.simulation_intake_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_simulation_runs BEFORE UPDATE ON simulation.simulation_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_simulation_results BEFORE UPDATE ON simulation.simulation_results FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_simulation_sensitivity_runs BEFORE UPDATE ON simulation.simulation_sensitivity_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_scenario_comparison_runs BEFORE UPDATE ON simulation.scenario_comparison_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_simulation_validation_runs BEFORE UPDATE ON simulation.simulation_validation_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_simulation_calibration_runs BEFORE UPDATE ON simulation.simulation_calibration_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_simulation_insight_packages BEFORE UPDATE ON simulation.simulation_insight_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_simulation_publication_packages BEFORE UPDATE ON simulation.simulation_publication_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_simulation_component_registry BEFORE UPDATE ON simulation.simulation_component_registry FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_simulation_deployments BEFORE UPDATE ON simulation.simulation_deployments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── append-only enforcement ─────────────────────────────────────────────────────
-- Historical/evidence tables reject UPDATE and DELETE unconditionally, even for
-- roles that would otherwise be granted those privileges.
--
-- simulation_model_versions, simulation_scenario_versions, and
-- simulation_result_versions are intentionally EXCLUDED from this list — they
-- carry their own lifecycle status column that repositories update in place
-- (validate/activate/publish transitions), matching the BUILD-12-discovered
-- design fix: they get dedicated narrowly-scoped guards below instead of
-- unconditional append-only enforcement.

CREATE OR REPLACE FUNCTION simulation.forbid_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'simulation.%: append-only table — % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'raise_exception';
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'simulation_intake_package_versions','simulation_intake_source_references','simulation_intake_status_history',
    'simulation_model_parameters','simulation_model_constraints',
    'simulation_scenario_inputs','simulation_scenario_assumptions','simulation_scenario_constraints',
    'simulation_run_status_history','simulation_run_inputs',
    'simulation_iterations','simulation_iteration_summaries','simulation_distributions','simulation_percentiles',
    'simulation_result_metrics','simulation_result_evidence',
    'simulation_risk_results','simulation_sensitivity_results','simulation_failure_modes',
    'scenario_comparison_members','scenario_comparison_results',
    'simulation_validation_results','simulation_calibration_results',
    'simulation_insight_package_versions','simulation_publication_events',
    'simulation_component_registry_versions','simulation_deployment_rollbacks'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON simulation.%1$s FOR EACH ROW EXECUTE FUNCTION simulation.forbid_mutation();',
      t
    );
  END LOOP;
END $$;

-- ── immutable-once-active guard: simulation_models / simulation_model_versions ──

CREATE OR REPLACE FUNCTION simulation.enforce_model_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('active','retired') AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'simulation.simulation_models: active or retired models cannot revert to draft'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_model_immutability
  BEFORE UPDATE ON simulation.simulation_models
  FOR EACH ROW EXECUTE FUNCTION simulation.enforce_model_immutability();

CREATE OR REPLACE FUNCTION simulation.enforce_model_version_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('active','retired') AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'simulation.simulation_model_versions: active or retired versions cannot revert to draft'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_model_version_immutability
  BEFORE UPDATE ON simulation.simulation_model_versions
  FOR EACH ROW EXECUTE FUNCTION simulation.enforce_model_version_immutability();

-- ── immutable-once-active guard: simulation_scenarios / simulation_scenario_versions ──

CREATE OR REPLACE FUNCTION simulation.enforce_scenario_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('active','retired') AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'simulation.simulation_scenarios: active or retired scenarios cannot revert to draft'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_scenario_immutability
  BEFORE UPDATE ON simulation.simulation_scenarios
  FOR EACH ROW EXECUTE FUNCTION simulation.enforce_scenario_immutability();

CREATE OR REPLACE FUNCTION simulation.enforce_scenario_version_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('active','retired') AND NEW.status = 'draft' THEN
    RAISE EXCEPTION 'simulation.simulation_scenario_versions: active or retired versions cannot revert to draft'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_scenario_version_immutability
  BEFORE UPDATE ON simulation.simulation_scenario_versions
  FOR EACH ROW EXECUTE FUNCTION simulation.enforce_scenario_version_immutability();

-- ── immutable-once-published guard: simulation_results / simulation_result_versions ──

CREATE OR REPLACE FUNCTION simulation.enforce_result_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'simulation.simulation_results: published results are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_result_immutability
  BEFORE UPDATE ON simulation.simulation_results
  FOR EACH ROW EXECUTE FUNCTION simulation.enforce_result_immutability();

CREATE OR REPLACE FUNCTION simulation.enforce_result_version_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'simulation.simulation_result_versions: published result versions are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_result_version_immutability
  BEFORE UPDATE ON simulation.simulation_result_versions
  FOR EACH ROW EXECUTE FUNCTION simulation.enforce_result_version_immutability();

-- ── lifecycle-transition guard: simulation_publication_packages ─────────────────

CREATE OR REPLACE FUNCTION simulation.enforce_publication_transition()
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
    RAISE EXCEPTION 'simulation.simulation_publication_packages: forbidden transition % -> %', OLD.publication_status, NEW.publication_status
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_publication_transition
  BEFORE UPDATE ON simulation.simulation_publication_packages
  FOR EACH ROW EXECUTE FUNCTION simulation.enforce_publication_transition();

-- ── outbox helper (mirrors business_digital_twin.emit_outbox_event) ────────────

CREATE OR REPLACE FUNCTION simulation.emit_outbox_event(
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

-- ── per-event wrapper functions (10 required sim.* events) ─────────────────────

CREATE OR REPLACE FUNCTION simulation.emit_intake_received(
  p_tenant_id uuid, p_workspace_id uuid, p_simulation_intake_package_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN simulation.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'sim.intake.received', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('simulationIntakePackageId', p_simulation_intake_package_id),
    'simulation_intake_package', p_simulation_intake_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION simulation.emit_scenario_created(
  p_tenant_id uuid, p_workspace_id uuid, p_scenario_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN simulation.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'sim.scenario.created', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('scenarioVersionId', p_scenario_version_id),
    'simulation_scenario_version', p_scenario_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION simulation.emit_run_requested(
  p_tenant_id uuid, p_workspace_id uuid, p_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN simulation.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'sim.run.requested', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('runId', p_run_id),
    'simulation_run', p_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION simulation.emit_run_started(
  p_tenant_id uuid, p_workspace_id uuid, p_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN simulation.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'sim.run.started', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('runId', p_run_id),
    'simulation_run', p_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION simulation.emit_run_completed(
  p_tenant_id uuid, p_workspace_id uuid, p_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN simulation.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'sim.run.completed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('runId', p_run_id),
    'simulation_run', p_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION simulation.emit_run_failed(
  p_tenant_id uuid, p_workspace_id uuid, p_run_id uuid, p_failure_code text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN simulation.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'sim.run.failed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('runId', p_run_id, 'failureCode', p_failure_code),
    'simulation_run', p_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION simulation.emit_result_published(
  p_tenant_id uuid, p_workspace_id uuid, p_result_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN simulation.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'sim.result.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('resultVersionId', p_result_version_id),
    'simulation_result_version', p_result_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION simulation.emit_risk_calculated(
  p_tenant_id uuid, p_workspace_id uuid, p_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN simulation.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'sim.risk.calculated', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('runId', p_run_id),
    'simulation_run', p_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION simulation.emit_sensitivity_completed(
  p_tenant_id uuid, p_workspace_id uuid, p_sensitivity_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN simulation.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'sim.sensitivity.completed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('sensitivityRunId', p_sensitivity_run_id),
    'simulation_sensitivity_run', p_sensitivity_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION simulation.emit_data_published(
  p_tenant_id uuid, p_workspace_id uuid, p_simulation_publication_package_id uuid, p_target_layer text, p_target_block text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_target_layer NOT IN ('ai_decision_intelligence') THEN
    RAISE EXCEPTION 'simulation.emit_data_published: invalid target layer %', p_target_layer
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN simulation.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'sim.data.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('simulationPublicationPackageId', p_simulation_publication_package_id, 'targetLayer', p_target_layer, 'targetBlock', p_target_block),
    'simulation_publication_package', p_simulation_publication_package_id
  );
END;
$$;

INSERT INTO _migrations (filename) VALUES ('0076_create_sim_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
