# Public API

- `create(input)`, `get(query)`, `list(query)` and `history(query)` manage goals.
- `update(input)` appends a new immutable version.
- `setStatus(input)` applies governed lifecycle status through versioning.
- `importLegacy(input)` and `exportLegacy(query)` support the consolidated HTML goal shape.
- `calculateProgress(values)` supports increase, decrease and maintain directions.
- `attachToADIRuntime(runtime, options)` registers service, routes and ADI-04 provider.
