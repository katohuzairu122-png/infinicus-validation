# INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry

Decision Evidence Provenance Registry — block ADI-07 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-07-decision-evidence-provenance-registry.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-07"]
```

Key exports: `createEvidenceRegistry`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.evidence_registry`.

## Routes

- `adi.evidence.register`
- `adi.evidence.context.ingest`
- `adi.evidence.get`
- `adi.evidence.list`
- `adi.evidence.verify`
- `adi.evidence.supersede`
- `adi.evidence.revoke`

## Dependencies

- ADI-01 (`adi.core_runtime`)

## Tests

```bash
node tests/adi-07-decision-evidence-provenance-registry.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-07-Decision-Evidence-Provenance-Registry/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
