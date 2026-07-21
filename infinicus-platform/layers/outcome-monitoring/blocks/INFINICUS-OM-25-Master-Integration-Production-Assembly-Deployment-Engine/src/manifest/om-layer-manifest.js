(function(global){
  "use strict";

  const blocks=[
    ["OM-01","runtime","Outcome Monitoring Core Runtime and Registry"],
    ["OM-02","monitoringContractIntakeEngine","Monitoring Contract Intake and Validation Engine"],
    ["OM-03","metricKPIRegistryEngine","Metric and KPI Registry"],
    ["OM-04","observationSourceConnectorRegistryEngine","Observation Source and Connector Registry"],
    ["OM-05","observationCollectionEngine","Observation Collection Engine"],
    ["OM-06","dataQualityEvidenceValidationEngine","Data Quality and Evidence Validation Engine"],
    ["OM-07","baselineTargetRegistryEngine","Baseline and Target Registry"],
    ["OM-08","observationWindowScheduleEngine","Observation Window and Monitoring Schedule Engine"],
    ["OM-09","metricNormalizationAggregationEngine","Metric Normalization and Aggregation Engine"],
    ["OM-10","outcomeProgressCalculationEngine","Outcome Progress Calculation Engine"],
    ["OM-11","varianceThresholdDetectionEngine","Variance and Threshold Detection Engine"],
    ["OM-12","alertEscalationEngine","Alert and Escalation Engine"],
    ["OM-13","attributionEvidenceEngine","Attribution Evidence Engine"],
    ["OM-14","causationAssessmentEngine","Causation Assessment Engine"],
    ["OM-15","externalFactorConfounderEngine","External Factor and Confounder Engine"],
    ["OM-16","expectedActualComparisonEngine","Expected-versus-Actual Comparison Engine"],
    ["OM-17","outcomeConfidenceReliabilityEngine","Outcome Confidence and Reliability Engine"],
    ["OM-18","benefitRealizationEngine","Benefit Realization Engine"],
    ["OM-19","adverseOutcomeSideEffectEngine","Adverse Outcome and Side-Effect Detection Engine"],
    ["OM-20","monitoringExceptionMissingDataEngine","Monitoring Exception and Missing-Data Engine"],
    ["OM-21","outcomeEvidenceAuditTrailEngine","Outcome Evidence and Audit Trail Engine"],
    ["OM-22","outcomeEvaluationVerdictEngine","Outcome Evaluation and Verdict Engine"],
    ["OM-23","learningPackageGenerationEngine","Learning Package Generation Engine"],
    ["OM-24","continuousLearningPublicationEngine","Continuous Learning Publication and Handoff Engine"]
  ].map(([block,serviceKey,name],index)=>({
    block,
    sequence:index+1,
    serviceKey,
    name,
    version:"1.0.0",
    required:true
  }));

  const requiredRoutes=[
    "om.monitoring_contract.intake",
    "om.metrics.register_from_handoff",
    "om.observation_sources.bind_from_handoff",
    "om.observations.collect",
    "om.observations.validate_quality",
    "om.baselines_targets.register_from_handoff",
    "om.monitoring_schedules.create",
    "om.metrics.normalize_aggregate",
    "om.outcome_progress.calculate",
    "om.variance_thresholds.detect",
    "om.alerts.create",
    "om.attribution.assess",
    "om.causation.assess",
    "om.external_factors.evaluate",
    "om.expected_actual.compare",
    "om.outcome_confidence.rate",
    "om.benefit_realization.assess",
    "om.adverse_outcomes.detect",
    "om.monitoring_exceptions.detect",
    "om.outcome_audit.assemble",
    "om.outcome_verdict.evaluate",
    "om.learning_package.generate",
    "om.learning_package.publish"
  ];

  global.INFINICUS.OM.layerManifest=
    Object.freeze({
      layer:"Outcome Monitoring",
      version:"1.0.0",
      blocks:Object.freeze(blocks),
      requiredRoutes:Object.freeze(requiredRoutes),
      inputBoundary:"ABA-24",
      outputBoundary:"Continuous Learning",
      totalBlocks:25
    });
})(window);
