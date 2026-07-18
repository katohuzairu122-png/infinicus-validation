(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.observationQualityPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.dataQualityEvidenceStore.put(
      "policies",
      built.data
    );
  }

  async function validateObservations({
    observationQualityHandoffId,
    observationQualityPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.OM.observationCollectionEngine
        .getObservationQualityHandoff({
          observationQualityHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.dataQualityEvidenceStore.get(
        "policies",
        observationQualityPolicyId
      );

    if(!policy.ok) return policy;

    const accepted=[];
    const rejected=[];
    const issues=[];

    for(const observation of handoff.data.observations){
      const validation=
        global.INFINICUS.OM.observationEvidenceValidator
          .scoreObservation(observation,policy.data);

      const record={
        observationValidationId:
          runtime.createId("om_observation_validation"),
        observationId:observation.observationId,
        monitoringContractId:
          handoff.data.monitoringContractId,
        qualityScore:validation.qualityScore,
        reliabilityScore:validation.reliabilityScore,
        components:runtime.clone(validation.components),
        issues:runtime.clone(validation.issues),
        valid:validation.valid,
        correlationId:handoff.data.correlationId,
        validatedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.dataQualityEvidenceStore.put(
        "validations",
        record
      );

      for(const issue of validation.issues){
        const issueRecord={
          observationQualityIssueId:
            runtime.createId("om_quality_issue"),
          observationId:observation.observationId,
          issue,
          correlationId:handoff.data.correlationId,
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.dataQualityEvidenceStore.put(
          "issues",
          issueRecord
        );

        issues.push(issueRecord);
      }

      if(validation.valid){
        const validatedObservation={
          validatedObservationId:
            runtime.createId("om_validated_observation"),
          observation:runtime.clone(observation),
          validation:runtime.clone(record),
          adjustedConfidence:
            Number(
              (
                Number(observation.confidence ?? 0) *
                validation.qualityScore *
                validation.reliabilityScore
              ).toFixed(4)
            ),
          status:"accepted",
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.dataQualityEvidenceStore.put(
          "accepted",
          validatedObservation
        );

        accepted.push(validatedObservation);
      }else{
        const rejectedObservation={
          rejectedObservationId:
            runtime.createId("om_rejected_observation"),
          observation:runtime.clone(observation),
          validation:runtime.clone(record),
          status:"rejected",
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.OM.dataQualityEvidenceStore.put(
          "rejected",
          rejectedObservation
        );

        rejected.push(rejectedObservation);
      }
    }

    const baselineHandoff={
      baselineTargetHandoffId:
        runtime.createId("om_baseline_target_handoff"),
      targetBlock:"OM-07",
      monitoringContractId:
        handoff.data.monitoringContractId,
      observationCollectionRunId:
        handoff.data.observationCollectionRunId,
      acceptedObservations:accepted.map(runtime.clone),
      rejectedObservations:rejected.map(runtime.clone),
      qualityIssues:issues.map(runtime.clone),
      correlationId:handoff.data.correlationId,
      lineage:handoff.data.lineage.map(runtime.clone),
      confidence:
        accepted.length
          ? Number(
              (
                accepted.reduce(
                  (sum,item)=>sum+item.adjustedConfidence,
                  0
                ) / accepted.length
              ).toFixed(4)
            )
          : 0,
      status:accepted.length ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.dataQualityEvidenceStore.put(
      "baseline_handoffs",
      baselineHandoff
    );

    await runtime.emit(
      "om.observation_quality.validated",
      {
        acceptedCount:accepted.length,
        rejectedCount:rejected.length,
        baselineTargetHandoffId:
          baselineHandoff.baselineTargetHandoffId
      }
    );

    return runtime.success({
      acceptedObservations:accepted,
      rejectedObservations:rejected,
      qualityIssues:issues,
      baselineTargetHandoff:baselineHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    validateObservations,
    getBaselineTargetHandoff:({
      baselineTargetHandoffId
    }) =>
      global.INFINICUS.OM.dataQualityEvidenceStore.get(
        "baseline_handoffs",
        baselineTargetHandoffId
      ),
    listAcceptedObservations:() =>
      global.INFINICUS.OM.dataQualityEvidenceStore.list("accepted"),
    listRejectedObservations:() =>
      global.INFINICUS.OM.dataQualityEvidenceStore.list("rejected")
  });

  runtime.registerService(
    "om.data_quality_evidence_validation",
    api,
    {block:"OM-06"}
  );

  runtime.registerRoute(
    "om.observation_quality_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.observations.validate_quality",
    validateObservations
  );

  global.INFINICUS.OM.dataQualityEvidenceValidationEngine=api;
})(window);
