# Domain Model

## DecisionRuntimeContext

- `runtimeId`
- `tenantId`
- `businessId`
- `decisionId`
- `decisionType`
- `runtimeVersion`
- `policyIds`
- `dataSourceIds`
- `traceId`
- `status`
- `createdAt`
- `updatedAt`

Runtime context is created by consuming blocks. ADI-01 provides IDs, lifecycle rules and registries; it does not invent missing business context.
