-- Migration: 0003_create_tenancy_schema
-- Stage 2A — Tenancy schema: canonical multi-tenant registry
-- Tables: tenants, workspaces, roles, permissions, role_permissions,
--         memberships, membership_roles, invitations

BEGIN;

CREATE SCHEMA IF NOT EXISTS tenancy;

-- ── tenancy.tenants ──────────────────────────────────────────────────────────

CREATE TABLE tenancy.tenants (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text        NOT NULL,
  slug             citext      NOT NULL UNIQUE,
  status           text        NOT NULL DEFAULT 'trial',
  plan_code        text,
  default_timezone text        NOT NULL DEFAULT 'UTC',
  default_currency text        NOT NULL DEFAULT 'USD',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid,
  deleted_at       timestamptz,
  CONSTRAINT tenants_status_check CHECK (status IN ('trial','active','suspended','closed'))
);

-- ── tenancy.workspaces ───────────────────────────────────────────────────────

CREATE TABLE tenancy.workspaces (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenancy.tenants(id) ON DELETE RESTRICT,
  name         text        NOT NULL,
  slug         citext      NOT NULL,
  status       text        NOT NULL DEFAULT 'active',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid,
  deleted_at   timestamptz,
  CONSTRAINT workspaces_status_check CHECK (status IN ('active','suspended','closed')),
  CONSTRAINT workspaces_tenant_slug_unique UNIQUE (tenant_id, slug)
);

-- ── tenancy.roles ────────────────────────────────────────────────────────────
-- System roles have tenant_id IS NULL; tenant-scoped roles reference a tenant.

CREATE TABLE tenancy.roles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid        REFERENCES tenancy.tenants(id) ON DELETE CASCADE,
  code        citext      NOT NULL,
  name        text        NOT NULL,
  description text,
  scope       text        NOT NULL DEFAULT 'tenant',
  is_system   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_scope_check CHECK (scope IN ('platform','tenant','workspace','business')),
  CONSTRAINT roles_code_tenant_unique UNIQUE (tenant_id, code)
);

-- ── tenancy.permissions ──────────────────────────────────────────────────────

CREATE TABLE tenancy.permissions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        citext      NOT NULL UNIQUE,
  resource    text        NOT NULL,
  action      text        NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── tenancy.role_permissions ─────────────────────────────────────────────────

CREATE TABLE tenancy.role_permissions (
  role_id       uuid NOT NULL REFERENCES tenancy.roles(id)       ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES tenancy.permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ── tenancy.memberships ──────────────────────────────────────────────────────
-- user_id FK to identity.users is added in 0004 after that schema exists.

CREATE TABLE tenancy.memberships (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  workspace_id uuid        NOT NULL REFERENCES tenancy.workspaces(id) ON DELETE RESTRICT,
  user_id      uuid        NOT NULL,
  status       text        NOT NULL DEFAULT 'invited',
  joined_at    timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid,
  CONSTRAINT memberships_status_check CHECK (status IN ('invited','active','suspended','removed')),
  CONSTRAINT memberships_user_workspace_unique UNIQUE (user_id, workspace_id)
);

-- ── tenancy.membership_roles ─────────────────────────────────────────────────

CREATE TABLE tenancy.membership_roles (
  membership_id uuid        NOT NULL REFERENCES tenancy.memberships(id) ON DELETE CASCADE,
  role_id       uuid        NOT NULL REFERENCES tenancy.roles(id)       ON DELETE RESTRICT,
  business_id   uuid,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  assigned_by   uuid,
  PRIMARY KEY (membership_id, role_id)
);

-- ── tenancy.invitations ──────────────────────────────────────────────────────

CREATE TABLE tenancy.invitations (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             uuid        NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE CASCADE,
  workspace_id          uuid        NOT NULL REFERENCES tenancy.workspaces(id) ON DELETE CASCADE,
  email                 citext      NOT NULL,
  invitation_token_hash text        NOT NULL,
  status                text        NOT NULL DEFAULT 'pending',
  expires_at            timestamptz NOT NULL,
  accepted_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid,
  CONSTRAINT invitations_status_check CHECK (status IN ('pending','accepted','expired','revoked'))
);

INSERT INTO _migrations (filename) VALUES ('0003_create_tenancy_schema.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
