-- Migration: 0004_create_identity_schema
-- Stage 2A — Identity schema: global users, sessions, service accounts, API keys
-- Tables: users, user_profiles, service_accounts, api_key_references, sessions
-- Also back-fills the FK from tenancy.memberships → identity.users.

BEGIN;

CREATE SCHEMA IF NOT EXISTS identity;

-- ── identity.users ───────────────────────────────────────────────────────────
-- Global user registry. No tenant_id — users exist across tenants.

CREATE TABLE identity.users (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             citext      NOT NULL UNIQUE,
  email_verified_at timestamptz,
  password_hash     text,                 -- bcrypt hash only; never plaintext
  status            text        NOT NULL DEFAULT 'pending',
  last_login_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  CONSTRAINT users_status_check CHECK (status IN ('pending','active','suspended','disabled','deleted'))
);

-- ── identity.user_profiles ───────────────────────────────────────────────────

CREATE TABLE identity.user_profiles (
  user_id        uuid    PRIMARY KEY REFERENCES identity.users(id) ON DELETE CASCADE,
  display_name   text,
  first_name     text,
  last_name      text,
  phone_number   text,
  locale         text        NOT NULL DEFAULT 'en',
  timezone       text        NOT NULL DEFAULT 'UTC',
  avatar_file_id uuid,          -- FK to files.file_objects added in 0008
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── identity.service_accounts ────────────────────────────────────────────────

CREATE TABLE identity.service_accounts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid        NOT NULL REFERENCES tenancy.tenants(id)    ON DELETE RESTRICT,
  workspace_id uuid        NOT NULL REFERENCES tenancy.workspaces(id) ON DELETE RESTRICT,
  name         text        NOT NULL,
  description  text,
  status       text        NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid,
  CONSTRAINT service_accounts_status_check CHECK (status IN ('active','suspended','disabled'))
);

-- ── identity.api_key_references ──────────────────────────────────────────────
-- Store only the key prefix and a hash. Raw API keys are never persisted.

CREATE TABLE identity.api_key_references (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_account_id uuid        NOT NULL REFERENCES identity.service_accounts(id) ON DELETE CASCADE,
  key_prefix         text        NOT NULL,
  key_hash           text        NOT NULL,
  scopes             jsonb       NOT NULL DEFAULT '[]',
  expires_at         timestamptz,
  revoked_at         timestamptz,
  last_used_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid
);

-- ── identity.sessions ────────────────────────────────────────────────────────
-- Session token is stored as a hash only. Raw tokens are never persisted.

CREATE TABLE identity.sessions (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid        NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  session_token_hash text        NOT NULL UNIQUE,
  ip_address         inet,
  user_agent         text,
  expires_at         timestamptz NOT NULL,
  revoked_at         timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ── Back-fill FK: tenancy.memberships → identity.users ───────────────────────

ALTER TABLE tenancy.memberships
  ADD CONSTRAINT memberships_user_fk
  FOREIGN KEY (user_id) REFERENCES identity.users(id) ON DELETE RESTRICT;

INSERT INTO _migrations (filename) VALUES ('0004_create_identity_schema.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
