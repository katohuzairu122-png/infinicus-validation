(function(global){
  "use strict";

  const BI=global.INFINICUS.BI;
  const runtime=BI.runtime;

  async function diagnose({config={}}={}){
    const dependencyResult=
      BI.masterDependencyValidator.validate(
        BI.masterBlockManifest,
        BI
      );

    const configResult=
      BI.masterConfigValidator.validate(config);

    const issues=[
      ...dependencyResult.missing.map(item=>
        `Missing block: ${item.blockId} ${item.name}`
      ),
      ...configResult.issues
    ];

    const diagnostic={
      diagnosticId:runtime.createId("bi_master_diagnostic"),
      blockCount:BI.masterBlockManifest.length,
      dependencyResult,
      configResult,
      productionReady:issues.length===0,
      issues,
      generatedAt:new Date().toISOString()
    };

    await BI.masterIntegrationStore.put("diagnostics",diagnostic);

    return runtime.success(diagnostic);
  }

  async function assessDeploymentReadiness({config={}}={}){
    const diagnostic=await diagnose({config});
    if(!diagnostic.ok) return diagnostic;

    const report={
      readinessReportId:runtime.createId("bi_readiness_report"),
      productionReady:diagnostic.data.productionReady,
      issues:runtime.clone(diagnostic.data.issues),
      blockChecks:diagnostic.data.dependencyResult.checks.map(runtime.clone),
      generatedAt:new Date().toISOString()
    };

    await BI.masterIntegrationStore.put("readiness",report);
    return runtime.success(report);
  }

  async function runPipeline(input={}){
    const result=await BI.masterPipelineOrchestrator.run(input);

    if(result.ok){
      await BI.masterIntegrationStore.put("pipeline_runs",result.data);
    }

    return result;
  }

  async function validateTwinHandoff({publicationResult={}}={}){
    const validation=BI.twinHandoffValidator.validate(publicationResult);

    return validation.valid
      ? runtime.success(validation)
      : runtime.failure(
          "BI_TWIN_HANDOFF_INVALID",
          "Business Digital Twin handoff is incomplete.",
          validation
        );
  }

  async function createDeploymentManifest({
    config={},
    artifactVersion="1.0.0",
    commitReference=null
  }={}){
    const readiness=await assessDeploymentReadiness({config});
    if(!readiness.ok) return readiness;

    if(!readiness.data.productionReady){
      return runtime.failure(
        "BI_DEPLOYMENT_NOT_READY",
        "Business Intelligence subsystem is not production-ready.",
        readiness.data
      );
    }

    const manifest={
      deploymentManifestId:runtime.createId("bi_deployment_manifest"),
      subsystem:"BUSINESS_INTELLIGENCE",
      blockRange:"BI-01..BI-25",
      integratedBlockCount:25,
      artifactVersion,
      commitReference,
      environment:config.environment,
      readinessReportId:readiness.data.readinessReportId,
      targetLayer:"BUSINESS_DIGITAL_TWIN",
      status:"ready_for_deployment",
      createdAt:new Date().toISOString()
    };

    await BI.masterIntegrationStore.put("deployments",manifest);

    return runtime.success(manifest);
  }

  const api=Object.freeze({
    diagnose,
    assessDeploymentReadiness,
    runPipeline,
    validateTwinHandoff,
    createDeploymentManifest,
    getBlockManifest:() =>
      runtime.success(BI.masterBlockManifest.map(runtime.clone)),
    listDiagnostics:() =>
      BI.masterIntegrationStore.list("diagnostics"),
    listPipelineRuns:() =>
      BI.masterIntegrationStore.list("pipeline_runs")
  });

  runtime.registerService(
    "bi.master_integration",
    api,
    {block:"BI-25"}
  );

  runtime.registerRoute("bi.master.diagnose",diagnose);
  runtime.registerRoute("bi.master.readiness",assessDeploymentReadiness);
  runtime.registerRoute("bi.master.pipeline.run",runPipeline);
  runtime.registerRoute("bi.master.twin_handoff.validate",validateTwinHandoff);
  runtime.registerRoute(
    "bi.master.deployment_manifest.create",
    createDeploymentManifest
  );

  global.INFINICUS.BI.masterIntegrationEngine=api;
})(window);
