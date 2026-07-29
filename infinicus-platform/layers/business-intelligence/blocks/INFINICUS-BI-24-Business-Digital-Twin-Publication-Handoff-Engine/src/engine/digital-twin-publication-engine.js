(function(global){
  "use strict";

  const runtime=global.INFINICUS.BI.runtime;
  const publishers=new Map();

  async function registerPolicy(input={}){
    const built=global.INFINICUS.BI.twinPublicationPolicyModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.BI.twinPublicationStore.put("policies",built.data);
  }

  async function registerDestination(input={}){
    const built=global.INFINICUS.BI.twinDestinationModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.BI.twinPublicationStore.put("destinations",built.data);
  }

  function registerPublisher(destinationType,publisher){
    if(!destinationType || typeof publisher!=="function"){
      return runtime.failure(
        "BI_TWIN_PUBLISHER_INVALID",
        "Destination type and publisher function are required."
      );
    }

    publishers.set(destinationType,publisher);
    return runtime.success({destinationType});
  }

  async function publish({
    intelligencePublicationHandoffId,
    twinPublicationPolicyId,
    twinDestinationId,
    businessState={}
  }={}){
    const handoff=
      await global.INFINICUS.BI.alertNotificationDistributionEngine
        .getIntelligencePublicationHandoff({
          intelligencePublicationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.BI.twinPublicationStore.get(
        "policies",
        twinPublicationPolicyId
      );
    if(!policy.ok) return policy;

    const destination=
      await global.INFINICUS.BI.twinPublicationStore.get(
        "destinations",
        twinDestinationId
      );
    if(!destination.ok) return destination;

    const statePackage={
      businessStatePackageId:
        runtime.createId("bi_business_state_package"),
      businessId:businessState.businessId || null,
      legalEntityId:businessState.legalEntityId || null,
      reportingPeriod:runtime.clone(businessState.reportingPeriod || {}),
      entityState:runtime.clone(businessState.entityState || {}),
      financialState:runtime.clone(businessState.financialState || {}),
      revenueState:runtime.clone(businessState.revenueState || {}),
      costState:runtime.clone(businessState.costState || {}),
      customerState:runtime.clone(businessState.customerState || {}),
      productState:runtime.clone(businessState.productState || {}),
      operationsState:runtime.clone(businessState.operationsState || {}),
      workforceState:runtime.clone(businessState.workforceState || {}),
      inventoryState:runtime.clone(businessState.inventoryState || {}),
      liquidityState:runtime.clone(businessState.liquidityState || {}),
      trends:runtime.clone(businessState.trends || []),
      anomalies:runtime.clone(businessState.anomalies || []),
      risks:runtime.clone(businessState.risks || []),
      benchmarks:runtime.clone(businessState.benchmarks || []),
      forecastInputs:runtime.clone(businessState.forecastInputs || {}),
      healthScores:runtime.clone(businessState.healthScores || {}),
      reportEvidence:runtime.clone(handoff.data),
      dataQualityScore:Number(businessState.dataQualityScore ?? 0),
      confidence:Number(businessState.confidence ?? 0),
      lineage:runtime.clone(businessState.lineage || []),
      correlationId:handoff.data.correlationId,
      generatedAt:new Date().toISOString()
    };

    const validation=
      global.INFINICUS.BI.twinPublicationValidator.validate({
        statePackage,
        policy:policy.data,
        destination:destination.data
      });

    if(!validation.valid){
      return runtime.failure(
        "BI_TWIN_STATE_PUBLICATION_INVALID",
        "Business state package failed publication validation.",
        validation
      );
    }

    await global.INFINICUS.BI.twinPublicationStore.put(
      "state_packages",
      statePackage
    );

    const idempotencyKey=
      `bi_twin_${statePackage.businessId}_${statePackage.reportingPeriod?.end || statePackage.generatedAt}_${twinDestinationId}`;

    const existing=
      await global.INFINICUS.BI.twinPublicationStore
        .getByIdempotencyKey(idempotencyKey);

    if(existing.ok){
      return runtime.success({
        twinPublication:existing.data,
        idempotentReplay:true
      });
    }

    const publisher=publishers.get(destination.data.destinationType);

    if(!publisher){
      return runtime.failure(
        "BI_TWIN_PUBLISHER_NOT_FOUND",
        `No publisher registered for destination type: ${destination.data.destinationType}`
      );
    }

    let response;

    try{
      response=await publisher(runtime.clone(statePackage),{
        destination:runtime.clone(destination.data),
        idempotencyKey
      });
    }catch(error){
      const deadLetter={
        twinPublicationDeadLetterId:
          runtime.createId("bi_twin_publication_dead_letter"),
        businessStatePackageId:statePackage.businessStatePackageId,
        twinDestinationId,
        idempotencyKey,
        errorMessage:error?.message || "Business Digital Twin publication failed.",
        correlationId:statePackage.correlationId,
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.BI.twinPublicationStore.put(
        "dead_letters",
        deadLetter
      );

      return runtime.failure(
        "BI_TWIN_PUBLICATION_FAILED",
        "Business Digital Twin publication failed.",
        deadLetter
      );
    }

    const publication={
      twinPublicationId:runtime.createId("bi_twin_publication"),
      businessStatePackageId:statePackage.businessStatePackageId,
      twinDestinationId,
      idempotencyKey,
      response:runtime.clone(response),
      status:"published",
      correlationId:statePackage.correlationId,
      publishedAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.twinPublicationStore.put(
      "publications",
      publication
    );

    const receipt={
      twinPublicationReceiptId:
        runtime.createId("bi_twin_publication_receipt"),
      twinPublicationId:publication.twinPublicationId,
      acknowledged:response?.acknowledged !== false,
      acknowledgementReference:
        response?.acknowledgementReference || null,
      receivedAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.twinPublicationStore.put(
      "receipts",
      receipt
    );

    const integrationHandoff={
      biIntegrationHandoffId:
        runtime.createId("bi_integration_handoff"),
      targetBlock:"BI-25",
      businessStatePackageId:statePackage.businessStatePackageId,
      twinPublicationId:publication.twinPublicationId,
      twinPublicationReceiptId:receipt.twinPublicationReceiptId,
      businessId:statePackage.businessId,
      reportingPeriod:runtime.clone(statePackage.reportingPeriod),
      dataQualityScore:statePackage.dataQualityScore,
      confidence:statePackage.confidence,
      lineage:statePackage.lineage.map(runtime.clone),
      correlationId:statePackage.correlationId,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.twinPublicationStore.put(
      "integration_handoffs",
      integrationHandoff
    );

    await runtime.emit("bi.digital_twin_state.published",{
      publication,
      receipt,
      biIntegrationHandoffId:
        integrationHandoff.biIntegrationHandoffId
    });

    return runtime.success({
      businessStatePackage:statePackage,
      twinPublication:publication,
      twinPublicationReceipt:receipt,
      biIntegrationHandoff:integrationHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerDestination,
    registerPublisher,
    publish,
    getBusinessStatePackage:({businessStatePackageId}) =>
      global.INFINICUS.BI.twinPublicationStore.get(
        "state_packages",
        businessStatePackageId
      ),
    getBIIntegrationHandoff:({biIntegrationHandoffId}) =>
      global.INFINICUS.BI.twinPublicationStore.get(
        "integration_handoffs",
        biIntegrationHandoffId
      ),
    listDeadLetters:() =>
      global.INFINICUS.BI.twinPublicationStore.list("dead_letters")
  });

  runtime.registerService(
    "bi.digital_twin_publication",
    api,
    {block:"BI-24"}
  );

  runtime.registerRoute("bi.twin_publication_policy.register",registerPolicy);
  runtime.registerRoute("bi.twin_destination.register",registerDestination);
  runtime.registerRoute("bi.digital_twin_state.publish",publish);

  global.INFINICUS.BI.digitalTwinPublicationEngine=api;
})(window);
