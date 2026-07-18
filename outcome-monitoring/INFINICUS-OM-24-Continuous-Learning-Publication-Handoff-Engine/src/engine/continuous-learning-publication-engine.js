(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;
  const publishers=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.learningPublicationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.learningPublicationStore.put(
      "policies",
      built.data
    );
  }

  async function registerTarget(input={}){
    if(!input.name || !input.targetType){
      return runtime.failure(
        "OM_PUBLICATION_TARGET_INVALID",
        "Publication target name and targetType are required."
      );
    }

    const target={
      learningPublicationTargetId:
        input.learningPublicationTargetId ||
        runtime.createId("om_learning_target"),
      name:String(input.name),
      targetType:String(input.targetType),
      endpointReference:input.endpointReference || null,
      credentialReference:input.credentialReference || null,
      supportedPackageVersion:
        String(input.supportedPackageVersion || "1.0.0"),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    };

    return global.INFINICUS.OM.learningPublicationStore.put(
      "targets",
      target
    );
  }

  function registerPublisher(targetType,publisher){
    if(!targetType || typeof publisher!=="function"){
      return runtime.failure(
        "OM_PUBLISHER_INVALID",
        "Target type and publisher function are required."
      );
    }

    publishers.set(targetType,publisher);
    return runtime.success({targetType});
  }

  async function publish({
    learningPublicationHandoffId,
    learningPublicationPolicyId,
    learningPublicationTargetId
  }={}){
    const handoff=
      await global.INFINICUS.OM.learningPackageGenerationEngine
        .getLearningPublicationHandoff({
          learningPublicationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.learningPublicationStore.get(
        "policies",
        learningPublicationPolicyId
      );

    if(!policy.ok) return policy;

    const target=
      await global.INFINICUS.OM.learningPublicationStore.get(
        "targets",
        learningPublicationTargetId
      );

    if(!target.ok) return target;

    const validation=
      global.INFINICUS.OM.learningPublicationValidator.validate({
        handoff:handoff.data,
        policy:policy.data,
        target:target.data
      });

    if(!validation.valid){
      return runtime.failure(
        "OM_LEARNING_PUBLICATION_INVALID",
        "Learning package failed publication validation.",
        validation
      );
    }

    const idempotencyKey=
      `om_learning_${handoff.data.outcomeLearningPackageId}_${target.data.learningPublicationTargetId}`;

    const existing=
      await global.INFINICUS.OM.learningPublicationStore
        .getByIdempotencyKey(idempotencyKey);

    if(existing.ok){
      return runtime.success({
        publication:existing.data,
        idempotentReplay:true
      });
    }

    const publisher=publishers.get(target.data.targetType);

    if(!publisher){
      return runtime.failure(
        "OM_LEARNING_PUBLISHER_NOT_FOUND",
        `No publisher registered for target type: ${target.data.targetType}`
      );
    }

    let publicationResponse;
    let lastError;

    for(
      let attempt=1;
      attempt<=policy.data.maximumAttempts;
      attempt++
    ){
      try{
        publicationResponse=
          await publisher({
            target:runtime.clone(target.data),
            learningPackage:runtime.clone(handoff.data),
            attempt
          });
        lastError=null;
        break;
      }catch(error){
        lastError=error;

        await global.INFINICUS.OM.learningPublicationStore.put(
          "failures",
          {
            learningPublicationFailureId:
              runtime.createId("om_learning_publication_failure"),
            outcomeLearningPackageId:
              handoff.data.outcomeLearningPackageId,
            learningPublicationTargetId:
              target.data.learningPublicationTargetId,
            attempt,
            error:{
              message:error?.message || "Publication attempt failed."
            },
            createdAt:new Date().toISOString()
          }
        );
      }
    }

    if(lastError){
      return runtime.failure(
        "OM_LEARNING_PUBLICATION_FAILED",
        lastError?.message || "Learning publication failed."
      );
    }

    const publication={
      learningPublicationId:
        runtime.createId("om_learning_publication"),
      outcomeLearningPackageId:
        handoff.data.outcomeLearningPackageId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      monitoringContractId:
        handoff.data.monitoringContractId,
      learningPublicationTargetId:
        target.data.learningPublicationTargetId,
      idempotencyKey,
      packageVersion:"1.0.0",
      publicationResponse:
        runtime.clone(publicationResponse || {}),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      status:"published",
      publishedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.learningPublicationStore.put(
      "publications",
      publication
    );

    const receipt={
      learningPublicationReceiptId:
        runtime.createId("om_learning_publication_receipt"),
      learningPublicationId:
        publication.learningPublicationId,
      outcomeLearningPackageId:
        publication.outcomeLearningPackageId,
      targetType:
        target.data.targetType,
      targetReference:
        target.data.endpointReference,
      externalPublicationId:
        publicationResponse?.publicationId || null,
      status:"accepted",
      receivedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.learningPublicationStore.put(
      "receipts",
      receipt
    );

    const assemblyHandoff={
      outcomeMonitoringAssemblyHandoffId:
        runtime.createId("om_assembly_handoff"),
      targetBlock:"OM-25",
      monitoringContractId:
        handoff.data.monitoringContractId,
      outcomeLearningPackageId:
        handoff.data.outcomeLearningPackageId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      learningPublicationId:
        publication.learningPublicationId,
      learningPublicationReceiptId:
        receipt.learningPublicationReceiptId,
      verdict:
        handoff.data.verdict,
      publicationTarget:
        runtime.clone(target.data),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      status:"published",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.learningPublicationStore.put(
      "assembly_handoffs",
      assemblyHandoff
    );

    await runtime.emit(
      "om.learning_package.published",
      {
        learningPublicationId:
          publication.learningPublicationId,
        outcomeMonitoringAssemblyHandoffId:
          assemblyHandoff.outcomeMonitoringAssemblyHandoffId
      }
    );

    return runtime.success({
      publication,
      receipt,
      outcomeMonitoringAssemblyHandoff:assemblyHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerTarget,
    registerPublisher,
    publish,
    getPublication:({learningPublicationId}) =>
      global.INFINICUS.OM.learningPublicationStore.get(
        "publications",
        learningPublicationId
      ),
    getOutcomeMonitoringAssemblyHandoff:({
      outcomeMonitoringAssemblyHandoffId
    }) =>
      global.INFINICUS.OM.learningPublicationStore.get(
        "assembly_handoffs",
        outcomeMonitoringAssemblyHandoffId
      ),
    listPublications:() =>
      global.INFINICUS.OM.learningPublicationStore.list(
        "publications"
      )
  });

  runtime.registerService(
    "om.continuous_learning_publication",
    api,
    {block:"OM-24"}
  );

  runtime.registerRoute(
    "om.learning_publication_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.learning_publication_target.register",
    registerTarget
  );

  runtime.registerRoute(
    "om.learning_package.publish",
    publish
  );

  global.INFINICUS.OM.continuousLearningPublicationEngine=api;
})(window);
