# INFINICUS CI DATABASE VERIFICATION PLAN

Version: 1.0.0  
Scope: Continuous integration gates for the monorepo and PostgreSQL architecture

## 1. Objective

Ensure no migration, repository, RLS, event, or contract defect reaches the main branch.

## 2. Required CI stages

```text
checkout
install
workspace validation
format check
lint
typecheck
unit tests
PostgreSQL startup
database creation
migrations from empty database
migration idempotency
structural database tests
constraint tests
foreign-key tests
RLS tests
repository integration tests
event outbox/inbox tests
handoff contract tests
vertical-slice tests
build
artifact/report upload
```

## 3. PostgreSQL service

Use PostgreSQL 16 in CI.

Required databases or roles:

```text
migration/admin role with BYPASSRLS
application test role without BYPASSRLS
dedicated test database
```

Required environment variables:

```text
DATABASE_URL
ADMIN_DATABASE_URL
NODE_ENV=test
CI=true
```

Do not use production Neon credentials.

## 4. Integration-test behavior

```text
Local without DB: skip allowed with explicit message
CI without DB: fail immediately
```

Silent skipping in CI is prohibited.

## 5. Frozen migration guard

CI must detect modifications to frozen migration ranges.

Maintain a manifest:

```text
docs/database/FROZEN_MIGRATIONS.json
```

Record:

- migration filename;
- SHA-256;
- stage;
- frozen date.

Any checksum change fails CI unless accompanied by an approved defect record.

## 6. Migration tests

Verify:

- all migrations apply from empty DB;
- migration table records exact count;
- rerun applies zero new migrations;
- no duplicate objects;
- rollback strategy documented;
- required extensions exist;
- final schema count and table count match manifest.

## 7. Security tests

Verify:

- tenant A cannot access tenant B;
- workspace A cannot access workspace B;
- missing context fails closed;
- application role cannot bypass RLS;
- audit and provenance history are immutable;
- no `USING (true)` application policy;
- no plaintext secret columns;
- privileged functions have reviewed `SECURITY DEFINER` and safe search path.

## 8. Repository tests

Every production repository must pass:

- create;
- find;
- list;
- update/status transition;
- tenant isolation;
- workspace isolation;
- rollback;
- not-found behavior;
- correlation preservation;
- parameterized SQL.

## 9. Eventing tests

Verify:

- domain change and outbox event atomic;
- inbox deduplication;
- retry classification;
- dead-letter transition;
- replay audit;
- correlation chain;
- causation chain;
- unsupported version rejection.

## 10. Contract tests

Verify:

- event Zod schemas;
- handoff Zod schemas;
- registry uniqueness;
- version support;
- acknowledgement;
- rejection;
- revocation;
- quality thresholds;
- tenant/workspace mismatch.

## 11. Required merge gates

A PR cannot merge when:

- workspace validation fails;
- lint errors exist;
- type errors exist;
- tests fail;
- migrations fail;
- integration tests skip unexpectedly;
- frozen migration checksum changes;
- RLS verification fails;
- secrets scan fails;
- build fails.

Warnings may remain only when documented and non-security-critical.

## 12. Suggested workflow files

```text
.github/workflows/ci.yml
.github/workflows/database-integration.yml
.github/workflows/security-checks.yml
```

Start with one workflow if simpler, but retain separate logical jobs.

## 13. Reports

Upload:

```text
test results
coverage
migration report
schema manifest
RLS verification report
integration logs
build artifacts where required
```

Do not upload environment secrets or full sensitive payloads.

## 14. Branch protection

Require:

- pull request;
- passing CI;
- no direct push to main;
- migration review for database changes;
- code-owner review for contracts and security;
- resolved conversations;
- up-to-date branch.

## 15. Completion criteria

CI is complete when a fresh runner can build the monorepo, create PostgreSQL, apply all migrations, run all live tests, and fail correctly when isolation or frozen-migration rules are violated.
