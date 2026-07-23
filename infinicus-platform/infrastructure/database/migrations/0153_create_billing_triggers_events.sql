-- Migration: 0153_create_billing_triggers_events
-- BUILD-28 — updated_at triggers, append-only guard, and outbox event
-- emission for the billing schema.
--
-- Unlike most other domains' emit_* wrapper functions (found by BUILD-28's
-- own predecessor, BUILD-27, to be almost entirely orphaned — defined but
-- never called from any repository), the two functions below are each
-- called directly from packages/database/src/repositories/billing — see
-- SubscriptionRepository.transitionStatus() and
-- UsageRepository.incrementAndCheck(). Deliberately kept to exactly the
-- events genuinely emitted, not a speculative full event catalog.

BEGIN;

-- ── updated_at triggers ──────────────────────────────────────────────────────
-- Reuses set_updated_at() from Stage 1 (0001_foundation.sql).

CREATE TRIGGER set_updated_at_billing_plans
  BEFORE UPDATE ON billing.plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_billing_subscriptions
  BEFORE UPDATE ON billing.subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER set_updated_at_billing_usage_records
  BEFORE UPDATE ON billing.usage_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── append-only guard: billing.subscription_status_history ──────────────────
-- Reuses the same forbid_mutation() pattern established across every other
-- domain's *_status_history table (e.g. simulation.simulation_run_status_history,
-- migration 0076).

CREATE OR REPLACE FUNCTION billing.forbid_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'billing.%: append-only table — % is not permitted', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'raise_exception';
END;
$$;

CREATE TRIGGER forbid_mutation_subscription_status_history
  BEFORE UPDATE OR DELETE ON billing.subscription_status_history
  FOR EACH ROW EXECUTE FUNCTION billing.forbid_mutation();

-- ── outbox helper (mirrors business_digital_twin.emit_outbox_event) ────────────

CREATE OR REPLACE FUNCTION billing.emit_outbox_event(
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

-- ── Event: billing.subscription.status_changed ──────────────────────────────
-- Called for every transition: creation (from_status NULL), trial start,
-- activation, past_due, grace_period, suspension, reactivation, and
-- cancellation — one generic wrapper covering every case actually emitted,
-- called from SubscriptionRepository.transitionStatus() in the same
-- transaction as the status_history row it accompanies.

CREATE OR REPLACE FUNCTION billing.emit_subscription_status_changed(
  p_tenant_id uuid, p_workspace_id uuid, p_subscription_id uuid,
  p_from_status text, p_to_status text, p_correlation_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN billing.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'billing.subscription.status_changed', '1.0', p_correlation_id, NULL,
    jsonb_build_object('subscriptionId', p_subscription_id, 'fromStatus', p_from_status, 'toStatus', p_to_status),
    'subscription', p_subscription_id
  );
END;
$$;

-- ── Event: billing.usage.limit_exceeded ──────────────────────────────────────
-- Called from UsageRepository.incrementAndCheck() when a metered action
-- would exceed the tenant's plan limit and is rejected.

CREATE OR REPLACE FUNCTION billing.emit_usage_limit_exceeded(
  p_tenant_id uuid, p_workspace_id uuid, p_metric text, p_limit_value bigint, p_attempted_quantity bigint,
  p_correlation_id uuid
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN billing.emit_outbox_event(
    p_tenant_id, p_workspace_id, 'billing.usage.limit_exceeded', '1.0', p_correlation_id, NULL,
    jsonb_build_object('metric', p_metric, 'limitValue', p_limit_value, 'attemptedQuantity', p_attempted_quantity),
    'usage_record', gen_random_uuid()
  );
END;
$$;

INSERT INTO _migrations (filename) VALUES ('0153_create_billing_triggers_events.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
