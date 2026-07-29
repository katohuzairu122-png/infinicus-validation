-- Migration: 0005_create_platform_schema
-- Stage 2A — Platform schema: core business structures
-- Tables: businesses, organization_units, departments, locations,
--         system_settings, feature_flags

BEGIN;

CREATE SCHEMA IF NOT EXISTS platform;

-- ── platform.businesses ──────────────────────────────────────────────────────

CREATE TABLE platform.businesses (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid        NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  workspace_id     uuid        NOT NULL REFERENCES tenancy.workspaces(id) ON DELETE RESTRICT,
  legal_name       text        NOT NULL,
  trading_name     text,
  business_code    citext      NOT NULL,
  industry         text,
  legal_structure  text,
  business_model   text,
  status           text        NOT NULL DEFAULT 'draft',
  version          integer     NOT NULL DEFAULT 1,
  source_system    text        NOT NULL DEFAULT 'INFINICUS',
  source_record_id text,
  correlation_id   uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at       timestamptz,
  CONSTRAINT businesses_status_check  CHECK (status IN ('draft','active','suspended','closed','archived')),
  CONSTRAINT businesses_version_check CHECK (version > 0),
  CONSTRAINT businesses_code_tenant_unique UNIQUE (tenant_id, business_code)
);

-- ── platform.organization_units ──────────────────────────────────────────────

CREATE TABLE platform.organization_units (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid        NOT NULL REFERENCES tenancy.tenants(id)        ON DELETE RESTRICT,
  workspace_id   uuid        NOT NULL REFERENCES tenancy.workspaces(id)     ON DELETE RESTRICT,
  business_id    uuid        NOT NULL REFERENCES platform.businesses(id)    ON DELETE RESTRICT,
  parent_unit_id uuid        REFERENCES platform.organization_units(id)     ON DELETE RESTRICT,
  name           text        NOT NULL,
  code           citext      NOT NULL,
  unit_type      text        NOT NULL,
  status         text        NOT NULL DEFAULT 'active',
  version        integer     NOT NULL DEFAULT 1,
  correlation_id uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at     timestamptz,
  CONSTRAINT org_units_type_check    CHECK (unit_type IN ('company','division','branch','department','team','location')),
  CONSTRAINT org_units_no_self_parent CHECK (id <> parent_unit_id)
);

-- ── platform.departments ─────────────────────────────────────────────────────

CREATE TABLE platform.departments (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL REFERENCES tenancy.tenants(id)        ON DELETE RESTRICT,
  workspace_id         uuid        NOT NULL REFERENCES tenancy.workspaces(id)     ON DELETE RESTRICT,
  business_id          uuid        NOT NULL REFERENCES platform.businesses(id)    ON DELETE RESTRICT,
  organization_unit_id uuid        REFERENCES platform.organization_units(id)     ON DELETE SET NULL,
  name                 text        NOT NULL,
  code                 citext      NOT NULL,
  description          text,
  status               text        NOT NULL DEFAULT 'active',
  version              integer     NOT NULL DEFAULT 1,
  correlation_id       uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at           timestamptz
);

-- ── platform.locations ───────────────────────────────────────────────────────

CREATE TABLE platform.locations (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid        NOT NULL REFERENCES tenancy.tenants(id)        ON DELETE RESTRICT,
  workspace_id         uuid        NOT NULL REFERENCES tenancy.workspaces(id)     ON DELETE RESTRICT,
  business_id          uuid        NOT NULL REFERENCES platform.businesses(id)    ON DELETE RESTRICT,
  organization_unit_id uuid        REFERENCES platform.organization_units(id)     ON DELETE SET NULL,
  name                 text        NOT NULL,
  location_type        text,
  country_code         text,
  region               text,
  city                 text,
  address_line_1       text,
  address_line_2       text,
  postal_code          text,
  timezone             text        NOT NULL DEFAULT 'UTC',
  status               text        NOT NULL DEFAULT 'active',
  version              integer     NOT NULL DEFAULT 1,
  correlation_id       uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid        REFERENCES identity.users(id) ON DELETE SET NULL,
  deleted_at           timestamptz
);

-- ── platform.system_settings ─────────────────────────────────────────────────

CREATE TABLE platform.system_settings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  scope      text        NOT NULL,
  scope_id   uuid,
  key        text        NOT NULL,
  value      jsonb       NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT system_settings_scope_check       CHECK (scope IN ('platform','tenant','workspace','business')),
  CONSTRAINT system_settings_key_scope_unique  UNIQUE (scope, scope_id, key)
);

-- ── platform.feature_flags ───────────────────────────────────────────────────

CREATE TABLE platform.feature_flags (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_code     citext      NOT NULL,
  scope         text        NOT NULL DEFAULT 'platform',
  scope_id      uuid,
  is_enabled    boolean     NOT NULL DEFAULT false,
  configuration jsonb       NOT NULL DEFAULT '{}',
  activated_at  timestamptz,
  expires_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_flags_scope_check        CHECK (scope IN ('platform','tenant','workspace','business')),
  CONSTRAINT feature_flags_code_scope_unique  UNIQUE (flag_code, scope, scope_id)
);

INSERT INTO _migrations (filename) VALUES ('0005_create_platform_schema.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
