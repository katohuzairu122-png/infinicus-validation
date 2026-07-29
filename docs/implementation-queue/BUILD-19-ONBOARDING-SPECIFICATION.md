# BUILD-19 SPECIFICATION — TENANT ONBOARDING

- **Build ID:** BUILD-19
- **Layer:** ONBOARDING
- **Dependency:** BUILD-18
- **Specification status:** FROZEN
- **Implementation status:** BLOCKED until BUILD-18 is completed
- **Purpose:** Deliver the Tenant Onboarding production-readiness capability without silently implementing later builds.

## 1. Entry gate

Before implementation:

1. verify `BUILD-18` is completed;
2. verify its completion report and checksum;
3. inspect current repository apps, packages, infrastructure, tests, and deployment conventions;
4. confirm no competing implementation already exists;
5. freeze exact files, providers, commands, and acceptance thresholds;
6. stop on any mismatch.

## 2. Required scope

- tenant creation;
- workspace creation;
- business creation;
- initial owner membership;
- default roles/settings;
- industry selection;
- initial data setup;
- team invitations;
- onboarding progress;
- resume/retry behavior;

## 3. Architecture rules

- Preserve the nine-layer INFINICUS authority model.
- Reuse existing identity, tenancy, event, audit, observability, configuration, and database foundations.
- Do not duplicate infrastructure.
- Use server-side enforcement for all security, authorization, billing, and entitlement decisions.
- Use strict TypeScript and controlled errors.
- Preserve tenant/workspace/business fail-closed isolation.
- Do not modify frozen migrations or historical records.
- Use atomic transactions and outbox events where state changes emit events.
- Add no later-build functionality.

## 4. Exact implementation specification required before coding

Claude must inspect the repository and freeze:

- exact files to create or modify;
- exact interfaces and types;
- exact database objects and migration range, if any;
- exact environment variables and secret ownership;
- exact API routes and schemas, if any;
- exact authorization and tenancy rules;
- exact UI routes and states, if any;
- exact operational controls;
- exact tests;
- exact validation commands;
- exact rollback procedure;
- exact out-of-scope boundaries.

No unresolved alternatives such as “either”, “consider”, or “possibly” may remain.

## 5. Security and privacy baseline

Mandatory:

- no secrets in source, browser bundles, logs, events, diagnostics, or errors;
- fail-closed authentication and authorization;
- tenant/workspace/business isolation;
- least privilege;
- input validation;
- output encoding;
- bounded payloads;
- controlled redacted errors;
- immutable audit evidence;
- retention and deletion rules where personal or business data is stored.

## 6. Testing baseline

Every build must include:

- unit tests;
- integration tests;
- authorization and tenant-isolation tests;
- failure-path tests;
- idempotency tests where relevant;
- migration tests where relevant;
- security tests;
- regression tests;
- build, lint, typecheck, and full test execution.

Production-facing builds must also include smoke, rollback, and acceptance evidence.

## 7. Documentation

Create build-specific documentation under:

```text
docs/production-readiness/
```

Required documents:

- architecture and scope;
- configuration;
- operating procedure;
- security controls;
- test evidence;
- rollback procedure;
- known limitations.

## 8. Queue transition

```text
BUILD-19: blocked -> ready after BUILD-18 completion
BUILD-19: ready -> in_progress -> completed
```

Do not automatically start the next build.

## 9. Completion report

```text
BUILD-19 COMPLETION REPORT — TENANT ONBOARDING

Build ID:
Layer:
Date:
Branch:
Specification:
Specification SHA-256:
Status:

WHAT WAS BUILT
FILES CREATED
FILES MODIFIED
ARCHITECTURE
SECURITY
TENANCY AND AUTHORIZATION
DATABASE CHANGES
API CHANGES
UI CHANGES
CONFIGURATION
OBSERVABILITY
TESTS
VALIDATION
ROLLBACK
REGRESSION RESULTS
OUT-OF-SCOPE CONFIRMATION
KNOWN LIMITATIONS
QUEUE TRANSITION

Commit:
Branch:
PR:
Next build:
```

## 10. Stop condition

Stop only when:

1. all required scope is implemented;
2. all tests and regressions pass;
3. security and tenancy controls pass;
4. documentation exists;
5. rollback is proven where relevant;
6. completion report exists;
7. queue state is updated;
8. the next build has not started.
