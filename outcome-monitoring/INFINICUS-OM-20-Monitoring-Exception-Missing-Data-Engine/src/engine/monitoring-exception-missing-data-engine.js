(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.monitoringExceptionPolicyModel.create(
        input
      );

    if(!built.ok) return built;

    return global.INFINICUS.OM.monitoringExceptionStore.put(
      "policies",
      built.data
    );
  }

  async function detect({
    monitoringExceptionHandoffId,
    monitoringExceptionPolicyId,
    monitoringContext={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.adverseOutcomeSideEffectEngine
        .getMonitoringExceptionHandoff({
          monitoringExceptionHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.monitoringExceptionStore.get(
        "policies",
        monitoringExceptionPolicyId
      );

    if(!policy.ok) return policy;

    const detected=
      global.INFINICUS.OM.monitoringExceptionDetector.detect({
        context:monitoringContext,
        policy:policy.data
      });

    const exceptions=[];

    for(const item of detected){
      const exception={
        monitoringExceptionId:
          runtime.createId("om_monitoring_exception"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        metricId:item.metricId,
        exceptionType:item.exceptionType,
        severity:item.severity,
        count:item.count,
        references:
          runtime.clone(item.references || []),
        details:
          runtime.clone(item),
        ownerRole:
          item.severity==="critical"
            ? "monitoring_manager"
            : "monitoring_analyst",
        remediationRequired:
          policy.data.requireRemediation,
        recommendedRemediation:
          item.exceptionType==="missing_observation"
            ? "Restore source collection and backfill the missing observation."
            : item.exceptionType==="connector_unavailable"
              ? "Restore or replace the observation connector."
              : item.exceptionType==="stale_observation"
                ? "Refresh the source and collect a current observation."
                : item.exceptionType==="incomplete_evidence"
                  ? "Collect the required supporting evidence."
                  : "Investigate and correct the monitoring failure.",
        state:"open",
        correlationId:
          handoff.data.correlationId,
        lineage:
          handoff.data.lineage.map(runtime.clone),
        detectedAt:new Date().toISOString(),
        updatedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.monitoringExceptionStore.put(
        "exceptions",
        exception
      );

      exceptions.push(exception);
    }

    const auditHandoff={
      outcomeAuditHandoffId:
        runtime.createId("om_outcome_audit_handoff"),
      targetBlock:"OM-21",
      monitoringContractId:
        handoff.data.monitoringContractId,
      monitoringExceptions:
        exceptions.map(runtime.clone),
      adverseOutcomes:
        handoff.data.adverseOutcomes.map(runtime.clone),
      benefitAssessments:
        handoff.data.benefitAssessments.map(runtime.clone),
      comparisons:
        handoff.data.comparisons.map(runtime.clone),
      confidenceRatings:
        handoff.data.confidenceRatings.map(runtime.clone),
      reliabilityRatings:
        handoff.data.reliabilityRatings.map(runtime.clone),
      causationAssessments:
        handoff.data.causationAssessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      confounders:
        handoff.data.confounders.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      status:
        exceptions.some(item=>item.severity==="critical")
          ? "exceptions_present"
          : "ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringExceptionStore.put(
      "audit_handoffs",
      auditHandoff
    );

    await runtime.emit(
      "om.monitoring_exceptions.detected",
      {
        exceptionCount:exceptions.length,
        outcomeAuditHandoffId:
          auditHandoff.outcomeAuditHandoffId
      }
    );

    return runtime.success({
      monitoringExceptions:exceptions,
      outcomeAuditHandoff:auditHandoff
    });
  }

  async function waive({
    monitoringExceptionId,
    waivedBy,
    reason,
    expiresAt=null
  }={}){
    const exception=
      await global.INFINICUS.OM.monitoringExceptionStore.get(
        "exceptions",
        monitoringExceptionId
      );

    if(!exception.ok) return exception;

    const waiver={
      monitoringExceptionWaiverId:
        runtime.createId("om_exception_waiver"),
      monitoringExceptionId,
      waivedBy:String(waivedBy || "unknown"),
      reason:String(reason || ""),
      expiresAt,
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringExceptionStore.put(
      "waivers",
      waiver
    );

    const updated={
      ...exception.data,
      state:"waived",
      waiverId:waiver.monitoringExceptionWaiverId,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringExceptionStore.put(
      "exceptions",
      updated
    );

    return runtime.success({
      exception:updated,
      waiver
    });
  }

  async function resolve({
    monitoringExceptionId,
    resolvedBy,
    resolutionEvidence
  }={}){
    const exception=
      await global.INFINICUS.OM.monitoringExceptionStore.get(
        "exceptions",
        monitoringExceptionId
      );

    if(!exception.ok) return exception;

    if(!resolutionEvidence){
      return runtime.failure(
        "OM_EXCEPTION_RESOLUTION_EVIDENCE_REQUIRED",
        "Resolution evidence is required."
      );
    }

    const resolution={
      monitoringExceptionResolutionId:
        runtime.createId("om_exception_resolution"),
      monitoringExceptionId,
      resolvedBy:String(resolvedBy || "unknown"),
      resolutionEvidence:
        runtime.clone(resolutionEvidence),
      resolvedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringExceptionStore.put(
      "resolutions",
      resolution
    );

    const updated={
      ...exception.data,
      state:"resolved",
      resolutionId:
        resolution.monitoringExceptionResolutionId,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.monitoringExceptionStore.put(
      "exceptions",
      updated
    );

    return runtime.success({
      exception:updated,
      resolution
    });
  }

  const api=Object.freeze({
    registerPolicy,
    detect,
    waive,
    resolve,
    getException:({monitoringExceptionId}) =>
      global.INFINICUS.OM.monitoringExceptionStore.get(
        "exceptions",
        monitoringExceptionId
      ),
    getOutcomeAuditHandoff:({outcomeAuditHandoffId}) =>
      global.INFINICUS.OM.monitoringExceptionStore.get(
        "audit_handoffs",
        outcomeAuditHandoffId
      ),
    listExceptions:() =>
      global.INFINICUS.OM.monitoringExceptionStore.list(
        "exceptions"
      )
  });

  runtime.registerService(
    "om.monitoring_exception_missing_data",
    api,
    {block:"OM-20"}
  );

  runtime.registerRoute(
    "om.monitoring_exception_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.monitoring_exceptions.detect",
    detect
  );

  runtime.registerRoute(
    "om.monitoring_exception.waive",
    waive
  );

  runtime.registerRoute(
    "om.monitoring_exception.resolve",
    resolve
  );

  global.INFINICUS.OM.monitoringExceptionMissingDataEngine=api;
})(window);
