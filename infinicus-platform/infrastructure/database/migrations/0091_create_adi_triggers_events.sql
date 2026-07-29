-- Migration: 0091_create_adi_triggers_events
-- Stage 2G — AI Decision Intelligence: updated_at triggers, append-only enforcement,
--            lifecycle-transition guards, outbox event functions

BEGIN;

-- ── updated_at triggers (mutable header tables only) ────────────────────────────
-- Reuses set_updated_at() from Stage 1 (0001_foundation.sql).

CREATE TRIGGER set_updated_at_adi_intake_packages BEFORE UPDATE ON ai_decision_intelligence.adi_intake_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_decision_questions BEFORE UPDATE ON ai_decision_intelligence.decision_questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_decision_cases BEFORE UPDATE ON ai_decision_intelligence.decision_cases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_reasoning_runs BEFORE UPDATE ON ai_decision_intelligence.reasoning_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_decision_evidence BEFORE UPDATE ON ai_decision_intelligence.decision_evidence FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_decision_alternatives BEFORE UPDATE ON ai_decision_intelligence.decision_alternatives FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_decision_recommendations BEFORE UPDATE ON ai_decision_intelligence.decision_recommendations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_decision_policies BEFORE UPDATE ON ai_decision_intelligence.decision_policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_decision_monitoring_requirements BEFORE UPDATE ON ai_decision_intelligence.decision_monitoring_requirements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_decision_review_schedules BEFORE UPDATE ON ai_decision_intelligence.decision_review_schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_adi_insight_packages BEFORE UPDATE ON ai_decision_intelligence.adi_insight_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_adi_publication_packages BEFORE UPDATE ON ai_decision_intelligence.adi_publication_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_adi_component_registry BEFORE UPDATE ON ai_decision_intelligence.adi_component_registry FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_adi_deployments BEFORE UPDATE ON ai_decision_intelligence.adi_deployments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── append-only enforcement ─────────────────────────────────────────────────────
-- Historical/evidence tables reject UPDATE and DELETE unconditionally, even for
-- roles that would otherwise be granted those privileges.
--
-- decision_recommendation_versions is intentionally EXCLUDED from this list — it
-- is the only _versions table in this schema carrying its own independent status
-- column (repositories update it in place for validate/publish transitions),
-- matching the BUILD-12/13-established design fix: it gets a dedicated
-- narrowly-scoped guard below instead of unconditional append-only enforcement.

CREATE OR REPLACE FUNCTION ai_decision_intelligence.forbid_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'ai_decision_intelligence.%: append-only table — % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'raise_exception';
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'adi_intake_package_versions','adi_intake_source_references','adi_intake_status_history',
    'decision_question_versions','decision_objectives','decision_constraints',
    'decision_case_versions','decision_case_status_history','decision_case_inputs',
    'reasoning_run_steps','reasoning_run_status_history',
    'decision_evidence_versions','decision_evidence_links','decision_evidence_quality',
    'decision_alternative_versions','alternative_outcome_estimates','alternative_risk_profiles',
    'recommendation_rationales','recommendation_implementation_steps',
    'decision_confidence_scores','decision_uncertainties','decision_limitations','decision_assumptions',
    'decision_policy_versions','decision_policy_evaluations','decision_guardrail_violations',
    'decision_monitoring_metrics',
    'adi_insight_package_versions','adi_publication_events',
    'adi_component_registry_versions','adi_deployment_rollbacks'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON ai_decision_intelligence.%1$s FOR EACH ROW EXECUTE FUNCTION ai_decision_intelligence.forbid_mutation();',
      t
    );
  END LOOP;
END $$;

-- ── immutable-once-published guard: decision_recommendations / decision_recommendation_versions ──
-- Published recommendations must be immutable — downstream ADI publication packages
-- and the ADI-to-ABA handoff reference them by id and version number.

CREATE OR REPLACE FUNCTION ai_decision_intelligence.enforce_recommendation_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'ai_decision_intelligence.decision_recommendations: published recommendations are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_recommendation_immutability
  BEFORE UPDATE ON ai_decision_intelligence.decision_recommendations
  FOR EACH ROW EXECUTE FUNCTION ai_decision_intelligence.enforce_recommendation_immutability();

CREATE OR REPLACE FUNCTION ai_decision_intelligence.enforce_recommendation_version_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = 'published' AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'ai_decision_intelligence.decision_recommendation_versions: published recommendation versions are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_recommendation_version_immutability
  BEFORE UPDATE ON ai_decision_intelligence.decision_recommendation_versions
  FOR EACH ROW EXECUTE FUNCTION ai_decision_intelligence.enforce_recommendation_version_immutability();

-- ── lifecycle-transition guard: adi_publication_packages ────────────────────────

CREATE OR REPLACE FUNCTION ai_decision_intelligence.enforce_publication_transition()
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
    RAISE EXCEPTION 'ai_decision_intelligence.adi_publication_packages: forbidden transition % -> %', OLD.publication_status, NEW.publication_status
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_publication_transition
  BEFORE UPDATE ON ai_decision_intelligence.adi_publication_packages
  FOR EACH ROW EXECUTE FUNCTION ai_decision_intelligence.enforce_publication_transition();

-- ── outbox helper (mirrors simulation.emit_outbox_event) ────────────────────────

CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_outbox_event(
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

-- ── per-event wrapper functions (10 required adi.* events) ──────────────────────

CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_intake_received(
  p_tenant_id uuid, p_workspace_id uuid, p_adi_intake_package_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN ai_decision_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'adi.intake.received', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('adiIntakePackageId', p_adi_intake_package_id),
    'adi_intake_package', p_adi_intake_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_reasoning_started(
  p_tenant_id uuid, p_workspace_id uuid, p_reasoning_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN ai_decision_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'adi.reasoning.started', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('reasoningRunId', p_reasoning_run_id),
    'reasoning_run', p_reasoning_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_reasoning_completed(
  p_tenant_id uuid, p_workspace_id uuid, p_reasoning_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN ai_decision_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'adi.reasoning.completed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('reasoningRunId', p_reasoning_run_id),
    'reasoning_run', p_reasoning_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_reasoning_failed(
  p_tenant_id uuid, p_workspace_id uuid, p_reasoning_run_id uuid, p_failure_code text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN ai_decision_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'adi.reasoning.failed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('reasoningRunId', p_reasoning_run_id, 'failureCode', p_failure_code),
    'reasoning_run', p_reasoning_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_alternative_evaluated(
  p_tenant_id uuid, p_workspace_id uuid, p_alternative_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN ai_decision_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'adi.alternative.evaluated', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('alternativeVersionId', p_alternative_version_id),
    'decision_alternative_version', p_alternative_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_recommendation_generated(
  p_tenant_id uuid, p_workspace_id uuid, p_recommendation_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN ai_decision_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'adi.recommendation.generated', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('recommendationVersionId', p_recommendation_version_id),
    'decision_recommendation_version', p_recommendation_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_confidence_calculated(
  p_tenant_id uuid, p_workspace_id uuid, p_confidence_score_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN ai_decision_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'adi.confidence.calculated', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('confidenceScoreId', p_confidence_score_id),
    'decision_confidence_score', p_confidence_score_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_guardrail_violated(
  p_tenant_id uuid, p_workspace_id uuid, p_guardrail_violation_id uuid, p_severity text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN ai_decision_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'adi.guardrail.violated', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('guardrailViolationId', p_guardrail_violation_id, 'severity', p_severity),
    'decision_guardrail_violation', p_guardrail_violation_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_decision_published(
  p_tenant_id uuid, p_workspace_id uuid, p_recommendation_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN ai_decision_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'adi.decision.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('recommendationVersionId', p_recommendation_version_id),
    'decision_recommendation_version', p_recommendation_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION ai_decision_intelligence.emit_data_published(
  p_tenant_id uuid, p_workspace_id uuid, p_adi_publication_package_id uuid, p_target_layer text, p_target_block text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_target_layer NOT IN ('approved_business_action') THEN
    RAISE EXCEPTION 'ai_decision_intelligence.emit_data_published: invalid target layer %', p_target_layer
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN ai_decision_intelligence.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'adi.data.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('adiPublicationPackageId', p_adi_publication_package_id, 'targetLayer', p_target_layer, 'targetBlock', p_target_block),
    'adi_publication_package', p_adi_publication_package_id
  );
END;
$$;

INSERT INTO _migrations (filename) VALUES ('0091_create_adi_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
