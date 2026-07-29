# INFINICUS ADI-01

AI Decision Intelligence Core Runtime and Registry, version 1.0.0.

This block supplies the governed runtime used by every ADI block. It provides service, route, event, lifecycle, capability, policy, model, prompt, data-source and handoff registries without approving or executing business actions.

## Run

```bash
npm test
```

Open `demo/index.html` through a local web server to inspect runtime diagnostics.

## Integration

Import `src/index.js`, call `createADIRuntime()`, then register downstream blocks through the returned runtime. See `docs/INTEGRATION-CONTRACT.md`.
