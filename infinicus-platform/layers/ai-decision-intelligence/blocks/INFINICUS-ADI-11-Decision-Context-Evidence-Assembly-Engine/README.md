# INFINICUS ADI-11

Decision Context and Evidence Assembly Engine, version 1.0.0.

ADI-11 assembles a secured DecisionCase, ADI-04 context, ADI-07 evidence, ADI-08 goals, ADI-09 triggers and ADI-10 problems into one immutable `DecisionAnalysisCase`. It verifies boundaries, access provenance, evidence hashes, required sources and context conflicts before declaring the case ready for decision design.

ADI-11 organizes evidence. It does not interpret the evidence into alternatives or recommendations.

## Validate

```bash
npm test
```
