(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const deploymentAdapters=new Map();

  function registerDeploymentAdapter(adapterType,adapter){
    if(!adapterType || typeof adapter!=="function"){
      return runtime.failure(
        "OM_DEPLOYMENT_ADAPTER_INVALID",
        "Adapter type and deployment function are required."
      );
    }

    deploymentAdapters.set(adapterType,adapter);
    return runtime.success({adapterType});
  }

  function diagnose(config={}){
    const result=
      global.INFINICUS.OM.outcomeMonitoringReadinessValidator.validate({
        runtime,
        manifest:global.INFINICUS.OM.layerManifest,
        config
      });

    return runtime.success({
      layer:"Outcome Monitoring",
      version:"1.0.0",
      totalBlocks:25,
      verifiedBlocks:
        result.services.filter(item=>item.present).length,
      verifiedRoutes:
        result.routes.filter(item=>item.present).length,
      productionReady:result.ready,
      issues:result.issues,
      services:result.services,
      routes:result.routes
    });
  }

  async function assemble({
    outcomeMonitoringAssemblyHandoffId,
    environment="staging",
    releaseVersion="1.0.0"
  }={}){
    const handoff=
      await global.INFINICUS.OM.continuousLearningPublicationEngine
        .getOutcomeMonitoringAssemblyHandoff({
          outcomeMonitoringAssemblyHandoffId
        });

    if(!handoff.ok) return handoff;

    const diagnostics=diagnose({
      environment,
      releaseVersion
    });

    if(!diagnostics.ok) return diagnostics;

    if(!diagnostics.data.productionReady){
      return runtime.failure(
        "OM_LAYER_NOT_READY",
        "Outcome Monitoring layer is not ready for assembly.",
        diagnostics.data
      );
    }

    const assembly={
      outcomeMonitoringAssemblyId:
        runtime.createId("om_layer_assembly"),
      outcomeMonitoringAssemblyHandoffId,
      layer:"Outcome Monitoring",
      version:"1.0.0",
      releaseVersion,
      environment,
      blocks:
        global.INFINICUS.OM.layerManifest.blocks.map(
          runtime.clone
        ),
      requiredRoutes:
        global.INFINICUS.OM.layerManifest.requiredRoutes.map(String),
      continuousLearningPublication:{
        learningPublicationId:
          handoff.data.learningPublicationId,
        learningPublicationReceiptId:
          handoff.data.learningPublicationReceiptId,
        outcomeLearningPackageId:
          handoff.data.outcomeLearningPackageId
      },
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      state:"assembled",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.masterIntegrationStore.put(
      "assemblies",
      assembly
    );

    const deploymentManifest={
      outcomeMonitoringDeploymentManifestId:
        runtime.createId("om_deployment_manifest"),
      outcomeMonitoringAssemblyId:
        assembly.outcomeMonitoringAssemblyId,
      layer:assembly.layer,
      layerVersion:assembly.version,
      releaseVersion,
      environment,
      entryNamespace:"window.INFINICUS.OM",
      masterAPI:
        "window.INFINICUS.OM.masterIntegrationEngine",
      blockOrder:
        assembly.blocks.map(item=>item.block),
      inputBoundary:"ABA-24",
      outputBoundary:"Continuous Learning",
      rollbackVersion:null,
      generatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.masterIntegrationStore.put(
      "manifests",
      deploymentManifest
    );

    await runtime.emit(
      "om.layer.assembled",
      {
        outcomeMonitoringAssemblyId:
          assembly.outcomeMonitoringAssemblyId,
        outcomeMonitoringDeploymentManifestId:
          deploymentManifest.outcomeMonitoringDeploymentManifestId
      }
    );

    return runtime.success({
      assembly,
      deploymentManifest,
      diagnostics:diagnostics.data
    });
  }

  async function deploy({
    outcomeMonitoringDeploymentManifestId,
    adapterType,
    deploymentConfig={}
  }={}){
    const manifest=
      await global.INFINICUS.OM.masterIntegrationStore.get(
        "manifests",
        outcomeMonitoringDeploymentManifestId
      );

    if(!manifest.ok) return manifest;

    const adapter=deploymentAdapters.get(adapterType);

    if(!adapter){
      return runtime.failure(
        "OM_DEPLOYMENT_ADAPTER_NOT_FOUND",
        `No deployment adapter registered: ${adapterType}`
      );
    }

    const deployment={
      outcomeMonitoringDeploymentId:
        runtime.createId("om_deployment"),
      outcomeMonitoringDeploymentManifestId,
      adapterType,
      environment:manifest.data.environment,
      state:"deploying",
      startedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.masterIntegrationStore.put(
      "deployments",
      deployment
    );

    try{
      const response=
        await adapter({
          manifest:runtime.clone(manifest.data),
          config:runtime.clone(deploymentConfig)
        });

      const completed={
        ...deployment,
        state:"deployed",
        response:runtime.clone(response || {}),
        completedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.masterIntegrationStore.put(
        "deployments",
        completed
      );

      const receipt={
        outcomeMonitoringDeploymentReceiptId:
          runtime.createId("om_deployment_receipt"),
        outcomeMonitoringDeploymentId:
          completed.outcomeMonitoringDeploymentId,
        releaseVersion:
          manifest.data.releaseVersion,
        environment:
          manifest.data.environment,
        deploymentReference:
          response?.deploymentId || null,
        state:"deployed",
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.masterIntegrationStore.put(
        "receipts",
        receipt
      );

      await runtime.emit(
        "om.layer.deployed",
        {
          outcomeMonitoringDeploymentId:
            completed.outcomeMonitoringDeploymentId,
          outcomeMonitoringDeploymentReceiptId:
            receipt.outcomeMonitoringDeploymentReceiptId
        }
      );

      return runtime.success({
        deployment:completed,
        receipt
      });
    }catch(error){
      const failed={
        ...deployment,
        state:"failed",
        error:{
          message:error?.message || "Deployment failed."
        },
        completedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.masterIntegrationStore.put(
        "deployments",
        failed
      );

      return runtime.failure(
        "OM_DEPLOYMENT_FAILED",
        failed.error.message,
        failed
      );
    }
  }

  async function recordRollback({
    outcomeMonitoringDeploymentId,
    reason,
    rollbackVersion
  }={}){
    const deployment=
      await global.INFINICUS.OM.masterIntegrationStore.get(
        "deployments",
        outcomeMonitoringDeploymentId
      );

    if(!deployment.ok) return deployment;

    const rollback={
      outcomeMonitoringRollbackId:
        runtime.createId("om_rollback"),
      outcomeMonitoringDeploymentId,
      reason:String(reason || ""),
      rollbackVersion:String(rollbackVersion || ""),
      state:"recorded",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.masterIntegrationStore.put(
      "rollbacks",
      rollback
    );

    return runtime.success({rollback});
  }

  const api=Object.freeze({
    registerDeploymentAdapter,
    diagnose,
    assemble,
    deploy,
    recordRollback,
    getAssembly:({outcomeMonitoringAssemblyId}) =>
      global.INFINICUS.OM.masterIntegrationStore.get(
        "assemblies",
        outcomeMonitoringAssemblyId
      ),
    getDeployment:({outcomeMonitoringDeploymentId}) =>
      global.INFINICUS.OM.masterIntegrationStore.get(
        "deployments",
        outcomeMonitoringDeploymentId
      ),
    listDeployments:() =>
      global.INFINICUS.OM.masterIntegrationStore.list(
        "deployments"
      ),
    manifest:global.INFINICUS.OM.layerManifest
  });

  runtime.registerService(
    "om.master_integration",
    api,
    {block:"OM-25"}
  );

  runtime.registerRoute(
    "om.master.diagnose",
    diagnose
  );

  runtime.registerRoute(
    "om.master.assemble",
    assemble
  );

  runtime.registerRoute(
    "om.master.deploy",
    deploy
  );

  runtime.registerRoute(
    "om.master.rollback.record",
    recordRollback
  );

  global.INFINICUS.OM.masterIntegrationEngine=api;
})(window);
