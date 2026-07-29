# API

`window.INFINICUS.BI.dataWarehouseEngine`

- `registerDataset(input)`
- `load({ warehouseDatasetId, warehouseHandoffId })`
- `query({ warehouseDatasetId, filter, limit })`
- `getDataset({ warehouseDatasetId })`
- `getLoad({ warehouseLoadId })`
- `getMetricHandoff({ metricHandoffId })`
- `listSnapshots()`

## Routes

- `bi.warehouse_dataset.register`
- `bi.warehouse.load`
- `bi.warehouse.query`
