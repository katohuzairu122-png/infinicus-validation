# INFINICUS ADI-04

Decision Context Acquisition and Normalization Engine, version 1.0.0.

ADI-04 acquires authorized business context from registered providers and converts it into a canonical `DecisionContextEnvelope`. It preserves provenance, reports freshness and quality, detects conflicting values and never invents missing context.

The block normalizes structure only. Currency conversion, simulation and recommendation logic remain outside ADI-04.

## Validate

```bash
npm test
```
