(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.causationPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.causationAssessmentStore.put(
      "policies",
      built.data
    );
  }

  async function assessCausation({
    causationAssessmentHandoffId,
    causationPolicyId,
    causalEvidenceByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.attributionEvidenceEngine
        .getCausationAssessmentHandoff({
          causationAssessmentHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.causationAssessmentStore.get(
        "policies",
        causationPolicyId
      );

    if(!policy.ok) return policy;

    const evidenceRecords=[];
    const assessments=[];

    for(const attribution of handoff.data.attributionAssessments){
      const supplied=
        causalEvidenceByMetric[attribution.metricId] || {};

      const evidence={
        causalEvidenceId:
          runtime.createId("om_causal_evidence"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        actionInstanceId:
          attribution.actionInstanceId,
        metricId:
          attribution.metricId,
        attributionAssessmentId:
          attribution.attributionAssessmentId,
        temporalOrder:
          supplied.temporalOrder === true,
        mechanismStrength:
          Number(supplied.mechanismStrength ?? 0),
        doseResponseStrength:
          Number(supplied.doseResponseStrength ?? 0),
        counterfactualStrength:
          Number(supplied.counterfactualStrength ?? 0),
        counterfactualReference:
          supplied.counterfactualReference || null,
        confounderStrength:
          Number(supplied.confounderStrength ?? 0),
        alternativeExplanationStrength:
          Number(supplied.alternativeExplanationStrength ?? 0),
        reproducibilityStrength:
          Number(supplied.reproducibilityStrength ?? 0),
        evidenceItems:
          runtime.clone(supplied.evidenceItems || []),
        unresolvedConfounders:
          runtime.clone(supplied.unresolvedConfounders || []),
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...attribution.lineage.map(runtime.clone)
        ],
        confidence:
          Math.min(
            Number(supplied.confidence ?? 1),
            attribution.confidence,
            handoff.data.confidence
          ),
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.causationAssessmentStore.put(
        "evidence",
        evidence
      );

      const scored=
        global.INFINICUS.OM.causationScorer.score({
          attributionAssessment:attribution,
          evidence,
          policy:policy.data
        });

      const assessment={
        causationAssessmentId:
          runtime.createId("om_causation_assessment"),
        causalEvidenceId:
          evidence.causalEvidenceId,
        attributionAssessmentId:
          attribution.attributionAssessmentId,
        monitoringContractId:
          handoff.data.monitoringContractId,
        actionInstanceId:
          attribution.actionInstanceId,
        metricId:
          attribution.metricId,
        causalScore:
          scored.causalScore,
        baseScore:
          scored.baseScore,
        confounderPenalty:
          scored.confounderPenalty,
        alternativePenalty:
          scored.alternativePenalty,
        components:
          runtime.clone(scored.components),
        missingEvidence:
          runtime.clone(scored.missing),
        classification:
          scored.classification,
        causationEstablished:
          scored.causationEstablished,
        unresolvedConfounders:
          evidence.unresolvedConfounders.map(runtime.clone),
        confidence:
          Number(
            (
              evidence.confidence *
              scored.causalScore
            ).toFixed(4)
          ),
        correlationId:
          handoff.data.correlationId,
        lineage:
          evidence.lineage.map(runtime.clone),
        assessedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.causationAssessmentStore.put(
        "assessments",
        assessment
      );

      evidenceRecords.push(evidence);
      assessments.push(assessment);
    }

    const externalFactorHandoff={
      externalFactorHandoffId:
        runtime.createId("om_external_factor_handoff"),
      targetBlock:"OM-15",
      monitoringContractId:
        handoff.data.monitoringContractId,
      causalEvidence:
        evidenceRecords.map(runtime.clone),
      causationAssessments:
        assessments.map(runtime.clone),
      attributionAssessments:
        handoff.data.attributionAssessments.map(runtime.clone),
      alerts:
        handoff.data.alerts.map(runtime.clone),
      thresholdBreaches:
        handoff.data.thresholdBreaches.map(runtime.clone),
      variances:
        handoff.data.variances.map(runtime.clone),
      progressRecords:
        handoff.data.progressRecords.map(runtime.clone),
      unresolvedConfounders:
        assessments.flatMap(item=>
          item.unresolvedConfounders.map(runtime.clone)
        ),
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      confidence:
        assessments.length
          ? Number(
              (
                assessments.reduce(
                  (sum,item)=>sum+item.confidence,
                  0
                ) / assessments.length
              ).toFixed(4)
            )
          : 0,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.OM.causationAssessmentStore.put(
      "external_factor_handoffs",
      externalFactorHandoff
    );

    await runtime.emit(
      "om.causation.assessed",
      {
        assessmentCount:assessments.length,
        externalFactorHandoffId:
          externalFactorHandoff.externalFactorHandoffId
      }
    );

    return runtime.success({
      causalEvidence:evidenceRecords,
      causationAssessments:assessments,
      externalFactorHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    assessCausation,
    getAssessment:({causationAssessmentId}) =>
      global.INFINICUS.OM.causationAssessmentStore.get(
        "assessments",
        causationAssessmentId
      ),
    getExternalFactorHandoff:({externalFactorHandoffId}) =>
      global.INFINICUS.OM.causationAssessmentStore.get(
        "external_factor_handoffs",
        externalFactorHandoffId
      ),
    listAssessments:() =>
      global.INFINICUS.OM.causationAssessmentStore.list(
        "assessments"
      )
  });

  runtime.registerService(
    "om.causation_assessment",
    api,
    {block:"OM-14"}
  );

  runtime.registerRoute(
    "om.causation_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.causation.assess",
    assessCausation
  );

  global.INFINICUS.OM.causationAssessmentEngine=api;
})(window);
