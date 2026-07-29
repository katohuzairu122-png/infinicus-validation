-- Migration: 0106_create_aba_triggers_events
-- Stage 2H — Approved Business Action: updated_at triggers, append-only
--            enforcement, lifecycle-transition guards, outbox event functions

BEGIN;

-- ── updated_at triggers (mutable header tables only) ────────────────────────────
-- Reuses set_updated_at() from Stage 1 (0001_foundation.sql).

CREATE TRIGGER set_updated_at_aba_intake_packages BEFORE UPDATE ON approved_business_action.aba_intake_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_action_review_packages BEFORE UPDATE ON approved_business_action.action_review_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_approval_policies BEFORE UPDATE ON approved_business_action.approval_policies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_approver_assignments BEFORE UPDATE ON approved_business_action.approver_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_approval_delegations BEFORE UPDATE ON approved_business_action.approval_delegations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_approval_decisions BEFORE UPDATE ON approved_business_action.approval_decisions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_approved_actions BEFORE UPDATE ON approved_business_action.approved_actions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_action_execution_plans BEFORE UPDATE ON approved_business_action.action_execution_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_action_control_gates BEFORE UPDATE ON approved_business_action.action_control_gates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_approval_exceptions BEFORE UPDATE ON approved_business_action.approval_exceptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_approval_appeals BEFORE UPDATE ON approved_business_action.approval_appeals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_aba_publication_packages BEFORE UPDATE ON approved_business_action.aba_publication_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_aba_component_registry BEFORE UPDATE ON approved_business_action.aba_component_registry FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_aba_deployments BEFORE UPDATE ON approved_business_action.aba_deployments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── append-only enforcement ─────────────────────────────────────────────────────
-- Historical/evidence tables reject UPDATE and DELETE unconditionally, even for
-- roles that would otherwise be granted those privileges.
--
-- approval_decision_versions is intentionally EXCLUDED from this list — it is
-- the only _versions table in this schema carrying its own independent status
-- column (repositories update it in place for the approve/reject transition),
-- matching the BUILD-12/13/14-established design fix: it gets a dedicated
-- narrowly-scoped guard below instead of unconditional append-only enforcement.

CREATE OR REPLACE FUNCTION approved_business_action.forbid_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'approved_business_action.%: append-only table — % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'raise_exception';
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'aba_intake_package_versions','aba_intake_source_references','aba_intake_status_history',
    'action_review_package_versions','action_review_evidence','action_review_status_history',
    'approval_policy_versions','approval_policy_rules','approval_policy_evaluations',
    'approver_assignment_versions','approval_authority_scopes',
    'approval_decision_rationales','approval_decision_modifications',
    'approved_action_versions','approved_action_steps','approved_action_constraints',
    'action_execution_plan_versions','action_execution_dependencies','action_execution_windows',
    'action_control_gate_evaluations','action_holds','action_releases',
    'approval_exception_evidence','approval_appeal_decisions',
    'approval_attestations','approval_signatures','approval_audit_events',
    'aba_publication_package_versions','aba_publication_events',
    'aba_component_registry_versions','aba_deployment_rollbacks'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER forbid_mutation_%1$s BEFORE UPDATE OR DELETE ON approved_business_action.%1$s FOR EACH ROW EXECUTE FUNCTION approved_business_action.forbid_mutation();',
      t
    );
  END LOOP;
END $$;

-- ── immutable-once-decided guard: approval_decisions / approval_decision_versions ──
-- A decision, once approved, approved with modifications, or rejected, is where
-- ABA exercises its actual approval authority — it must be permanently immutable.

CREATE OR REPLACE FUNCTION approved_business_action.enforce_decision_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('approved','approved_with_modifications','rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'approved_business_action.approval_decisions: decided decisions are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_decision_immutability
  BEFORE UPDATE ON approved_business_action.approval_decisions
  FOR EACH ROW EXECUTE FUNCTION approved_business_action.enforce_decision_immutability();

CREATE OR REPLACE FUNCTION approved_business_action.enforce_decision_version_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('approved','approved_with_modifications','rejected') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'approved_business_action.approval_decision_versions: decided decision versions are immutable'
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_decision_version_immutability
  BEFORE UPDATE ON approved_business_action.approval_decision_versions
  FOR EACH ROW EXECUTE FUNCTION approved_business_action.enforce_decision_version_immutability();

-- ── lifecycle-transition guard: aba_publication_packages ────────────────────────

CREATE OR REPLACE FUNCTION approved_business_action.enforce_publication_transition()
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
    RAISE EXCEPTION 'approved_business_action.aba_publication_packages: forbidden transition % -> %', OLD.publication_status, NEW.publication_status
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_publication_transition
  BEFORE UPDATE ON approved_business_action.aba_publication_packages
  FOR EACH ROW EXECUTE FUNCTION approved_business_action.enforce_publication_transition();

-- ── outbox helper (mirrors ai_decision_intelligence.emit_outbox_event) ──────────

CREATE OR REPLACE FUNCTION approved_business_action.emit_outbox_event(
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

-- ── per-event wrapper functions (10 required aba.* events) ──────────────────────

CREATE OR REPLACE FUNCTION approved_business_action.emit_intake_received(
  p_tenant_id uuid, p_workspace_id uuid, p_aba_intake_package_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN approved_business_action.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'aba.intake.received', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('abaIntakePackageId', p_aba_intake_package_id),
    'aba_intake_package', p_aba_intake_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION approved_business_action.emit_review_requested(
  p_tenant_id uuid, p_workspace_id uuid, p_review_package_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN approved_business_action.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'aba.review.requested', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('reviewPackageId', p_review_package_id),
    'action_review_package', p_review_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION approved_business_action.emit_review_started(
  p_tenant_id uuid, p_workspace_id uuid, p_review_package_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN approved_business_action.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'aba.review.started', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('reviewPackageId', p_review_package_id),
    'action_review_package', p_review_package_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION approved_business_action.emit_action_approved(
  p_tenant_id uuid, p_workspace_id uuid, p_decision_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN approved_business_action.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'aba.action.approved', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('decisionVersionId', p_decision_version_id),
    'approval_decision_version', p_decision_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION approved_business_action.emit_action_approved_with_modifications(
  p_tenant_id uuid, p_workspace_id uuid, p_decision_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN approved_business_action.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'aba.action.approved_with_modifications', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('decisionVersionId', p_decision_version_id),
    'approval_decision_version', p_decision_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION approved_business_action.emit_action_rejected(
  p_tenant_id uuid, p_workspace_id uuid, p_decision_version_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN approved_business_action.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'aba.action.rejected', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('decisionVersionId', p_decision_version_id),
    'approval_decision_version', p_decision_version_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION approved_business_action.emit_action_held(
  p_tenant_id uuid, p_workspace_id uuid, p_action_hold_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN approved_business_action.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'aba.action.held', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('actionHoldId', p_action_hold_id),
    'action_hold', p_action_hold_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION approved_business_action.emit_action_released(
  p_tenant_id uuid, p_workspace_id uuid, p_action_release_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN approved_business_action.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'aba.action.released', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('actionReleaseId', p_action_release_id),
    'action_release', p_action_release_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION approved_business_action.emit_action_published(
  p_tenant_id uuid, p_workspace_id uuid, p_approved_action_id uuid, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN approved_business_action.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'aba.action.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('approvedActionId', p_approved_action_id),
    'approved_action', p_approved_action_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION approved_business_action.emit_data_published(
  p_tenant_id uuid, p_workspace_id uuid, p_aba_publication_package_id uuid, p_target_layer text, p_target_block text, p_correlation_id uuid, p_causation_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_target_layer NOT IN ('outcome_monitoring') THEN
    RAISE EXCEPTION 'approved_business_action.emit_data_published: invalid target layer %', p_target_layer
      USING ERRCODE = 'raise_exception';
  END IF;
  RETURN approved_business_action.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'aba.data.published', '1.0', p_correlation_id, p_causation_id,
    jsonb_build_object('abaPublicationPackageId', p_aba_publication_package_id, 'targetLayer', p_target_layer, 'targetBlock', p_target_block),
    'aba_publication_package', p_aba_publication_package_id
  );
END;
$$;

INSERT INTO _migrations (filename) VALUES ('0106_create_aba_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
