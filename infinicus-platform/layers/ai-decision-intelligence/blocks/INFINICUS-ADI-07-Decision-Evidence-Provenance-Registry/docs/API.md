# Public API

- `register(input)` hashes and appends one evidence record.
- `ingestContext(contextEnvelope)` converts every ADI-04 fragment into evidence.
- `get(boundary)` and `list(boundary)` enforce tenant/business/decision isolation.
- `verify(boundary)` recomputes and compares the content hash.
- `supersede(input)` and `revoke(input)` append lifecycle records.
- `attachToADIRuntime(runtime, options)` registers the service and governed routes.
