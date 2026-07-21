(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const publishers=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.ABA.outcomePublicationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.outcomePublicationStore.put(
      "policies",
      built.data
    );
  }

  async function registerDestination(input={}){
    const built=
      global.INFINICUS.ABA.monitoringDestinationModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.outcomePublicationStore.put(
      "destinations",
      built.data
    );
  }

  function registerPublisher(destinationType,publisher){
    if(!destinationType || typeof publisher!=="function"){
      return runtime.failure(
        "ABA_MONITORING_PUBLISHER_INVALID",
        "Destination type and publisher function are required."
      );
    }

    publishers.set(destinationType,publisher);

    return runtime.success({destinationType});
  }

  async function publish({
    outcomePublicationHandoffId,
    outcomePublicationPolicyId,
    monitoringDestinationId
  }={}){
    const handoff=
      await global.INFINICUS.ABA.expectedOutcomeMonitoringContractEngine
        .getOutcomePublicationHandoff({
          outcomePublicationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.ABA.outcomePublicationStore.get(
        "policies",
        outcomePublicationPolicyId
      );

    if(!policy.ok) return policy;

    const destination=
      await global.INFINICUS.ABA.outcomePublicationStore.get(
        "destinations",
        monitoringDestinationId
      );

    if(!destination.ok) return destination;

    const validation=
      global.INFINICUS.ABA.outcomePublicationValidator.validate({
        handoff:handoff.data,
        policy:policy.data,
        destination:destination.data
      });

    if(!validation.valid){
      return runtime.failure(
        "ABA_OUTCOME_PUBLICATION_INVALID",
        "Outcome monitoring publication failed validation.",
        validation
      );
    }

    const idempotencyKey=
      `aba_outcome_${handoff.data.outcomeMonitoringContractId}_${monitoringDestinationId}`;

    const existing=
      await global.INFINICUS.ABA.outcomePublicationStore
        .getByIdempotencyKey(idempotencyKey);

    if(existing.ok){
      return runtime.success({
        outcomePublication:existing.data,
        idempotentReplay:true
      });
    }

    const publisher=
      publishers.get(destination.data.destinationType);

    if(!publisher){
      return runtime.failure(
        "ABA_MONITORING_PUBLISHER_NOT_FOUND",
        `No publisher registered for destination type: ${destination.data.destinationType}`
      );
    }

    const monitoringEnvelope={
      schemaVersion:"1.0.0",
      outcomeMonitoringContractId:
        handoff.data.outcomeMonitoringContractId,
      actionCompletionCertificateId:
        handoff.data.actionCompletionCertificateId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      executionPlanId:
        handoff.data.executionPlanId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      outcomes:
        handoff.data.outcomes.map(runtime.clone),
      observationStateRules:{
        observed:
          "actual operational observations",
        calculated:
          "derived from observed values",
        inferred:
          "model-estimated with confidence",
        assumed:
          "must never be treated as actual",
        simulated:
          "must never be treated as actual"
      },
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      idempotencyKey,
      publishedAt:
        new Date().toISOString()
    };

    let response;

    try{
      response=
        await publisher(
          runtime.clone(monitoringEnvelope),
          {
            destination:
              runtime.clone(destination.data),
            requireAcknowledgement:
              policy.data.requireAcknowledgement
          }
        );
    }catch(error){
      const deadLetter={
        outcomePublicationDeadLetterId:
          runtime.createId("aba_outcome_dead_letter"),
        outcomeMonitoringContractId:
          handoff.data.outcomeMonitoringContractId,
        monitoringDestinationId,
        idempotencyKey,
        envelope:
          runtime.clone(monitoringEnvelope),
        errorMessage:
          error?.message || "Outcome publication failed.",
        attemptCount:1,
        correlationId:
          handoff.data.correlationId,
        createdAt:
          new Date().toISOString()
      };

      if(policy.data.deadLetterOnFailure){
        await global.INFINICUS.ABA.outcomePublicationStore.put(
          "dead_letters",
          deadLetter
        );
      }

      return runtime.failure(
        "ABA_OUTCOME_PUBLICATION_FAILED",
        "Outcome monitoring contract publication failed.",
        deadLetter
      );
    }

    const publication={
      outcomePublicationId:
        runtime.createId("aba_outcome_publication"),
      outcomePublicationHandoffId,
      outcomeMonitoringContractId:
        handoff.data.outcomeMonitoringContractId,
      monitoringDestinationId,
      idempotencyKey,
      envelope:
        runtime.clone(monitoringEnvelope),
      response:
        runtime.clone(response),
      state:
        "published",
      correlationId:
        handoff.data.correlationId,
      publishedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomePublicationStore.put(
      "publications",
      publication
    );

    const receipt={
      outcomePublicationReceiptId:
        runtime.createId("aba_outcome_publication_receipt"),
      outcomePublicationId:
        publication.outcomePublicationId,
      acknowledgementReference:
        response?.acknowledgementReference || null,
      acknowledged:
        response?.acknowledged !== false,
      correlationId:
        publication.correlationId,
      receivedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomePublicationStore.put(
      "receipts",
      receipt
    );

    const monitoringHandoff={
      outcomeMonitoringLayerHandoffId:
        runtime.createId("aba_outcome_monitoring_layer_handoff"),
      targetLayer:"OUTCOME_MONITORING",
      outcomePublicationId:
        publication.outcomePublicationId,
      outcomeMonitoringContractId:
        handoff.data.outcomeMonitoringContractId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      outcomes:
        handoff.data.outcomes.map(runtime.clone),
      receipt:
        runtime.clone(receipt),
      correlationId:
        handoff.data.correlationId,
      status:"published",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomePublicationStore.put(
      "monitoring_handoffs",
      monitoringHandoff
    );

    const learningHandoff={
      continuousLearningHandoffId:
        runtime.createId("aba_continuous_learning_handoff"),
      targetLayer:"CONTINUOUS_LEARNING",
      outcomeMonitoringContractId:
        handoff.data.outcomeMonitoringContractId,
      actionCompletionCertificateId:
        handoff.data.actionCompletionCertificateId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      expectedOutcomes:
        handoff.data.outcomes.map(item=>({
          expectedOutcomeDefinitionId:
            item.definition.expectedOutcomeDefinitionId,
          metricCode:
            item.metric.code,
          baselineValue:
            runtime.clone(item.definition.baselineValue),
          targetValue:
            runtime.clone(item.definition.targetValue),
          tolerance:
            item.definition.tolerance,
          confidenceMinimum:
            item.definition.confidenceMinimum,
          causationRequired:
            item.definition.causationRequired
        })),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      status:"ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomePublicationStore.put(
      "learning_handoffs",
      learningHandoff
    );

    const manifest={
      approvedBusinessActionManifestId:
        runtime.createId("aba_platform_manifest"),
      platformLayer:"APPROVED_BUSINESS_ACTION",
      blockRange:"ABA-01..ABA-24",
      terminalBlock:"ABA-24",
      outcomeMonitoringLayerHandoffId:
        monitoringHandoff.outcomeMonitoringLayerHandoffId,
      continuousLearningHandoffId:
        learningHandoff.continuousLearningHandoffId,
      status:"completed",
      completedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.outcomePublicationStore.put(
      "manifests",
      manifest
    );

    await runtime.emit(
      "aba.outcome_monitoring.published",
      {
        publication,
        receipt,
        monitoringHandoff,
        learningHandoff,
        manifest
      }
    );

    return runtime.success({
      outcomePublication:publication,
      publicationReceipt:receipt,
      outcomeMonitoringLayerHandoff:monitoringHandoff,
      continuousLearningHandoff:learningHandoff,
      approvedBusinessActionManifest:manifest
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerDestination,
    registerPublisher,
    publish,
    getPublication:({outcomePublicationId}) =>
      global.INFINICUS.ABA.outcomePublicationStore.get(
        "publications",
        outcomePublicationId
      ),
    getOutcomeMonitoringLayerHandoff:({
      outcomeMonitoringLayerHandoffId
    }) =>
      global.INFINICUS.ABA.outcomePublicationStore.get(
        "monitoring_handoffs",
        outcomeMonitoringLayerHandoffId
      ),
    getContinuousLearningHandoff:({
      continuousLearningHandoffId
    }) =>
      global.INFINICUS.ABA.outcomePublicationStore.get(
        "learning_handoffs",
        continuousLearningHandoffId
      ),
    listDeadLetters:() =>
      global.INFINICUS.ABA.outcomePublicationStore.list(
        "dead_letters"
      )
  });

  runtime.registerService(
    "aba.outcome_monitoring_publication",
    api,
    {block:"ABA-24"}
  );

  runtime.registerRoute(
    "aba.outcome_publication_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.monitoring_destination.register",
    registerDestination
  );

  runtime.registerRoute(
    "aba.outcome_monitoring.publish",
    publish
  );

  runtime.registerBlock("ABA-24",{
    name:"Outcome Monitoring Publication and Handoff Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.outcomeMonitoringPublicationEngine=
    api;
})(window);
