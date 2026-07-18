# API

`window.INFINICUS.DT.twinInstanceRegistry`

- `registerBusiness(input)`
- `createTwin(input)`
- `transitionTwin({ twinId, to, reason })`
- `prepareSchemaHandoff({ twinId })`
- `getBusiness({ businessId })`
- `getBusinessByKey({ businessKey })`
- `getTwin({ twinId })`
- `getTwinByKey({ twinKey })`
- `listBusinessTwins({ businessId })`
- `getSchemaHandoff({ schemaHandoffId })`

## Routes

- `dt.business_identity.register`
- `dt.twin_instance.create`
- `dt.twin_instance.transition`
- `dt.schema_handoff.prepare`
