(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.masterIntegrationEngineStore;


  function diagnose(){
    const required=[
      "runtime","learningPackageIntakeEngine","learningEvidenceProvenanceRegistryEngine",
      "lessonClassificationTaxonomyEngine","applicabilityScopeContextEngine",
      "learningConfidenceReliabilityEngine","duplicateConflictContradictionEngine",
      "existingKnowledgeComparisonEngine","assumptionValidationRevisionEngine",
      "businessRuleLearningEngine","decisionPolicyLearningEngine","riskModelLearningEngine",
      "forecastPredictionCalibrationEngine","simulationModelCalibrationEngine",
      "businessDigitalTwinCalibrationEngine","dataQualityObservationLearningEngine",
      "operationalProcessImprovementEngine","benefitAdverseOutcomeLearningEngine",
      "learningRecommendationGenerationEngine","learningGovernanceApprovalEngine",
      "controlledKnowledgeUpdateEngine","modelRulePolicyDeploymentEngine",
      "learningImpactVerificationEngine","updatedIntelligencePublicationEngine"
    ];
    const missing=required.filter(key=>!global.INFINICUS.CL[key]);
    return runtime.success({
      layer:"Continuous Learning",
      totalBlocks:25,
      verifiedBlocks:25-missing.length,
      missing,
      productionReady:missing.length===0
    });
  }

  async function assemble(input={}){
    const diagnostics=diagnose();
    if(!diagnostics.data.productionReady){
      return runtime.failure("CL_LAYER_NOT_READY","Continuous Learning layer is incomplete.",diagnostics.data);
    }
    const assembly={
      continuousLearningAssemblyId:runtime.createId("cl_assembly"),
      releaseVersion:String(input.releaseVersion||"1.0.0"),
      environment:String(input.environment||"staging"),
      blocks:Array.from({length:25},(_,i)=>`CL-${String(i+1).padStart(2,"0")}`),
      state:"assembled",
      createdAt:new Date().toISOString()
    };
    await store.put("records",assembly);
    return runtime.success({assembly});
  }

  async function deploy(input={}){
    const deployment={
      continuousLearningDeploymentId:runtime.createId("cl_deployment"),
      adapterType:String(input.adapterType||"manual"),
      releaseVersion:String(input.releaseVersion||"1.0.0"),
      state:"deployed",
      deploymentReference:input.deploymentReference||null,
      deployedAt:new Date().toISOString()
    };
    await store.put("handoffs",{deploymentReceiptId:runtime.createId("cl_deployment_receipt"),...deployment});
    return runtime.success({deployment});
  }

  async function recordRollback(input={}){
    const rollback={
      continuousLearningRollbackId:runtime.createId("cl_rollback"),
      reason:String(input.reason||""),
      rollbackVersion:String(input.rollbackVersion||""),
      state:"recorded",
      createdAt:new Date().toISOString()
    };
    await store.put("events",rollback);
    return runtime.success({rollback});
  }

  const api=Object.freeze({diagnose,assemble,deploy,recordRollback});
  runtime.registerService("cl.master_integration_engine",api,{block:"CL-25"});

  runtime.registerRoute("cl.master.diagnose",diagnose);
  runtime.registerRoute("cl.master.assemble",assemble);
  runtime.registerRoute("cl.master.deploy",deploy);
  runtime.registerRoute("cl.master.rollback.record",recordRollback);

  global.INFINICUS.CL.masterIntegrationEngine=api;
})(window);
