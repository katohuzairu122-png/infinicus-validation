# INFINICUS-ADI-25-AI-Decision-Intelligence-Master-Integration-Deployment-Engine

AI Decision Intelligence Master Integration Deployment Engine — block ADI-25 of the INFINICUS AI Decision Intelligence layer.

## Runtime shape

Browser-global IIFE. Loading `src/adi-25-ai-decision-intelligence-master-integration-deployment-engine.js` registers the block API at:

```js
window.INFINICUS.ADI.blocks["ADI-25"]
```

Key exports: `createMasterIntegrationEngine`, `attachToADIRuntime`.

## Service

Registered on the ADI-01 runtime as `adi.master_integration`.

## Routes

- `adi.master.diagnose`
- `adi.master.assert-ready`
- `adi.master.deployment-plan`

## Dependencies

- ADI-01 (`adi.core_runtime`)
- ADI-02 (`adi.decision_request_intake`)
- ADI-03 (`adi.access_control`)
- ADI-04 (`adi.decision_context`)
- ADI-05 (`adi.digital_twin_context_adapter`)
- ADI-06 (`adi.simulation_results_adapter`)
- ADI-07 (`adi.evidence_registry`)
- ADI-08 (`adi.goal_registry`)
- ADI-09 (`adi.trigger_registry`)
- ADI-10 (`adi.problem_definition`)
- ADI-11 (`adi.context_evidence_assembly`)
- ADI-12 (`adi.evaluation_framework`)
- ADI-13 (`adi.alternative_generation`)
- ADI-14 (`adi.feasibility_filter`)
- ADI-15 (`adi.impact_analysis`)
- ADI-16 (`adi.simulation_orchestration`)
- ADI-17 (`adi.risk_assessment`)
- ADI-18 (`adi.scoring_ranking`)
- ADI-19 (`adi.confidence_calibration`)
- ADI-20 (`adi.explainability`)
- ADI-21 (`adi.recommendation_generation`)
- ADI-22 (`adi.red_team_validation`)
- ADI-23 (`adi.decision_gate`)
- ADI-24 (`adi.aba_handoff`)

## Tests

```bash
node tests/adi-25-ai-decision-intelligence-master-integration-deployment-engine.test.mjs
```

Source of truth: `infinicus-platform/layers/ai-decision-intelligence/blocks/INFINICUS-ADI-25-AI-Decision-Intelligence-Master-Integration-Deployment-Engine/`
(ES modules, 106 node:test cases). This root-level block is the generated
browser-global build of the same code.
