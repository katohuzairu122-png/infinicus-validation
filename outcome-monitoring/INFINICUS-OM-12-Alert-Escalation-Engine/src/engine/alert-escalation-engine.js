(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.alertEscalationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.alertEscalationStore.put(
      "policies",
      built.data
    );
  }

  async function createAlerts({
    alertEscalationHandoffId,
    alertEscalationPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.varianceThresholdDetectionEngine
        .getAlertEscalationHandoff({
          alertEscalationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.alertEscalationStore.get(
        "policies",
        alertEscalationPolicyId
      );

    if(!policy.ok) return policy;

    const alerts=[];

    for(const breach of handoff.data.thresholdBreaches){
      const validation=
        global.INFINICUS.OM.alertValidator.validateBreach(
          breach,
          policy.data
        );

      if(!validation.valid){
        return runtime.failure(
          "OM_ALERT_CREATION_INVALID",
          "Threshold breach failed alert validation.",
          {
            thresholdBreachId:breach.thresholdBreachId,
            validation
          }
        );
      }

      const route=policy.data.routes[breach.severity];

      const alert={
        outcomeAlertId:
          runtime.createId("om_outcome_alert"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        thresholdBreachId:
          breach.thresholdBreachId,
        varianceDetectionId:
          breach.varianceDetectionId,
        outcomeProgressId:
          breach.outcomeProgressId,
        metricId:
          breach.metricId,
        severity:
          breach.severity,
        breachTypes:
          runtime.clone(breach.breachTypes || []),
        ownerRole:
          route.ownerRole,
        acknowledgementRequired:
          policy.data.requireAcknowledgement,
        acknowledgementDeadline:
          policy.data.requireAcknowledgement
            ? new Date(
                Date.now()+
                Number(route.acknowledgementMinutes || 60)*60000
              ).toISOString()
            : null,
        escalationStages:
          runtime.clone(route.escalationStages || []),
        currentEscalationStage:0,
        evidence:
          runtime.clone(breach.evidence),
        confidence:
          breach.confidence,
        correlationId:
          breach.correlationId,
        lineage:
          breach.lineage.map(runtime.clone),
        state:"open",
        createdAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.alertEscalationStore.put(
        "alerts",
        alert
      );

      await global.INFINICUS.OM.alertEscalationStore.put(
        "events",
        {
          outcomeAlertEventId:
            runtime.createId("om_alert_event"),
          outcomeAlertId:
            alert.outcomeAlertId,
          eventType:"created",
          state:"open",
          occurredAt:new Date().toISOString()
        }
      );

      alerts.push(alert);
    }

    const attributionHandoff={
      attributionEvidenceHandoffId:
        runtime.createId("om_attribution_evidence_handoff"),
      targetBlock:"OM-13",
      monitoringContractId:
        handoff.data.monitoringContractId,
      alerts:alerts.map(runtime.clone),
      thresholdBreaches:
        handoff.data.thresholdBreaches.map(runtime.clone),
      variances:
        handoff.data.variances.map(runtime.clone),
      progressRecords:
        handoff.data.progressRecords.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "attribution_handoffs",
      attributionHandoff
    );

    await runtime.emit(
      "om.alerts.created",
      {
        alertCount:alerts.length,
        attributionEvidenceHandoffId:
          attributionHandoff.attributionEvidenceHandoffId
      }
    );

    return runtime.success({
      alerts,
      attributionEvidenceHandoff:attributionHandoff
    });
  }

  async function acknowledge({
    outcomeAlertId,
    acknowledgedBy,
    note=null
  }={}){
    const alert=
      await global.INFINICUS.OM.alertEscalationStore.get(
        "alerts",
        outcomeAlertId
      );

    if(!alert.ok) return alert;

    if(!["open","escalated"].includes(alert.data.state)){
      return runtime.failure(
        "OM_ALERT_ACKNOWLEDGEMENT_INVALID",
        "Only open or escalated alerts may be acknowledged."
      );
    }

    const acknowledgement={
      outcomeAlertAcknowledgementId:
        runtime.createId("om_alert_acknowledgement"),
      outcomeAlertId,
      acknowledgedBy:String(acknowledgedBy || "unknown"),
      note,
      acknowledgedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "acknowledgements",
      acknowledgement
    );

    const updated={
      ...alert.data,
      state:"acknowledged",
      acknowledgedAt:acknowledgement.acknowledgedAt,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "alerts",
      updated
    );

    return runtime.success({
      alert:updated,
      acknowledgement
    });
  }

  async function escalate({
    outcomeAlertId,
    reason="acknowledgement_deadline_exceeded"
  }={}){
    const alert=
      await global.INFINICUS.OM.alertEscalationStore.get(
        "alerts",
        outcomeAlertId
      );

    if(!alert.ok) return alert;

    const nextIndex=alert.data.currentEscalationStage;
    const stage=alert.data.escalationStages[nextIndex];

    if(!stage){
      return runtime.failure(
        "OM_ALERT_ESCALATION_EXHAUSTED",
        "No further escalation stage is available."
      );
    }

    const escalation={
      outcomeAlertEscalationId:
        runtime.createId("om_alert_escalation"),
      outcomeAlertId,
      stageIndex:nextIndex+1,
      toRole:stage.toRole,
      reason,
      escalatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "escalations",
      escalation
    );

    const updated={
      ...alert.data,
      state:"escalated",
      currentEscalationStage:nextIndex+1,
      ownerRole:stage.toRole,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "alerts",
      updated
    );

    return runtime.success({
      alert:updated,
      escalation
    });
  }

  async function resolve({
    outcomeAlertId,
    resolvedBy,
    resolutionEvidence
  }={}){
    const alert=
      await global.INFINICUS.OM.alertEscalationStore.get(
        "alerts",
        outcomeAlertId
      );

    if(!alert.ok) return alert;

    if(!resolutionEvidence){
      return runtime.failure(
        "OM_ALERT_RESOLUTION_EVIDENCE_REQUIRED",
        "Resolution evidence is required."
      );
    }

    const resolution={
      outcomeAlertResolutionId:
        runtime.createId("om_alert_resolution"),
      outcomeAlertId,
      resolvedBy:String(resolvedBy || "unknown"),
      resolutionEvidence:runtime.clone(resolutionEvidence),
      resolvedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "resolutions",
      resolution
    );

    const updated={
      ...alert.data,
      state:"resolved",
      resolvedAt:resolution.resolvedAt,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.alertEscalationStore.put(
      "alerts",
      updated
    );

    return runtime.success({
      alert:updated,
      resolution
    });
  }

  const api=Object.freeze({
    registerPolicy,
    createAlerts,
    acknowledge,
    escalate,
    resolve,
    getAlert:({outcomeAlertId}) =>
      global.INFINICUS.OM.alertEscalationStore.get(
        "alerts",
        outcomeAlertId
      ),
    getAttributionEvidenceHandoff:({
      attributionEvidenceHandoffId
    }) =>
      global.INFINICUS.OM.alertEscalationStore.get(
        "attribution_handoffs",
        attributionEvidenceHandoffId
      ),
    listAlerts:() =>
      global.INFINICUS.OM.alertEscalationStore.list(
        "alerts"
      )
  });

  runtime.registerService(
    "om.alert_escalation",
    api,
    {block:"OM-12"}
  );

  runtime.registerRoute(
    "om.alert_escalation_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.alerts.create",
    createAlerts
  );

  runtime.registerRoute(
    "om.alert.acknowledge",
    acknowledge
  );

  runtime.registerRoute(
    "om.alert.escalate",
    escalate
  );

  runtime.registerRoute(
    "om.alert.resolve",
    resolve
  );

  global.INFINICUS.OM.alertEscalationEngine=api;
})(window);
