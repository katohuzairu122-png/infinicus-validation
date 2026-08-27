\# BUILD-31 — DATA ACQUISITION RUNTIME FOUNDATION — FROZEN SPECIFICATION



\## 1. BUILD IDENTITY



\* Build ID: `BUILD-31`

\* Layer: `DATA-ACQUISITION-RUNTIME`

\* Name: `Data Acquisition Runtime Foundation`

\* Dependency: `BUILD-30`

\* Status: `ready`

\* Runtime implementation included: `yes`

\* Database migration baseline before build: `0001–0168`

\* New migrations permitted: only where existing persistence cannot support the frozen runtime requirements

\* Primary objective: convert the existing Data Acquisition persistence layer and prototype blocks into a production TypeScript runtime exposed through the governed Fastify API



\---



\## 2. EXECUTION PRINCIPLE



BUILD-31 must implement the first production-grade Data Acquisition runtime slice without redesigning the existing architecture.



The implementation must reuse:



\* existing `data\_acquisition` database schema

\* migrations `0013–0022`

\* existing DA repositories

\* existing DA outbox SQL wrappers

\* existing Fastify application

\* existing Zod schema conventions

\* existing authentication

\* existing tenant and workspace context

\* existing permission system

\* existing idempotency enforcement

\* existing billing entitlement enforcement

\* existing error handling

\* existing observability conventions

\* existing repository transaction helpers

\* existing Business Operations persistence



BUILD-31 must not replace, duplicate, or bypass these systems.



\---



\## 3. CURRENT VERIFIED BASELINE



The following already exists and must be treated as authoritative.



\### 3.1 Existing database schema



The `data\_acquisition` schema already supports:



\* data sources

\* connectors

\* credential references

\* collection schedules

\* collection runs

\* webhook receipts

\* file intakes

\* API collection-run metadata

\* database collection-run metadata

\* manual submissions

\* stream events

\* detected schemas

\* validation policies

\* validation results

\* validation issues

\* cleaning and normalization records

\* entity resolution

\* deduplication

\* data classification

\* sensitive-data handling

\* quality scores

\* missing-data actions

\* source reliability

\* provenance

\* transformation records

\* publication packages

\* publication deliveries

\* deployment metadata

\* event outbox integration



\### 3.2 Existing repository classes



The database package already exports:



\* `DataSourceRepository`

\* `ConnectorRepository`

\* `CollectionRunRepository`

\* `ValidationResultRepository`

\* `DataQualityScoreRepository`

\* `ProvenanceRepository`

\* `PublicationPackageRepository`



\### 3.3 Existing permissions



The following permissions already exist:



\* `da:read`

\* `da:write`

\* `da:admin`



No replacement permission model may be introduced.



\### 3.4 Existing event wrappers



The following SQL functions already exist and must be used:



\* `data\_acquisition.emit\_source\_registered`

\* `data\_acquisition.emit\_connector\_registered`

\* `data\_acquisition.emit\_collection\_started`

\* `data\_acquisition.emit\_collection\_completed`

\* `data\_acquisition.emit\_collection\_failed`

\* `data\_acquisition.emit\_validation\_completed`

\* `data\_acquisition.emit\_data\_quarantined`

\* `data\_acquisition.emit\_data\_quality\_scored`

\* `data\_acquisition.emit\_data\_published`



Domain mutation and outbox emission must occur inside the same database transaction.



\### 3.5 Existing API conventions



The Fastify API already uses:



\* Fastify 5

\* `fastify-type-provider-zod`

\* Zod request and response schemas

\* versioned `/v1/...` routes

\* `app.authenticate`

\* `app.resolveTenantContext`

\* `app.requirePermission(...)`

\* `app.requireActiveSubscription()`

\* `app.requireIdempotencyKey`

\* centralized error handling

\* structured audit logging

\* OpenAPI documentation

\* bounded request payloads

\* rate limiting

\* correlation IDs



BUILD-31 must follow these conventions exactly.



\---



\## 4. FROZEN BUILD SCOPE



BUILD-31 must implement the following capabilities.



\### 4.1 Dedicated runtime package



Create:



```text

packages/data-acquisition-runtime/

├── package.json

├── tsconfig.json

├── src/

│   ├── index.ts

│   ├── errors.ts

│   ├── types.ts

│   ├── DataAcquisitionService.ts

│   ├── validation/

│   │   ├── ManualRecordValidator.ts

│   │   └── schemas.ts

│   ├── quality/

│   │   └── DataQualityScoringService.ts

│   ├── provenance/

│   │   └── ProvenanceService.ts

│   └── publication/

│       └── PublicationService.ts

└── tests/

```



The package name must be:



```json

"@infinicus/data-acquisition-runtime"

```



The package must be private and use the same build, lint, typecheck, test, and clean conventions as existing TypeScript packages.



\### 4.2 API integration



Create:



```text

apps/api/src/routes/dataAcquisition.ts

apps/api/src/schemas/dataAcquisition.ts

```



Register the route module in:



```text

apps/api/src/app.ts

```



Add the runtime package as a dependency of `apps/api`.



\### 4.3 Source lifecycle



Implement governed source-management operations.



Required endpoints:



```text

POST   /v1/businesses/:businessId/data-sources

GET    /v1/businesses/:businessId/data-sources

GET    /v1/businesses/:businessId/data-sources/:sourceId

PATCH  /v1/businesses/:businessId/data-sources/:sourceId/status

DELETE /v1/businesses/:businessId/data-sources/:sourceId

```



Required rules:



\* business must exist in the active tenant and workspace

\* source creation requires `da:write`

\* source reads require `da:read`

\* source deletion requires `da:admin`

\* write operations require an active subscription

\* mutation endpoints require an idempotency key

\* `sourceCode` must be tenant/workspace/business scoped and duplicate-safe

\* allowed source statuses must be explicit

\* status transitions must be validated

\* soft-deleted sources must not appear in normal lists

\* source registration must emit `da.source.registered`

\* raw credentials, access tokens, passwords, connection strings, and secret values must never be stored in source configuration



\### 4.4 Connector lifecycle



Required endpoints:



```text

POST  /v1/businesses/:businessId/data-sources/:sourceId/connectors

GET   /v1/businesses/:businessId/data-sources/:sourceId/connectors

GET   /v1/businesses/:businessId/data-sources/:sourceId/connectors/:connectorId

POST  /v1/businesses/:businessId/data-sources/:sourceId/connectors/:connectorId/health-check

PATCH /v1/businesses/:businessId/data-sources/:sourceId/connectors/:connectorId/status

```



Required rules:



\* connector must belong to the requested source

\* source must belong to the requested business

\* connector creation requires `da:write`

\* connector health and status administration require `da:admin`

\* raw credentials must not be accepted

\* only a `configurationReference` may identify external secret material

\* connector registration must emit `da.connector.registered`

\* health checks must return explicit healthy, degraded, or unhealthy results

\* the first implemented connector type must be `manual\_json`

\* unsupported connector types must fail closed with a controlled validation error



\### 4.5 Manual JSON intake



Implement manual JSON intake as the first production collection mode.



Required endpoint:



```text

POST /v1/businesses/:businessId/data-sources/:sourceId/manual-intakes

```



Required request fields:



\* optional connector ID

\* submission type

\* records array

\* optional submission notes

\* optional source reference

\* optional metadata



Required limits:



\* maximum records per request must be explicit and tested

\* maximum nested object depth must be bounded

\* maximum key count per record must be bounded

\* maximum string length must be bounded

\* request-body size must remain within the existing API payload limit

\* empty record arrays must be rejected

\* non-object records must be rejected



Required behavior:



1\. verify the business

2\. verify the source

3\. verify the connector when supplied

4\. create a collection run in `planned`

5\. transition the run to `collecting`

6\. emit `da.collection.started`

7\. persist the manual submission

8\. validate every record deterministically

9\. persist validation results and issues

10\. calculate a deterministic quality score

11\. create provenance records and hashes

12\. mark the run `validated`, `quarantined`, or `failed`

13\. emit all corresponding outbox events

14\. return the run summary



No process-local background execution may be used.



The manual-intake request must complete synchronously within the request lifecycle.



\### 4.6 Collection-run state machine



The runtime must enforce the following legal transitions:



```text

planned      -> collecting

scheduled    -> collecting

collecting   -> collected

collecting   -> failed

collecting   -> cancelled

collected    -> validated

collected    -> quarantined

validated    -> published

validated    -> quarantined

quarantined  -> validated

```



Terminal or guarded states:



```text

published

failed

cancelled

```



The following must be rejected:



\* starting an already started run

\* completing a failed run

\* publishing an unvalidated run

\* validating a cancelled run

\* transitioning backward without an explicit supported remediation path

\* completing or publishing the same run twice

\* state changes that do not match the current persisted state



State transitions must be guarded in SQL updates using the expected current state.



A generic not-found error must not be used for an invalid transition when the record exists.



Create a dedicated controlled error such as:



```text

InvalidStateTransitionError

```



\### 4.7 Repository extensions



Extend existing repositories only where required.



Expected additions include:



\#### `DataSourceRepository`



\* list by business

\* list with status filtering

\* duplicate-safe lookup by source code

\* guarded status transition

\* optional configuration update if required by the API



\#### `ConnectorRepository`



\* guarded status update

\* soft delete if required

\* update health with explicit status validation

\* lookup constrained by source



\#### `CollectionRunRepository`



\* list by business/source

\* guarded transitions

\* update request metadata

\* update checkpoint

\* mark collected

\* mark validated

\* mark quarantined

\* mark cancelled

\* mark published

\* increment retry attempt only through an explicit method



\#### `PublicationPackageRepository`



\* transition `draft` to `ready`

\* publish only from `ready`

\* revoke only from allowed states

\* distinguish not-found from invalid-state errors

\* list by business and status



Repository methods must remain tenant-scoped through `withTenantTransaction`.



\### 4.8 Manual submission persistence



If no repository currently exists for `data\_acquisition.manual\_submissions`, create one under:



```text

packages/database/src/repositories/da/ManualSubmissionRepository.ts

```



It must support:



\* create submission

\* find by ID

\* list by collection run

\* transition status using guarded updates

\* optional revision support only if required by the frozen endpoint



Export it through:



```text

packages/database/src/repositories/da/index.ts

packages/database/src/index.ts

```



\### 4.9 Validation engine



Implement deterministic validation for manual JSON records.



Minimum validation rules:



\* record must be an object

\* record must not be empty

\* keys must be non-empty strings

\* unsupported values must be rejected

\* `undefined`, functions, symbols, and non-JSON values must be rejected

\* numeric values must be finite

\* strings must remain within bounded length

\* nesting depth must remain within bounded depth

\* arrays must remain within bounded size

\* object key count must remain bounded

\* duplicate record detection must use a deterministic canonical representation

\* record-level validation issues must identify a field path where possible



Validation severities must be constrained to known values.



Validation results must include:



\* validity

\* error count

\* warning count

\* record reference

\* deterministic details

\* associated validation issues



After validation:



\* zero invalid records permits `validated`

\* one or more invalid records must produce either `quarantined` or a mixed accepted/rejected outcome according to the service policy

\* the service must not silently discard rejected records



\### 4.10 Quality scoring



Implement deterministic scores from `0` to `100` for:



\* completeness

\* validity

\* consistency

\* timeliness

\* uniqueness

\* conformity



Calculate an overall weighted score.



Default weights must:



\* be explicit constants

\* total `1.0`

\* be tested

\* remain deterministic



Minimum default weighting:



```text

completeness: 0.20

validity:     0.25

consistency:  0.15

timeliness:   0.10

uniqueness:   0.20

conformity:   0.10

```



Scoring rules must be documented in code and tests.



Quality thresholds:



```text

90–100  excellent

75–89   acceptable

50–74   degraded

0–49    unacceptable

```



A score must be persisted through `DataQualityScoreRepository`.



The scoring service must emit `da.data.quality\_scored`.



\### 4.11 Provenance and hashing



Each accepted record must receive deterministic provenance.



Required behavior:



\* canonicalize records before hashing

\* use SHA-256

\* hash the canonical JSON representation

\* create a stable record reference

\* create a source reference

\* associate provenance with source and collection run

\* record the original intake transformation

\* preserve correlation ID

\* reject missing parent provenance rather than silently creating incorrect lineage

\* prevent self-parenting

\* apply a reasonable maximum lineage depth

\* create transformation records for canonicalization and validation



No secret values may enter provenance payloads.



\### 4.12 Publication preparation



Implement preparation of a publication package for validated manual-intake records.



Required endpoint:



```text

POST /v1/businesses/:businessId/data-acquisition/runs/:runId/publication-packages

```



Required behavior:



\* run must belong to the business

\* run must be `validated`

\* quality score must exist

\* provenance must exist for accepted records

\* record count must be coherent

\* package target layer must initially be restricted to:



```text

business\_operations

```



\* target block must be explicit

\* package begins as `draft`

\* runtime validates readiness

\* runtime transitions package to `ready`

\* publication package must include:



&#x20; \* collection-run reference

&#x20; \* source reference

&#x20; \* record count

&#x20; \* quality score

&#x20; \* provenance IDs

&#x20; \* limitations

&#x20; \* target layer

&#x20; \* target block



\### 4.13 Controlled publication



Required endpoint:



```text

POST /v1/businesses/:businessId/data-acquisition/publication-packages/:packageId/publish

```



Required rules:



\* requires `da:write`

\* requires active subscription

\* requires idempotency key

\* package must be `ready`

\* package must target `business\_operations`

\* package cannot be published twice

\* publication must emit `da.data.published`

\* associated collection run must transition from `validated` to `published`

\* package publication and run transition must be atomic

\* publication must not create approved business actions

\* publication must not bypass Business Operations validation

\* publication must not directly create BI, DT, SIM, ADI, ABA, OM, or CL records



For BUILD-31, controlled publication may deliver a normalized intake envelope to Business Operations rather than attempting full automatic mapping into every BO event category.



If a new BO intake table or repository is required, it must be minimal, tenant-scoped, append-only where appropriate, and introduced through a new migration.



\### 4.14 Read endpoints



Implement:



```text

GET /v1/businesses/:businessId/data-acquisition/runs

GET /v1/businesses/:businessId/data-acquisition/runs/:runId

GET /v1/businesses/:businessId/data-acquisition/runs/:runId/validation-results

GET /v1/businesses/:businessId/data-acquisition/runs/:runId/quality-score

GET /v1/businesses/:businessId/data-acquisition/runs/:runId/provenance

GET /v1/businesses/:businessId/data-acquisition/publication-packages

GET /v1/businesses/:businessId/data-acquisition/publication-packages/:packageId

```



All list endpoints must support bounded pagination.



Default and maximum page sizes must be explicit.



\---



\## 5. API SECURITY RULES



\### 5.1 Permission mapping



Use:



```text

da:read

```



for read-only source, connector, run, validation, quality, provenance, and publication views.



Use:



```text

da:write

```



for source creation, connector creation, manual intake, publication-package creation, and publication.



Use:



```text

da:admin

```



for connector health administration, connector status administration, credential-reference administration, source deletion, and sensitive configuration changes.



\### 5.2 Business validation



Every business-scoped route must call `BusinessRepository.getById` or equivalent before processing.



\### 5.3 Subscription enforcement



All mutating customer-facing DA routes must require an active subscription.



\### 5.4 Idempotency



All POST, PATCH, and DELETE routes that mutate state must use the existing API idempotency mechanism unless the endpoint is explicitly safe and naturally idempotent.



Manual intake idempotency must prevent duplicate collection runs and duplicate submissions.



\### 5.5 Secret handling



The following must be prohibited from request and response schemas:



\* passwords

\* raw API keys

\* access tokens

\* refresh tokens

\* database passwords

\* complete database connection strings

\* private keys

\* unredacted authorization headers



Only secret-provider references may be stored.



\### 5.6 Data exposure



API responses must not expose:



\* secret references beyond approved identifiers

\* internal database connection data

\* raw request headers

\* sensitive-data fields not required by the endpoint

\* stack traces

\* SQL errors

\* tenant IDs from unrelated tenants

\* other workspace data



\---



\## 6. TRANSACTIONAL REQUIREMENTS



The following operations must be atomic.



\### 6.1 Source registration transaction



\* create source

\* emit `da.source.registered`



\### 6.2 Connector registration transaction



\* create connector

\* emit `da.connector.registered`



\### 6.3 Collection start transaction



\* guarded transition to `collecting`

\* emit `da.collection.started`



\### 6.4 Collection completion transaction



\* persist intake metadata

\* update record counts

\* guarded transition to `collected`

\* emit `da.collection.completed`



\### 6.5 Validation transaction



\* create validation result

\* create validation issues

\* guarded run transition

\* emit `da.validation.completed`

\* emit quarantine event where applicable



\### 6.6 Quality transaction



\* create quality score

\* emit `da.data.quality\_scored`



\### 6.7 Publication transaction



\* validate package readiness

\* transition package to `published`

\* transition run to `published`

\* emit `da.data.published`

\* create Business Operations intake envelope when required



A failure inside any of these transactions must roll back both the domain mutation and outbox event.



\---



\## 7. ERROR MODEL



Introduce controlled runtime errors where needed.



Expected errors include:



```text

ValidationError

InvalidStateTransitionError

UnsupportedConnectorError

DuplicateSourceCodeError

CollectionLimitExceededError

PublicationNotReadyError

QualityThresholdError

ProvenanceError

```



Errors must follow the existing API error-mapping convention.



Do not expose raw PostgreSQL errors to clients.



Database uniqueness violations must be translated into stable client-facing errors.



\---



\## 8. TEST REQUIREMENTS



\### 8.1 Unit tests



Required unit coverage:



\* canonical JSON serialization

\* SHA-256 hashing

\* validation limits

\* invalid JSON-compatible values

\* record duplicate detection

\* field-path reporting

\* quality-dimension calculations

\* overall weighted score

\* quality classification

\* state-transition matrix

\* unsupported connector rejection

\* secret-field rejection

\* pagination bounds



\### 8.2 Repository integration tests



Required live PostgreSQL tests:



\* tenant isolation

\* workspace isolation

\* business ownership constraints

\* source creation

\* duplicate source handling

\* connector ownership

\* guarded state transitions

\* manual submission persistence

\* validation result and issue persistence

\* quality-score persistence

\* provenance persistence

\* missing-parent provenance rejection

\* publication readiness

\* publish-once enforcement

\* revoke transition rules

\* outbox event creation

\* domain mutation and event rollback together



\### 8.3 Runtime service integration tests



Required tests:



\* successful manual intake

\* partially invalid intake

\* fully invalid intake

\* duplicate records

\* excessive records

\* excessive nesting

\* excessive string size

\* invalid connector

\* inactive source

\* collection failure persistence

\* quality scoring

\* provenance creation

\* publication-package preparation

\* successful controlled publication

\* publication below minimum quality threshold

\* duplicate publication attempt

\* cross-tenant access rejection



\### 8.4 API integration tests



Required tests:



\* authentication required

\* tenant context required

\* correct permissions required

\* active subscription required for writes

\* idempotency key required

\* idempotent replay returns the original result

\* Zod schema rejection

\* OpenAPI schema registration

\* source lifecycle endpoints

\* connector endpoints

\* manual intake endpoint

\* run read endpoints

\* validation endpoints

\* quality endpoint

\* provenance endpoint

\* publication endpoints

\* correct controlled error status codes



\### 8.5 Validation commands



At minimum, run:



```cmd

pnpm --filter @infinicus/data-acquisition-runtime typecheck

pnpm --filter @infinicus/data-acquisition-runtime lint

pnpm --filter @infinicus/data-acquisition-runtime test

pnpm --filter @infinicus/database typecheck

pnpm --filter @infinicus/database test

pnpm --filter @infinicus/api typecheck

pnpm --filter @infinicus/api lint

pnpm --filter @infinicus/api test

pnpm run workspace:validate

pnpm run typecheck

pnpm run lint

pnpm run test

pnpm run build

git diff --check

```



Any existing unrelated failure must be identified precisely and must not be hidden.



\---



\## 9. DATABASE MIGRATION RULES



BUILD-31 must first attempt implementation using the existing schema.



A new migration is permitted only for one of the following verified needs:



\* Business Operations normalized intake envelope

\* missing uniqueness constraint required for safe idempotency

\* missing transition-supporting index

\* missing table required for manual-submission repository support

\* missing constraint required to prevent invalid runtime state



New migrations must:



\* begin after migration `0168`

\* be additive

\* include rollback documentation

\* preserve tenant and workspace scoping

\* include RLS where tenant-scoped

\* include indexes

\* include audit/outbox behavior where appropriate

\* include migration tests

\* update the migration baseline in the completion report



Do not modify historical migrations.



\---



\## 10. OUT-OF-SCOPE ITEMS



The following are explicitly deferred from BUILD-31:



\* Foodics connector

\* Square connector

\* Shopify connector

\* Stripe transaction connector

\* generic third-party REST connector

\* OAuth provider integrations

\* webhook signature verification

\* arbitrary webhook intake

\* file upload UI

\* file parsing

\* OCR

\* malware scanning

\* PDF ingestion

\* spreadsheet ingestion

\* direct database extraction

\* scheduled collection workers

\* durable job queue

\* distributed worker infrastructure

\* streaming ingestion

\* Kafka

\* external event broker relay

\* automatic schema inference beyond manual JSON validation

\* advanced cleaning engine

\* advanced normalization mapping

\* entity resolution

\* probabilistic deduplication

\* sensitive-data discovery engine

\* external secret vault implementation

\* full POS integration

\* customer-facing DA dashboard

\* automatic BI, DT, SIM, ADI, ABA, OM, or CL execution

\* broad redesign of migrations `0013–0022`

\* replacement of existing repositories

\* replacement of Fastify

\* replacement of Zod

\* process-local detached background execution



\---



\## 11. FILES EXPECTED TO CHANGE



At minimum, implementation is expected to create or modify:



```text

packages/data-acquisition-runtime/package.json

packages/data-acquisition-runtime/tsconfig.json

packages/data-acquisition-runtime/src/index.ts

packages/data-acquisition-runtime/src/errors.ts

packages/data-acquisition-runtime/src/types.ts

packages/data-acquisition-runtime/src/DataAcquisitionService.ts

packages/data-acquisition-runtime/src/validation/ManualRecordValidator.ts

packages/data-acquisition-runtime/src/validation/schemas.ts

packages/data-acquisition-runtime/src/quality/DataQualityScoringService.ts

packages/data-acquisition-runtime/src/provenance/ProvenanceService.ts

packages/data-acquisition-runtime/src/publication/PublicationService.ts

packages/data-acquisition-runtime/tests/\*

packages/database/src/repositories/da/\*

packages/database/src/repositories/da/index.ts

packages/database/src/index.ts

apps/api/package.json

apps/api/src/app.ts

apps/api/src/routes/dataAcquisition.ts

apps/api/src/schemas/dataAcquisition.ts

apps/api/tests/\*

```



Potential additional files:



```text

infrastructure/database/migrations/0169\_\*.sql

packages/database/tests/data-acquisition-runtime.integration.test.ts

docs/data-acquisition-runtime.md

```



No unrelated application or layer files may be modified.



\---



\## 12. IMPLEMENTATION ORDER



Claude must implement in this order.



\### Phase 1 — Repository and state safety



1\. inspect all DA schema constraints

2\. inspect existing DA repository tests

3\. add missing controlled errors

4\. add guarded repository transitions

5\. add missing list and lookup methods

6\. add manual-submission repository

7\. add outbox emission inside domain transactions

8\. add live repository tests



\### Phase 2 — Runtime primitives



1\. create runtime package

2\. implement canonical JSON serialization

3\. implement bounded manual-record validation

4\. implement quality scoring

5\. implement provenance hashing

6\. implement publication readiness checks

7\. add unit tests



\### Phase 3 — Orchestration



1\. implement source lifecycle service

2\. implement connector lifecycle service

3\. implement synchronous manual intake

4\. implement collection state machine

5\. implement validation persistence

6\. implement quality persistence

7\. implement provenance persistence

8\. implement publication preparation

9\. implement controlled publication

10\. add service integration tests



\### Phase 4 — API



1\. create Zod schemas

2\. create Fastify routes

3\. add permissions

4\. add subscription gates

5\. add idempotency

6\. register routes

7\. add OpenAPI definitions

8\. add API integration tests



\### Phase 5 — Full validation



1\. run targeted tests

2\. run live database tests

3\. run API tests

4\. run workspace typecheck

5\. run workspace lint

6\. run workspace tests

7\. run workspace build

8\. run `git diff --check`

9\. produce completion report

10\. update implementation status only after all required checks pass



\---



\## 13. ACCEPTANCE CRITERIA



BUILD-31 is complete only when all of the following are true.



\### Runtime



\* a real DA runtime package exists

\* manual JSON intake executes end to end

\* no detached process-local background execution is used

\* collection states are guarded

\* invalid transitions fail cleanly

\* validation results are persisted

\* validation issues are persisted

\* quality scores are calculated, not merely accepted as input

\* provenance hashes are generated

\* publication packages are prepared

\* controlled publication works

\* raw secrets are never stored



\### Events



\* source registration emits an outbox event

\* connector registration emits an outbox event

\* collection start emits an outbox event

\* collection completion emits an outbox event

\* collection failure emits an outbox event

\* validation completion emits an outbox event

\* quarantine emits an outbox event

\* quality scoring emits an outbox event

\* publication emits an outbox event

\* event and domain mutation are atomic



\### API



\* all endpoints use Zod

\* all endpoints are documented in OpenAPI

\* all routes enforce authentication

\* all routes enforce tenant context

\* all routes enforce DA permissions

\* writes enforce active subscription

\* writes enforce idempotency

\* business ownership is validated

\* list endpoints are paginated

\* controlled errors return stable status codes



\### Data safety



\* tenant isolation is proven

\* workspace isolation is proven

\* business ownership is proven

\* duplicate intake is prevented

\* duplicate publication is prevented

\* invalid state mutation is prevented

\* source secrets are rejected

\* provenance cannot reference a missing parent

\* cross-tenant access fails closed



\### Validation



\* targeted tests pass

\* database tests pass

\* API tests pass

\* typecheck passes

\* lint passes

\* build passes

\* `git diff --check` passes

\* working tree contains only intentional BUILD-31 changes



\---



\## 14. COMPLETION REPORT REQUIREMENTS



Create:



```text

.claude/state/reports/BUILD-31-DATA-ACQUISITION-RUNTIME-completion.md

```



The report must include:



\* build ID

\* build name

\* branch

\* commit before implementation

\* specification path

\* specification SHA-256

\* files inspected

\* files created

\* files modified

\* migrations added

\* final migration baseline

\* endpoints added

\* runtime services added

\* repository methods added

\* state-transition rules

\* outbox events wired

\* tests added

\* exact validation commands

\* exact pass/fail counts

\* live PostgreSQL evidence

\* tenant-isolation evidence

\* idempotency evidence

\* publication evidence

\* known limitations

\* deferred items

\* final status



No completion claim may be made without recorded validation evidence.



\---



\## 15. IMPLEMENTATION STATUS UPDATE



After successful completion, append BUILD-31 to:



```text

.claude/state/implementation-status.json

```



Expected shape:



```json

{

&#x20; "id": "BUILD-31",

&#x20; "layer": "DATA-ACQUISITION-RUNTIME",

&#x20; "name": "Data Acquisition Runtime Foundation",

&#x20; "status": "completed",

&#x20; "specification": "docs/implementation-queue/BUILD-31-DATA-ACQUISITION-RUNTIME-SPECIFICATION.md",

&#x20; "specificationSha256": "<verified-sha256>",

&#x20; "notes": "Production Data Acquisition runtime foundation completed, including governed source and connector lifecycle, synchronous manual JSON intake, guarded collection transitions, validation, deterministic quality scoring, provenance, transactional outbox events, publication-package preparation, controlled Business Operations publication, Fastify API routes, and live PostgreSQL validation.",

&#x20; "completedAt": "<UTC timestamp>",

&#x20; "report": ".claude/state/reports/BUILD-31-DATA-ACQUISITION-RUNTIME-completion.md",

&#x20; "testsPass": true

}

```



Set:



```json

"currentReadyBuild": null

```



unless a separately authored and frozen BUILD-32 specification exists.



\---



\## 16. BUILD FREEZE



This specification is authoritative for BUILD-31.



Claude must:



\* inspect before editing

\* implement only the frozen scope

\* preserve existing architecture

\* avoid speculative redesign

\* avoid unrelated cleanup

\* avoid adding deferred connectors

\* avoid claiming unsupported functionality

\* validate every acceptance criterion

\* stop and report clearly if a required existing contract is incompatible



Any scope expansion requires a separate future build specification.



