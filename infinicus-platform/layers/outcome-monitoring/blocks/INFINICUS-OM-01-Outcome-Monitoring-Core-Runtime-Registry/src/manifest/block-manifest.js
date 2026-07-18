(function(global){
  "use strict";

  const names=[
    "Outcome Monitoring Core Runtime and Registry",
    "Monitoring Contract Intake and Validation Engine",
    "Metric and KPI Registry",
    "Observation Source and Connector Registry",
    "Observation Collection Engine",
    "Data Quality and Evidence Validation Engine",
    "Baseline and Target Registry",
    "Observation Window and Monitoring Schedule Engine",
    "Metric Normalization and Aggregation Engine",
    "Outcome Progress Calculation Engine",
    "Variance and Threshold Detection Engine",
    "Alert and Escalation Engine",
    "Attribution Evidence Engine",
    "Causation Assessment Engine",
    "External Factor and Confounder Engine",
    "Expected-versus-Actual Comparison Engine",
    "Outcome Confidence and Reliability Engine",
    "Benefit Realization Engine",
    "Adverse Outcome and Side-Effect Detection Engine",
    "Monitoring Exception and Missing-Data Engine",
    "Outcome Evidence and Audit Trail Engine",
    "Outcome Evaluation and Verdict Engine",
    "Learning Package Generation Engine",
    "Continuous Learning Publication and Handoff Engine",
    "Outcome Monitoring Master Integration and Deployment Engine"
  ];

  const manifest=names.map((name,index)=>Object.freeze({
    blockId:`OM-${String(index+1).padStart(2,"0")}`,
    sequence:index+1,
    name,
    required:true
  }));

  global.INFINICUS.OM.blockManifest=Object.freeze(manifest);
})(window);
