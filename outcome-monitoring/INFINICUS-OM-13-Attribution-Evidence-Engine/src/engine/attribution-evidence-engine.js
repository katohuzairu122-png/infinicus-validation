(function(global){
  "use strict";

  const runtime=global.INFINICUS.OM.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.OM.attributionPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.OM.attributionEvidenceStore.put(
      "policies",
      built.data
    );
  }

  async function registerCounterfactual(input={}){
    if(!input.name || !input.referenceType){
      return runtime.failure(
        "OM_COUNTERFACTUAL_INVALID",
        "Counterfactual name and referenceType are required."
      );
    }

    const record={
      counterfactualReferenceId:
        input.counterfactualReferenceId ||
        runtime.createId("om_counterfactual"),
      name:String(input.name),
      referenceType:String(input.referenceType),
      comparisonGroupReference:
        input.comparisonGroupReference || null,
      baselinePeriod:
        runtime.clone(input.baselinePeriod || {}),
      evidence:
        runtime.clone(input.evidence || {}),
      confidence:
        Math.max(0,Math.min(1,Number(input.confidence ?? 0.5))),
      createdAt:new Date().toISOString()
    };

    return global.INFINICUS.OM.attributionEvidenceStore.put(
      "counterfactuals",
      record
    );
  }

  async function assessAttribution({
    attributionEvidenceHandoffId,
    attributionPolicyId,
    evidenceByMetric={}
  }={}){
    const handoff=
      await global.INFINICUS.OM.alertEscalationEngine
        .getAttributionEvidenceHandoff({
          attributionEvidenceHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.OM.attributionEvidenceStore.get(
        "policies",
        attributionPolicyId
      );

    if(!policy.ok) return policy;

    const evidenceRecords=[];
    const assessments=[];

    for(const progress of handoff.data.progressRecords){
      const supplied=evidenceByMetric[progress.metricId] || {};

      const evidence={
        attributionEvidenceId:
          runtime.createId("om_attribution_evidence"),
        monitoringContractId:
          handoff.data.monitoringContractId,
        actionInstanceId:
          supplied.actionInstanceId || null,
        metricId:
          progress.metricId,
        outcomeProgressId:
          progress.outcomeProgressId,
        timingAlignment:
          Number(supplied.timingAlignment ?? 0),
        scopeAlignment:
          Number(supplied.scopeAlignment ?? 0),
        exposureEvidence:
          Number(supplied.exposureEvidence ?? 0),
        mechanismEvidence:
          Number(supplied.mechanismEvidence ?? 0),
        counterfactualEvidence:
          Number(supplied.counterfactualEvidence ?? 0),
        counterfactualReference:
          supplied.counterfactualReference || null,
        alternativeExplanationStrength:
          Number(supplied.alternativeExplanationStrength ?? 0),
        evidenceItems:
          runtime.clone(supplied.evidenceItems || []),
        correlationId:
          handoff.data.correlationId,
        lineage:[
          ...handoff.data.lineage.map(runtime.clone),
          ...progress.lineage.map(runtime.clone)
        ],
        confidence:
          Math.min(
            Number(supplied.confidence ?? 1),
            progress.confidence,
            handoff.data.confidence
          ),
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.attributionEvidenceStore.put(
        "evidence",
        evidence
      );

      const scored=
        global.INFINICUS.OM.attributionScorer.score({
          evidence,
          policy:policy.data
        });

      const assessment={
        attributionAssessmentId:
          runtime.createId("om_attribution_assessment"),
        attributionEvidenceId:
          evidence.attributionEvidenceId,
        monitoringContractId:
          evidence.monitoringContractId,
        actionInstanceId:
          evidence.actionInstanceId,
        metricId:
          evidence.metricId,
        outcomeProgressId:
          evidence.outcomeProgressId,
        attributionScore:
          scored.attributionScore,
        components:
          runtime.clone(scored.components),
        missingEvidence:
          runtime.clone(scored.missing),
        sufficientEvidence:
          scored.sufficient,
        classification:
          scored.classification,
        causationEstablished:false,
        confidence:
          Number(
            (
              evidence.confidence *
              scored.attributionScore
            ).toFixed(4)
          ),
        correlationId:
          evidence.correlationId,
        lineage:
          evidence.lineage.map(runtime.clone),
        assessedAt:new Date().toISOString()
      };

      await global.INFINICUS.OM.attributionEvidenceStore.put(
        "assessments",
        assessment
      );

      evidenceRecords.push(evidence);
      assessments.push(assessment);
    }

    const causationHandoff={
      causationAssessmentHandoffId:
        runtime.createId("om_causation_assessment_handoff"),
      targetBlock:"OM-14",
      monitoringContractId:
        handoff.data.monitoringContractId,
      attributionEvidence:
        evidenceRecords.map(runtime.clone),
      attributionAssessments:
        assessments.map(runtime.clone),
      alerts:
        handoff.data.alerts.map(runtime.clone),
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

    await global.INFINICUS.OM.attributionEvidenceStore.put(
      "causation_handoffs",
      causationHandoff
    );

    await runtime.emit(
      "om.attribution.assessed",
      {
        assessmentCount:assessments.length,
        causationAssessmentHandoffId:
          causationHandoff.causationAssessmentHandoffId
      }
    );

    return runtime.success({
      attributionEvidence:evidenceRecords,
      attributionAssessments:assessments,
      causationAssessmentHandoff:causationHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerCounterfactual,
    assessAttribution,
    getAssessment:({attributionAssessmentId}) =>
      global.INFINICUS.OM.attributionEvidenceStore.get(
        "assessments",
        attributionAssessmentId
      ),
    getCausationAssessmentHandoff:({
      causationAssessmentHandoffId
    }) =>
      global.INFINICUS.OM.attributionEvidenceStore.get(
        "causation_handoffs",
        causationAssessmentHandoffId
      ),
    listAssessments:() =>
      global.INFINICUS.OM.attributionEvidenceStore.list(
        "assessments"
      )
  });

  runtime.registerService(
    "om.attribution_evidence",
    api,
    {block:"OM-13"}
  );

  runtime.registerRoute(
    "om.attribution_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "om.counterfactual.register",
    registerCounterfactual
  );

  runtime.registerRoute(
    "om.attribution.assess",
    assessAttribution
  );

  global.INFINICUS.OM.attributionEvidenceEngine=api;
})(window);
