# Domain Model

## TrustedIdentity

`subjectId`, `subjectType`, `tenantId`, `businessIds`, `authenticatedAt`, `assuranceLevel`.

## AccessDecision

`accessDecisionId`, `allowed`, `reason`, `permission`, subject and resource boundaries, roles, permissions, evaluation time and trace ID.

## DecisionCase.security

`ownerId`, `accessDecisionId`, `tenantBoundary`, `businessBoundary`, `securedAt`, `securitySchemaVersion` and a minimal immutable `accessProof` for the ADI-04 handoff.
