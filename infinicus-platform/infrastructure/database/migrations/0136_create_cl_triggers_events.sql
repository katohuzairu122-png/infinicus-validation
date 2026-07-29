-- Migration: 0136_create_cl_triggers_events
-- Stage 2J — Continuous Learning: updated_at triggers, append-only
--            enforcement, lifecycle-transition guards, outbox event functions

BEGIN;

-- ── updated_at triggers (mutable header tables only) ────────────────────────────
-- Reuses set_updated_at() from Stage 1 (0001_foundation.sql).

CREATE TRIGGER set_updated_at_cl_intake_packages BEFORE UPDATE ON continuous_learning.cl_intake_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_learning_cases BEFORE UPDATE ON continuous_learning.learning_cases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_learning_feedback_records BEFORE UPDATE ON continuous_learning.learning_feedback_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_learned_lessons BEFORE UPDATE ON continuous_learning.learned_lessons FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_learning_patterns BEFORE UPDATE ON continuous_learning.learning_patterns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_model_evaluation_runs BEFORE UPDATE ON continuous_learning.model_evaluation_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_policy_evaluation_runs BEFORE UPDATE ON continuous_learning.policy_evaluation_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_policy_change_proposals BEFORE UPDATE ON continuous_learning.policy_change_proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_improvement_proposals BEFORE UPDATE ON continuous_learning.improvement_proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_learning_change_reviews BEFORE UPDATE ON continuous_learning.learning_change_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_knowledge_artifacts BEFORE UPDATE ON continuous_learning.knowledge_artifacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_cl_feedback_packages BEFORE UPDATE ON continuous_learning.cl_feedback_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_cl_component_registry BEFORE UPDATE ON continuous_learning.cl_component_registry FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_cl_deployments BEFORE UPDATE ON continuous_learning.cl_deployments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── append-only enforcement ─────────────────────────────────────────────────────
-- Historical/evidence tables reject UPDATE and DELETE unconditionally, even for
-- roles that would otherwise be granted those privileges.
--
-- improvement_proposal_versions is intentionally EXCLUDED from this list — it is
-- the only _versions table in this schema carrying its own independent status
-- column (repositories update it in place for the approve/reject transition),
-- matching the BUILD-12/13/14/15/16-established design fix: it gets a dedicated
-- narrowly-scoped guard below instead of unconditional append-only enforcement.

CREATE OR REPLACE FUNCTION continuous_learning.forbid_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'continuous_learning.%: append-only table — % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'raise_exception';
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cl_intake_package_versions','cl_intake_source_references','cl_intake_status_history',
    'learning_case_versions','learning_case_status_history','learning_case_evidence',
    'learning_feedback_versions','learning_feedback_links','learning_feedback_quality',
    'learned_lesson_versions','lesson_evidence','lesson_applicability',
    'learning_pattern_versions','pattern_observations','pattern_confidence_scores',
    'model_evaluation_results','model_drift_records','model_bias_records',
    'policy_evaluation_results','policy_change_evidence',
    'improvement_impacts','improvement_risks',
    'learning_change_decisions','learning_change_releases','learning_change_rollbacks',
    'knowledge_artifact_versions','knowledge_relationships','knowledge_supersessions',
    'cl_feedback_package_versions','cl_feedback_events',
    'cl_component_registry_versions','cl_deployment_rollbacks'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON continuous_learning.%1$s FOR EACH ROW EXECUTE FUNCTION continuous_learning.forbid_mutation();',
      t
    );
  END LOOP;
END $$;

-- ── immutable-once-decided guard: improvement_proposals / improvement_proposal_versions ──
-- A proposal, once approved or rejected, is where CL exercises its actual
-- change-proposal authority — it must be permanently immutable. Learning may
-- propose governed changes but must never silently mutate frozen historical
-- evidence, decisions, approvals, or outcomes.

CREATE OR REPLACE FUNCTION continuous_learning.enforce_proposal_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('approved','rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'continuous_learning.improvement_proposals: decided proposals are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_proposal_immutability
  BEFORE UPDATE ON continuous_learning.improvement_proposals
  FOR EACH ROW EXECUTE FUNCTION continuous_learning.enforce_proposal_immutability();

CREATE OR REPLACE FUNCTION continuous_learning.enforce_proposal_version_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('approved','rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'continuous_learning.improvement_proposal_versions: decided proposal versions are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_proposal_version_immutability
  BEFORE UPDATE ON continuous_learning.improvement_proposal_versions
  FOR EACH ROW EXECUTE FUNCTION continuous_learning.enforce_proposal_version_immutability();

-- ── lifecycle-transition guard: cl_feedback_packages ─────────────────────────────

CREATE OR REPLACE FUNCTION continuous_learning.enforce_publication_transition()
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
    RAISE EXCEPTION 'continuous_learning.cl_feedback_packages: forbidden transition % -> %', OLD.publication_status, NEW.publication_status
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_publication_transition
  BEFORE UPDATE ON continuous_learning.cl_feedback_packages
  FOR EACH ROW EXECUTE FUNCTION continuous_learning.enforce_publication_transition();

-- ── outbox helper (mirrors outcome_monitoring.emit_outbox_event) ────────────────

CREATE OR REPLACE FUNCTION continuous_learning.emit_outbox_event(
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

-- ── per-event wrapper functions (10 required cl.* events) ───────────────────────

CREATE OR REPLACE FUNCTION continuous_learning.emit_intake_received(
  p_tenant_id uuid, p_workspace_id uuid, p_cl_intake_package_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN continuous_learning.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'cl.intake.received', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('clIntakePackageId', p_cl_intake_package_id),
    'cl_intake_package', p_cl_intake_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION continuous_learning.emit_case_created(
  p_tenant_id uuid, p_workspace_id uuid, p_learning_case_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN continuous_learning.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'cl.case.created', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('learningCaseId', p_learning_case_id),
    'learning_case', p_learning_case_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION continuous_learning.emit_lesson_created(
  p_tenant_id uuid, p_workspace_id uuid, p_learned_lesson_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN continuous_learning.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'cl.lesson.created', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('learnedLessonId', p_learned_lesson_id),
    'learned_lesson', p_learned_lesson_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION continuous_learning.emit_pattern_detected(
  p_tenant_id uuid, p_workspace_id uuid, p_learning_pattern_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN continuous_learning.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'cl.pattern.detected', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('learningPatternId', p_learning_pattern_id),
    'learning_pattern', p_learning_pattern_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION continuous_learning.emit_model_drift_detected(
  p_tenant_id uuid, p_workspace_id uuid, p_model_drift_record_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN continuous_learning.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'cl.model.drift_detected', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('modelDriftRecordId', p_model_drift_record_id),
    'model_drift_record', p_model_drift_record_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION continuous_learning.emit_policy_evaluated(
  p_tenant_id uuid, p_workspace_id uuid, p_policy_evaluation_run_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN continuous_learning.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'cl.policy.evaluated', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('policyEvaluationRunId', p_policy_evaluation_run_id),
    'policy_evaluation_run', p_policy_evaluation_run_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION continuous_learning.emit_improvement_proposed(
  p_tenant_id uuid, p_workspace_id uuid, p_improvement_proposal_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN continuous_learning.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'cl.improvement.proposed', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('improvementProposalId', p_improvement_proposal_id),
    'improvement_proposal', p_improvement_proposal_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION continuous_learning.emit_change_approved(
  p_tenant_id uuid, p_workspace_id uuid, p_proposal_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN continuous_learning.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'cl.change.approved', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('proposalVersionId', p_proposal_version_id),
    'improvement_proposal_version', p_proposal_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION continuous_learning.emit_feedback_published(
  p_tenant_id uuid, p_workspace_id uuid, p_cl_feedback_package_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN continuous_learning.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'cl.feedback.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('clFeedbackPackageId', p_cl_feedback_package_id),
    'cl_feedback_package', p_cl_feedback_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION continuous_learning.emit_data_published(
  p_tenant_id uuid, p_workspace_id uuid, p_cl_feedback_package_id uuid, p_target_layer text, p_target_block text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_target_layer NOT IN ('data_acquisition') THEN
    RAISE EXCEPTION 'continuous_learning.emit_data_published: invalid target layer %', p_target_layer
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN continuous_learning.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'cl.data.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('clFeedbackPackageId', p_cl_feedback_package_id, 'targetLayer', p_target_layer, 'targetBlock', p_target_block),
    'cl_feedback_package', p_cl_feedback_package_id
  );
END;
$$;

INSERT INTO _migrations (filename) VALUES ('0136_create_cl_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
