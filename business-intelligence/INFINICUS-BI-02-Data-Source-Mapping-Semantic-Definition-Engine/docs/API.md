# API

`window.INFINICUS.BI.dataSourceMappingEngine`

- `registerSourceSystem(input)`
- `registerSemanticEntity(input)`
- `registerFieldMapping(input)`
- `publishDatasetContract({ name, sourceSystemId, semanticEntityId, publishedBy })`
- `prepareIngestionHandoff({ datasetContractId })`
- `getSourceSystem({ sourceSystemId })`
- `getSemanticEntity({ semanticEntityId })`
- `getDatasetContract({ datasetContractId })`
- `listDatasetContracts()`

## Routes

- `bi.source_system.register`
- `bi.semantic_entity.register`
- `bi.field_mapping.register`
- `bi.dataset_contract.publish`
- `bi.ingestion_handoff.prepare`
