# Claude Instructions — BI-01

- Treat BI-01 as the mandatory foundation for every other Business Intelligence block.
- Preserve the `window.INFINICUS.BI` namespace.
- Do not silently overwrite registered services, routes, metrics, datasets, or connectors.
- Return structured success or failure envelopes.
- Keep diagnostics deterministic.
- Do not store secrets in browser configuration.
- Prefer adapters over direct changes to other layers.
- Keep the package dependency-free.
