-- Migration: 0151_create_billing_indexes
-- BUILD-28 — Indexes for the billing schema.
-- tenant_id on billing.subscriptions is already indexed via its UNIQUE
-- constraint (one row per tenant); tenant_id/metric/period_start on
-- billing.usage_records is already indexed via its own UNIQUE constraint.

BEGIN;

CREATE INDEX idx_billing_plans_code            ON billing.plans (code) WHERE is_active;
CREATE INDEX idx_billing_plans_sort_order       ON billing.plans (sort_order) WHERE is_active;

CREATE INDEX idx_billing_subscriptions_status  ON billing.subscriptions (status);
-- Supports the lifecycle-audit script's scan for trials to expire.
CREATE INDEX idx_billing_subscriptions_trial_ends
  ON billing.subscriptions (trial_ends_at) WHERE status = 'trialing';
-- Supports the lifecycle-audit script's scan for grace periods to expire.
CREATE INDEX idx_billing_subscriptions_grace_ends
  ON billing.subscriptions (grace_period_ends_at) WHERE status = 'grace_period';
CREATE INDEX idx_billing_subscriptions_plan_id ON billing.subscriptions (plan_id);

CREATE INDEX idx_billing_status_history_subscription
  ON billing.subscription_status_history (subscription_id, occurred_at);
CREATE INDEX idx_billing_status_history_tenant
  ON billing.subscription_status_history (tenant_id, occurred_at);

CREATE INDEX idx_billing_usage_tenant_workspace
  ON billing.usage_records (tenant_id, workspace_id);

INSERT INTO _migrations (filename) VALUES ('0151_create_billing_indexes.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
