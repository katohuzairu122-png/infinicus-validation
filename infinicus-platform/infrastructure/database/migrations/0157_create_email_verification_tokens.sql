-- Migration: 0157_create_email_verification_tokens
-- "Connect the public demo to the real backend" — accounts are now
-- activated immediately at registration (see AuthenticationService.register()),
-- but a real, separate email-ownership-verification mechanism still exists
-- and is tracked independently via identity.users.email_verified_at
-- (already present since 0004_create_identity_schema.sql, never wired to
-- anything until now).
--
-- Mirrors identity.sessions' own pattern exactly: identity.* is a global
-- registry (no tenant_id, no RLS — users exist across tenants), and only
-- the token's hash is ever persisted, never the raw token.

BEGIN;

CREATE TABLE identity.email_verification_tokens (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES identity.users(id) ON DELETE CASCADE,
  token_hash    text        NOT NULL UNIQUE,
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_verification_tokens_user_id_idx ON identity.email_verification_tokens (user_id);

COMMENT ON TABLE identity.email_verification_tokens IS
  'Single-use, short-lived tokens proving control of the email address on identity.users. Not an activation gate (see AuthenticationService.register()) — email_verified_at is tracked for its own sake, independent of account usability.';

INSERT INTO _migrations (filename) VALUES ('0157_create_email_verification_tokens.sql')
  ON CONFLICT (filename) DO NOTHING;

COMMIT;
