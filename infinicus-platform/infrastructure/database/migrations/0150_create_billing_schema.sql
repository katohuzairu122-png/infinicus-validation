-- Migration: 0150_create_billing_schema
-- BUILD-28 — Billing schema: plans, subscriptions, subscription status
-- history, usage metering.
--
-- billing.plans is global reference/catalog data (like tenancy.permissions,
-- migration 0003) — no tenant_id, no RLS, seeded by this migration and
-- managed by a future admin capability, not by the application role at
-- runtime. billing.subscriptions is one row per tenant (the tenant's
-- current subscription state); history of every status transition is kept
-- in the append-only billing.subscription_status_history, matching every
-- other domain's *_status_history convention (e.g. onboarding, simulation).
-- billing.usage_records meters consumption per tenant/metric/billing-period,
-- upserted atomically by the application (see packages/billing).

BEGIN;

CREATE SCHEMA IF NOT EXISTS billing;

-- ── billing.plans ────────────────────────────────────────────────────────────

CREATE TABLE billing.plans (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text        NOT NULL UNIQUE,
  name             text        NOT NULL,
  -- Catalog/display order, independent of price_cents: a "contact sales"
  -- plan (enterprise, priced externally and stored as 0 below) would
  -- otherwise tie with the free plan under a naive ORDER BY price_cents,
  -- an ambiguity real enough to break this build's own repository test
  -- when written against price-only ordering.
  sort_order       integer     NOT NULL DEFAULT 0,
  price_cents      integer     NOT NULL DEFAULT 0,
  currency         text        NOT NULL DEFAULT 'usd',
  billing_interval text        NOT NULL DEFAULT 'month',
  trial_days       integer     NOT NULL DEFAULT 0,
  -- Numeric limit fields; a JSON `null` value means "unlimited" (the
  -- enterprise plan below). Keys are the metric/resource names this
  -- build's enforcement code checks against — see
  -- packages/billing/src/EntitlementService.ts.
  limits           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  features         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plans_billing_interval_check CHECK (billing_interval IN ('month', 'year')),
  CONSTRAINT plans_price_cents_check CHECK (price_cents >= 0),
  CONSTRAINT plans_trial_days_check CHECK (trial_days >= 0)
);

COMMENT ON TABLE billing.plans IS
  'Global plan catalog (reference data, no tenant scope) — seeded by this migration, not tenant-writable.';

INSERT INTO billing.plans (code, name, sort_order, price_cents, currency, billing_interval, trial_days, limits, features) VALUES
  ('free', 'Free', 0, 0, 'usd', 'month', 0,
   '{"maxWorkspaces":1,"maxUsers":3,"simulationRunsPerMonth":20,"reasoningRunsPerMonth":20}',
   '{"apiAccess":false,"advancedAnalytics":false,"prioritySupport":false}'),
  ('pro', 'Pro', 1, 4900, 'usd', 'month', 14,
   '{"maxWorkspaces":5,"maxUsers":25,"simulationRunsPerMonth":500,"reasoningRunsPerMonth":500}',
   '{"apiAccess":true,"advancedAnalytics":true,"prioritySupport":false}'),
  ('enterprise', 'Enterprise', 2, 0, 'usd', 'month', 30,
   '{"maxWorkspaces":null,"maxUsers":null,"simulationRunsPerMonth":null,"reasoningRunsPerMonth":null}',
   '{"apiAccess":true,"advancedAnalytics":true,"prioritySupport":true}');

COMMENT ON COLUMN billing.plans.price_cents IS
  'Enterprise plan price is negotiated externally and stored as 0 here — this is a reference catalog, not a payment processor; the actual charge is out of this build''s scope (see known-limitations-build28.md).';

-- ── billing.subscriptions ────────────────────────────────────────────────────
-- One row per tenant: the tenant's current subscription. workspace_id is the
-- tenant's billing-owner workspace (its first/primary workspace), matching
-- the canonical shared fields in CLAUDE.md §7.

CREATE TABLE billing.subscriptions (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              uuid        NOT NULL UNIQUE REFERENCES tenancy.tenants(id) ON DELETE RESTRICT,
  workspace_id           uuid        NOT NULL REFERENCES tenancy.workspaces(id) ON DELETE RESTRICT,
  plan_id                uuid        NOT NULL REFERENCES billing.plans(id) ON DELETE RESTRICT,
  status                 text        NOT NULL DEFAULT 'trialing',
  trial_ends_at          timestamptz,
  current_period_start   timestamptz NOT NULL DEFAULT now(),
  current_period_end     timestamptz NOT NULL,
  grace_period_ends_at   timestamptz,
  payment_status         text        NOT NULL DEFAULT 'unknown',
  external_invoice_reference text,
  canceled_at            timestamptz,
  suspended_at           timestamptz,
  reactivated_at         timestamptz,
  correlation_id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_status_check CHECK (status IN (
    'trialing', 'active', 'past_due', 'grace_period', 'suspended', 'canceled'
  )),
  CONSTRAINT subscriptions_payment_status_check CHECK (payment_status IN (
    'unknown', 'paid', 'pending', 'failed'
  ))
);

COMMENT ON TABLE billing.subscriptions IS
  'One row per tenant: its current plan and billing lifecycle state. Historical transitions are in billing.subscription_status_history, not here.';
COMMENT ON COLUMN billing.subscriptions.external_invoice_reference IS
  'A reference string only (e.g. an external payment processor''s invoice id) — never raw payment/card data, per CLAUDE.md §12 (credential records store references, never secrets).';

-- ── billing.subscription_status_history ─────────────────────────────────────
-- Append-only audit trail (forbid_mutation trigger — see migration 0153),
-- matching every other domain's *_status_history convention.

CREATE TABLE billing.subscription_status_history (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid        NOT NULL,
  subscription_id uuid        NOT NULL REFERENCES billing.subscriptions(id) ON DELETE RESTRICT,
  from_status     text,
  to_status       text        NOT NULL,
  reason          text,
  correlation_id  uuid        NOT NULL DEFAULT gen_random_uuid(),
  occurred_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE billing.subscription_status_history IS
  'Append-only record of every subscription status transition. No UPDATE or DELETE is permitted (forbid_mutation trigger, migration 0153).';

-- ── billing.usage_records ────────────────────────────────────────────────────
-- One row per tenant/metric/billing-period; quantity is incremented
-- atomically by the application via INSERT ... ON CONFLICT DO UPDATE (see
-- packages/database/src/repositories/billing/UsageRepository.ts).

CREATE TABLE billing.usage_records (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES tenancy.tenants(id) ON DELETE RESTRICT,
  workspace_id   uuid        NOT NULL REFERENCES tenancy.workspaces(id) ON DELETE RESTRICT,
  metric         text        NOT NULL,
  period_start   timestamptz NOT NULL,
  period_end     timestamptz NOT NULL,
  quantity       bigint      NOT NULL DEFAULT 0,
  correlation_id uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT usage_records_metric_check CHECK (metric IN ('simulation_runs', 'reasoning_runs')),
  CONSTRAINT usage_records_quantity_check CHECK (quantity >= 0),
  CONSTRAINT usage_records_tenant_metric_period_unique UNIQUE (tenant_id, metric, period_start)
);

COMMENT ON TABLE billing.usage_records IS
  'Metered usage per tenant/metric/billing-period, incremented atomically via UPSERT and checked against the tenant''s plan limits before every metered action (see packages/billing/src/EntitlementService.ts).';

INSERT INTO _migrations (filename) VALUES ('0150_create_billing_schema.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
