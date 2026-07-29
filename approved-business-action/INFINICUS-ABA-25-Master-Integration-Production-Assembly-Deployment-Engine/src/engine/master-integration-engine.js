(function(global){
  "use strict";

  const ABA = global.INFINICUS.ABA;
  const runtime = ABA.runtime;

  async function diagnose({config={}}={}){
    const dependencyResult =
      ABA.masterDependencyValidator.validate(
        ABA.masterBlockManifest,
        ABA
      );

    const configResult =
      ABA.masterConfigValidator.validate(config);

    const runtimeResult =
      ABA.masterReadinessEngine.inspectRuntime(runtime);

    const assessment =
      ABA.masterReadinessEngine.assess({
        dependencyResult,
        configResult,
        runtimeResult
      });

    const report={
      diagnosticId:
        runtime.createId("aba_master_diagnostic"),
      generatedAt:
        new Date().toISOString(),
      blockCount:
        ABA.masterBlockManifest.length,
      dependencyResult,
      configResult,
      runtimeResult,
      assessment
    };

    await ABA.masterIntegrationStore.put(
      "diagnostics",
      report
    );

    await runtime.emit(
      "aba.master.diagnostic_completed",
      {
        diagnosticId:report.diagnosticId,
        productionReady:assessment.productionReady,
        issueCount:assessment.issueCount
      }
    );

    return runtime.success(report);
  }

  async function assessDeploymentReadiness({
    config={}
  }={}){
    const diagnostic=await diagnose({config});

    if(!diagnostic.ok) return diagnostic;

    const report={
      readinessReportId:
        runtime.createId("aba_readiness_report"),
      productionReady:
        diagnostic.data.assessment.productionReady,
      issueCount:
        diagnostic.data.assessment.issueCount,
      issues:
        runtime.clone(diagnostic.data.assessment.issues),
      blockChecks:
        diagnostic.data.dependencyResult.checks.map(runtime.clone),
      generatedAt:
        new Date().toISOString()
    };

    await ABA.masterIntegrationStore.put(
      "readiness_reports",
      report
    );

    return runtime.success(report);
  }

  async function runPipeline(input={}){
    const result=
      await ABA.masterPipelineOrchestrator.run(input);

    if(result.ok){
      await ABA.masterIntegrationStore.put(
        "pipeline_runs",
        result.data
      );
    }

    return result;
  }

  async function validateTerminalHandoffs({
    terminalResult={}
  }={}){
    const validation=
      ABA.masterHandoffValidator
        .validateTerminalResult(terminalResult);

    if(!validation.valid){
      return runtime.failure(
        "ABA_TERMINAL_HANDOFF_INVALID",
        "Outcome Monitoring or Continuous Learning handoff is incomplete.",
        validation
      );
    }

    return runtime.success(validation);
  }

  async function createDeploymentManifest({
    config={},
    artifactVersion="1.0.0",
    commitReference=null
  }={}){
    const readiness=
      await assessDeploymentReadiness({config});

    if(!readiness.ok) return readiness;

    if(!readiness.data.productionReady){
      return runtime.failure(
        "ABA_DEPLOYMENT_NOT_READY",
        "Approved Business Action subsystem is not production-ready.",
        readiness.data
      );
    }

    const manifest={
      deploymentManifestId:
        runtime.createId("aba_deployment_manifest"),
      subsystem:
        "APPROVED_BUSINESS_ACTION",
      artifactVersion,
      commitReference,
      blockRange:
        "ABA-01..ABA-25",
      integratedBlockCount:
        ABA.masterBlockManifest.length + 1,
      environment:
        config.environment,
      readinessReportId:
        readiness.data.readinessReportId,
      status:
        "ready_for_deployment",
      createdAt:
        new Date().toISOString()
    };

    await ABA.masterIntegrationStore.put(
      "deployment_manifests",
      manifest
    );

    await runtime.emit(
      "aba.master.deployment_manifest_created",
      manifest
    );

    return runtime.success(manifest);
  }

  const api=Object.freeze({
    diagnose,
    assessDeploymentReadiness,
    runPipeline,
    validateTerminalHandoffs,
    createDeploymentManifest,
    getBlockManifest:() =>
      runtime.success(
        ABA.masterBlockManifest.map(runtime.clone)
      ),
    listDiagnostics:async() =>
      runtime.success(
        await ABA.masterIntegrationStore.list("diagnostics")
      ),
    listPipelineRuns:async() =>
      runtime.success(
        await ABA.masterIntegrationStore.list("pipeline_runs")
      )
  });

  runtime.registerService(
    "aba.master_integration",
    api,
    {block:"ABA-25"}
  );

  runtime.registerRoute(
    "aba.master.diagnose",
    diagnose
  );

  runtime.registerRoute(
    "aba.master.readiness",
    assessDeploymentReadiness
  );

  runtime.registerRoute(
    "aba.master.pipeline.run",
    runPipeline
  );

  runtime.registerRoute(
    "aba.master.terminal_handoffs.validate",
    validateTerminalHandoffs
  );

  runtime.registerRoute(
    "aba.master.deployment_manifest.create",
    createDeploymentManifest
  );

  runtime.registerBlock("ABA-25",{
    name:
      "Approved Business Action Master Integration, Production Assembly and Deployment Engine",
    version:"1.0.0",
    status:"active"
  });

  ABA.masterIntegrationEngine=api;
})(window);
