const names = [
  "AI Decision Intelligence Core Runtime and Registry",
  "Decision Request Intake and Validation Engine",
  "Decision Identity, Ownership and Access Control Engine",
  "Decision Context Acquisition and Normalization Engine",
  "Business Digital Twin Context Adapter",
  "Simulation Engine Results Adapter",
  "Decision Evidence and Provenance Registry",
  "Business Goal Registry",
  "Decision Trigger Registry",
  "Business Problem Definition Engine",
  "Decision Context and Evidence Assembly Engine",
  "Decision Objectives, Constraints and Criteria Engine",
  "Strategic Alternative Generation Engine",
  "Alternative Feasibility and Eligibility Filter",
  "Impact, Dependency and Trade-off Analysis Engine",
  "Simulation Orchestration and Scenario Comparison Engine",
  "Risk, Opportunity and Downside Assessment Engine",
  "Multi-Criteria Decision Scoring and Ranking Engine",
  "Uncertainty, Confidence and Calibration Engine",
  "Explainability, Evidence Trace and Reasoning Engine",
  "Next-Best-Action and Recommendation Generation Engine",
  "Recommendation Challenge and Red-Team Validation Engine",
  "Decision Gate, Escalation and Human Review Engine",
  "Approved Business Action Package Publication and Handoff",
  "AI Decision Intelligence Master Integration and Deployment Engine"
];

export const ADI_BLOCK_MANIFEST = Object.freeze(names.map((name, index) => Object.freeze({
  blockId: `ADI-${String(index + 1).padStart(2, "0")}`,
  sequence: index + 1,
  name,
  required: true
})));
