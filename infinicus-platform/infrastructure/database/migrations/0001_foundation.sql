-- Migration: 0001_foundation
-- Stage 1 — Tenants, workspaces, users, businesses, audit, platform events
-- PostgreSQL 15+. Run via: node packages/database/src/migrate.ts

BEGIN;

-- ── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- future full-text search

-- ── Migration registry ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS _migrations (
  id            SERIAL       PRIMARY KEY,
  filename      TEXT         NOT NULL UNIQUE,
  applied_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ── Tenants ──────────────────────────────────────────────────────────────────
-- Root of tenant isolation. Every query filters by tenant_id.

CREATE TABLE tenants (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           TEXT         NOT NULL UNIQUE,
  name           TEXT         NOT NULL,
  status         TEXT         NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','suspended','deleted')),
  plan           TEXT         NOT NULL DEFAULT 'trial',
  version        INTEGER      NOT NULL DEFAULT 1,
  source_system  TEXT         NOT NULL DEFAULT 'infinicus',
  correlation_id UUID         NOT NULL DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by     TEXT
);

CREATE INDEX idx_tenants_slug   ON tenants (slug);
CREATE INDEX idx_tenants_status ON tenants (status);

-- ── Workspaces ───────────────────────────────────────────────────────────────
-- Logical grouping within a tenant (e.g. division, team).

CREATE TABLE workspaces (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT         NOT NULL,
  status         TEXT         NOT NULL DEFAULT 'active'
                                CHECK (status IN ('active','archived','deleted')),
  version        INTEGER      NOT NULL DEFAULT 1,
  source_system  TEXT         NOT NULL DEFAULT 'infinicus',
  correlation_id UUID         NOT NULL DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by     TEXT,
  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_workspaces_tenant ON workspaces (tenant_id);

-- ── Users ────────────────────────────────────────────────────────────────────
-- Platform users. auth_provider_id links to Supabase / external auth.

CREATE TABLE users (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email              TEXT         NOT NULL,
  display_name       TEXT,
  auth_provider      TEXT         NOT NULL DEFAULT 'supabase',
  auth_provider_id   TEXT,                  -- external auth UID (never a password)
  status             TEXT         NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('active','suspended','deleted')),
  version            INTEGER      NOT NULL DEFAULT 1,
  source_system      TEXT         NOT NULL DEFAULT 'infinicus',
  correlation_id     UUID         NOT NULL DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by         TEXT,
  UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant        ON users (tenant_id);
CREATE INDEX idx_users_auth_provider ON users (auth_provider, auth_provider_id);

-- ── Workspace membership ─────────────────────────────────────────────────────

CREATE TABLE workspace_members (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID         NOT NULL REFERENCES tenants(id)    ON DELETE CASCADE,
  workspace_id   UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id        UUID         NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  role           TEXT         NOT NULL DEFAULT 'member'
                                CHECK (role IN ('owner','admin','member','viewer')),
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX idx_workspace_members_tenant    ON workspace_members (tenant_id);
CREATE INDEX idx_workspace_members_workspace ON workspace_members (workspace_id);
CREATE INDEX idx_workspace_members_user      ON workspace_members (user_id);

-- ── Businesses ───────────────────────────────────────────────────────────────
-- Core business entity. Supersedes D1 `businesses` table.
-- Carries BaseRecord fields plus industry/sector metadata.

CREATE TABLE businesses (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID         NOT NULL REFERENCES tenants(id)    ON DELETE CASCADE,
  workspace_id     UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name             TEXT         NOT NULL,
  industry         TEXT         NOT NULL,
  sector           TEXT,
  status           TEXT         NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active','archived','deleted')),
  version          INTEGER      NOT NULL DEFAULT 1,
  source_system    TEXT         NOT NULL DEFAULT 'infinicus',
  source_record_id TEXT,
  correlation_id   UUID         NOT NULL DEFAULT gen_random_uuid(),
  lineage          JSONB        NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_by       TEXT
);

CREATE INDEX idx_businesses_tenant    ON businesses (tenant_id);
CREATE INDEX idx_businesses_workspace ON businesses (workspace_id);
CREATE INDEX idx_businesses_status    ON businesses (tenant_id, status);

-- ── Audit log ────────────────────────────────────────────────────────────────
-- Append-only. One row per mutation on any tracked entity.

CREATE TABLE audit_log (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id   UUID,
  business_id    UUID,
  actor_id       UUID,
  actor_email    TEXT,
  entity_type    TEXT         NOT NULL,  -- e.g. 'business', 'simulation_run'
  entity_id      UUID         NOT NULL,
  action         TEXT         NOT NULL,  -- e.g. 'created', 'updated', 'deleted'
  before_state   JSONB,
  after_state    JSONB,
  correlation_id UUID         NOT NULL DEFAULT gen_random_uuid(),
  source_system  TEXT         NOT NULL DEFAULT 'infinicus',
  occurred_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_tenant     ON audit_log (tenant_id, occurred_at DESC);
CREATE INDEX idx_audit_entity     ON audit_log (entity_type, entity_id);
CREATE INDEX idx_audit_actor      ON audit_log (actor_id);
CREATE INDEX idx_audit_correlation ON audit_log (correlation_id);

-- ── Platform events ──────────────────────────────────────────────────────────
-- Append-only event store. Canonical PlatformEvent<T> from CLAUDE.md § 9.

CREATE TABLE platform_events (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  workspace_id    UUID,
  business_id     UUID,
  event_type      TEXT         NOT NULL,     -- e.g. 'da.data.published'
  event_version   TEXT         NOT NULL DEFAULT '1.0',
  correlation_id  UUID         NOT NULL,
  causation_id    UUID,
  source_layer    TEXT         NOT NULL,     -- DAL | BO | BI | DT | SIM | ADI | ABA | OM | CL
  source_block    TEXT         NOT NULL,
  payload         JSONB        NOT NULL DEFAULT '{}',
  occurred_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  published_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_events_tenant      ON platform_events (tenant_id, occurred_at DESC);
CREATE INDEX idx_platform_events_type        ON platform_events (tenant_id, event_type);
CREATE INDEX idx_platform_events_correlation ON platform_events (correlation_id);
CREATE INDEX idx_platform_events_business    ON platform_events (business_id, occurred_at DESC)
  WHERE business_id IS NOT NULL;
CREATE INDEX idx_platform_events_layer       ON platform_events (source_layer, occurred_at DESC);

-- ── Updated-at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tenants_updated_at    BEFORE UPDATE ON tenants    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_workspace_members_updated_at BEFORE UPDATE ON workspace_members FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row-level security ───────────────────────────────────────────────────────
-- Enable RLS on every table. Policies are applied by the API layer.

ALTER TABLE tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces        ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log         ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_events   ENABLE ROW LEVEL SECURITY;

-- Register this migration
INSERT INTO _migrations (filename) VALUES ('0001_foundation.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
