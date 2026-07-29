# Dry-Run Safety

Permitted:
- mock adapters
- sandbox endpoints
- validation-only endpoints
- no-op connectors
- schema validation
- permission checks
- simulated responses

Prohibited:
- production payments
- live messages
- live database mutation
- live inventory changes
- real account creation
- irreversible external side effects
