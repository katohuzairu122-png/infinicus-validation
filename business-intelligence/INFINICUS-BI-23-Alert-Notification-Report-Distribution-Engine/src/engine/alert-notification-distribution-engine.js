(function(global){
  "use strict";

  const runtime=global.INFINICUS.BI.runtime;
  const senders=new Map();

  async function registerPolicy(input={}){
    const built=global.INFINICUS.BI.distributionPolicyModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.BI.distributionStore.put("policies",built.data);
  }

  async function registerChannel(input={}){
    const built=global.INFINICUS.BI.distributionChannelModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.BI.distributionStore.put("channels",built.data);
  }

  async function registerAudience(input={}){
    const built=global.INFINICUS.BI.audienceModel.create(input);
    if(!built.ok) return built;
    return global.INFINICUS.BI.distributionStore.put("audiences",built.data);
  }

  function registerSender(channelType,sender){
    if(!channelType || typeof sender!=="function"){
      return runtime.failure(
        "BI_DISTRIBUTION_SENDER_INVALID",
        "Channel type and sender function are required."
      );
    }

    senders.set(channelType,sender);
    return runtime.success({channelType});
  }

  async function distribute({
    distributionHandoffId,
    distributionPolicyId,
    distributionChannelId,
    audienceId
  }={}){
    const handoff=
      await global.INFINICUS.BI.reportingExplorationEngine
        .getDistributionHandoff({distributionHandoffId});

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.BI.distributionStore.get(
        "policies",
        distributionPolicyId
      );
    if(!policy.ok) return policy;

    const channel=
      await global.INFINICUS.BI.distributionStore.get(
        "channels",
        distributionChannelId
      );
    if(!channel.ok) return channel;

    const audience=
      await global.INFINICUS.BI.distributionStore.get(
        "audiences",
        audienceId
      );
    if(!audience.ok) return audience;

    const validation=
      global.INFINICUS.BI.distributionValidator.validate({
        handoff:handoff.data,
        policy:policy.data,
        channel:channel.data,
        audience:audience.data
      });

    if(!validation.valid){
      return runtime.failure(
        "BI_REPORT_DISTRIBUTION_INVALID",
        "Report distribution failed validation.",
        validation
      );
    }

    const sender=senders.get(channel.data.channelType);

    if(!sender){
      return runtime.failure(
        "BI_DISTRIBUTION_SENDER_NOT_FOUND",
        `No sender registered for channel type: ${channel.data.channelType}`
      );
    }

    const envelope={
      reportSnapshotId:handoff.data.reportSnapshotId,
      title:handoff.data.title,
      summary:runtime.clone(handoff.data.summary),
      severity:handoff.data.severity,
      audience:runtime.clone(audience.data),
      exportFormats:runtime.clone(handoff.data.exportFormats),
      correlationId:handoff.data.correlationId,
      sentAt:new Date().toISOString()
    };

    let response;

    try{
      response=await sender(runtime.clone(envelope),{
        channel:runtime.clone(channel.data)
      });
    }catch(error){
      const deadLetter={
        distributionDeadLetterId:
          runtime.createId("bi_distribution_dead_letter"),
        distributionHandoffId,
        reportSnapshotId:handoff.data.reportSnapshotId,
        audienceId,
        distributionChannelId,
        envelope:runtime.clone(envelope),
        errorMessage:error?.message || "Report delivery failed.",
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.BI.distributionStore.put(
        "dead_letters",
        deadLetter
      );

      return runtime.failure(
        "BI_REPORT_DELIVERY_FAILED",
        "Report delivery failed.",
        deadLetter
      );
    }

    const delivery={
      reportDeliveryId:runtime.createId("bi_report_delivery"),
      distributionHandoffId,
      reportSnapshotId:handoff.data.reportSnapshotId,
      distributionPolicyId,
      distributionChannelId,
      audienceId,
      response:runtime.clone(response),
      acknowledgementRequired:policy.data.acknowledgementRequired,
      acknowledgementDeadline:
        policy.data.acknowledgementRequired
          ? new Date(
              Date.now()+
              policy.data.acknowledgementDeadlineMinutes*60000
            ).toISOString()
          : null,
      status:"delivered",
      correlationId:handoff.data.correlationId,
      deliveredAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.distributionStore.put(
      "deliveries",
      delivery
    );

    const publicationHandoff={
      intelligencePublicationHandoffId:
        runtime.createId("bi_intelligence_publication_handoff"),
      targetBlock:"BI-24",
      reportSnapshotId:handoff.data.reportSnapshotId,
      reportDeliveryId:delivery.reportDeliveryId,
      title:handoff.data.title,
      summary:runtime.clone(handoff.data.summary),
      severity:handoff.data.severity,
      audience:runtime.clone(handoff.data.audience),
      exportFormats:runtime.clone(handoff.data.exportFormats),
      deliveryEvidence:runtime.clone(delivery),
      correlationId:handoff.data.correlationId,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.distributionStore.put(
      "publication_handoffs",
      publicationHandoff
    );

    await runtime.emit("bi.report.distributed",{
      delivery,
      intelligencePublicationHandoffId:
        publicationHandoff.intelligencePublicationHandoffId
    });

    return runtime.success({
      delivery,
      intelligencePublicationHandoff:publicationHandoff
    });
  }

  async function acknowledge({
    reportDeliveryId,
    acknowledgedBy,
    note=null
  }={}){
    const delivery=
      await global.INFINICUS.BI.distributionStore.get(
        "deliveries",
        reportDeliveryId
      );
    if(!delivery.ok) return delivery;

    const acknowledgement={
      deliveryAcknowledgementId:
        runtime.createId("bi_delivery_acknowledgement"),
      reportDeliveryId,
      acknowledgedBy:String(acknowledgedBy || "unknown"),
      note,
      correlationId:delivery.data.correlationId,
      acknowledgedAt:new Date().toISOString()
    };

    await global.INFINICUS.BI.distributionStore.put(
      "acknowledgements",
      acknowledgement
    );

    return runtime.success({acknowledgement});
  }

  const api=Object.freeze({
    registerPolicy,
    registerChannel,
    registerAudience,
    registerSender,
    distribute,
    acknowledge,
    getDelivery:({reportDeliveryId}) =>
      global.INFINICUS.BI.distributionStore.get(
        "deliveries",
        reportDeliveryId
      ),
    getIntelligencePublicationHandoff:({
      intelligencePublicationHandoffId
    }) =>
      global.INFINICUS.BI.distributionStore.get(
        "publication_handoffs",
        intelligencePublicationHandoffId
      ),
    listDeadLetters:() =>
      global.INFINICUS.BI.distributionStore.list("dead_letters")
  });

  runtime.registerService(
    "bi.alert_notification_distribution",
    api,
    {block:"BI-23"}
  );

  runtime.registerRoute("bi.distribution_policy.register",registerPolicy);
  runtime.registerRoute("bi.distribution_channel.register",registerChannel);
  runtime.registerRoute("bi.audience.register",registerAudience);
  runtime.registerRoute("bi.report.distribute",distribute);
  runtime.registerRoute("bi.report_delivery.acknowledge",acknowledge);

  global.INFINICUS.BI.alertNotificationDistributionEngine=api;
})(window);
