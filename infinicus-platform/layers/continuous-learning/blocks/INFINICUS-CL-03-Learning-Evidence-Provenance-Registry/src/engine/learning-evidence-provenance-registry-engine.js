(function(global){
  "use strict";

  const runtime=global.INFINICUS.CL.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.CL.learningEvidencePolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.CL.learningEvidenceStore.put(
      "policies",
      built.data
    );
  }

  async function registerFromHandoff({
    learningEvidenceHandoffId,
    learningEvidencePolicyId,
    sourceEvidenceByItem={}
  }={}){
    const handoff=
      await global.INFINICUS.CL.learningPackageIntakeEngine
        .getLearningEvidenceHandoff({
          learningEvidenceHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.CL.learningEvidenceStore.get(
        "policies",
        learningEvidencePolicyId
      );

    if(!policy.ok) return policy;

    const items=[
      ...handoff.data.lessons.map(item=>({
        itemType:"lesson",
        item
      })),
      ...handoff.data.successFactors.map(item=>({
        itemType:"success_factor",
        item
      })),
      ...handoff.data.failureFactors.map(item=>({
        itemType:"failure_factor",
        item
      })),
      ...handoff.data.hypotheses.map(item=>({
        itemType:"hypothesis",
        item
      })),
      ...handoff.data.decisionRuleFeedback.map(item=>({
        itemType:"decision_rule_feedback",
        item
      })),
      ...handoff.data.modelCalibrationFeedback.map(item=>({
        itemType:"model_calibration_feedback",
        item
      })),
      ...handoff.data.dataQualityLearning.map(item=>({
        itemType:"data_quality_learning",
        item
      })),
      ...handoff.data.operationalLearning.map(item=>({
        itemType:"operational_learning",
        item
      })),
      ...handoff.data.riskLearning.map(item=>({
        itemType:"risk_learning",
        item
      }))
    ];

    const evidenceRecords=[];
    const provenanceRecords=[];
    const bindings=[];

    for(let index=0;index<items.length;index++){
      const wrapped=items[index];
      const itemId=
        wrapped.item.learningItemId ||
        wrapped.item.hypothesisId ||
        wrapped.item.id ||
        `${wrapped.itemType}_${index+1}`;

      const source=
        sourceEvidenceByItem[itemId] || {};

      const evidenceType=
        String(
          source.evidenceType ||
          wrapped.item.evidenceType ||
          (wrapped.itemType==="hypothesis"
            ? "hypothesis"
            : "contextual")
        );

      if(
        !policy.data.acceptedEvidenceTypes.includes(evidenceType)
      ){
        return runtime.failure(
          "CL_EVIDENCE_TYPE_NOT_ACCEPTED",
          `Evidence type is not accepted: ${evidenceType}`,
          {itemId}
        );
      }

      if(
        policy.data.requireSourceReference &&
        !source.sourceReference &&
        !wrapped.item.evidenceReference
      ){
        return runtime.failure(
          "CL_EVIDENCE_SOURCE_REQUIRED",
          "A source reference is required.",
          {itemId}
        );
      }

      const fingerprint=
        global.INFINICUS.CL.learningEvidenceFingerprint.simpleHash({
          learningPackageId:
            handoff.data.outcomeLearningPackageId,
          itemType:wrapped.itemType,
          item:wrapped.item,
          sourceReference:
            source.sourceReference ||
            wrapped.item.evidenceReference ||
            null
        });

      const existing=
        await global.INFINICUS.CL.learningEvidenceStore
          .getByFingerprint(fingerprint);

      let evidence;

      if(existing.ok){
        evidence=existing.data;
      }else{
        evidence={
          learningEvidenceId:
            runtime.createId("cl_learning_evidence"),
          outcomeLearningPackageId:
            handoff.data.outcomeLearningPackageId,
          learningPackageIntakeId:
            handoff.data.learningPackageIntakeId,
          itemId,
          itemType:wrapped.itemType,
          evidenceType,
          evidencePayload:
            runtime.clone(wrapped.item),
          sourceReference:
            source.sourceReference ||
            wrapped.item.evidenceReference ||
            null,
          sourceSystem:
            source.sourceSystem || "OM-24",
          sourceRecordType:
            source.sourceRecordType || wrapped.itemType,
          observedAt:
            source.observedAt || null,
          confidence:
            Math.min(
              Number(
                source.confidence ??
                wrapped.item.confidence ??
                handoff.data.confidence
              ),
              handoff.data.confidence
            ),
          reliability:
            Math.min(
              Number(
                source.reliability ??
                handoff.data.reliability
              ),
              handoff.data.reliability
            ),
          fingerprint,
          correlationId:
            handoff.data.correlationId,
          lineage:[
            ...handoff.data.lineage.map(runtime.clone),
            ...(source.lineage || []).map(runtime.clone)
          ],
          state:"registered",
          registeredAt:new Date().toISOString()
        };

        await global.INFINICUS.CL.learningEvidenceStore.put(
          "evidence",
          evidence
        );
      }

      const provenance={
        learningProvenanceId:
          runtime.createId("cl_learning_provenance"),
        learningEvidenceId:
          evidence.learningEvidenceId,
        outcomeLearningPackageId:
          handoff.data.outcomeLearningPackageId,
        sourceSystem:
          evidence.sourceSystem,
        sourceReference:
          evidence.sourceReference,
        sourceRecordType:
          evidence.sourceRecordType,
        correlationId:
          evidence.correlationId,
        lineage:
          evidence.lineage.map(runtime.clone),
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.CL.learningEvidenceStore.put(
        "provenance",
        provenance
      );

      const binding={
        learningEvidenceBindingId:
          runtime.createId("cl_learning_evidence_binding"),
        learningEvidenceId:
          evidence.learningEvidenceId,
        learningProvenanceId:
          provenance.learningProvenanceId,
        itemId,
        itemType:wrapped.itemType,
        outcomeLearningPackageId:
          handoff.data.outcomeLearningPackageId,
        createdAt:new Date().toISOString()
      };

      await global.INFINICUS.CL.learningEvidenceStore.put(
        "bindings",
        binding
      );

      evidenceRecords.push(evidence);
      provenanceRecords.push(provenance);
      bindings.push(binding);
    }

    const classificationHandoff={
      lessonClassificationHandoffId:
        runtime.createId("cl_lesson_classification_handoff"),
      targetBlock:"CL-04",
      learningPackageIntakeId:
        handoff.data.learningPackageIntakeId,
      outcomeLearningPackageId:
        handoff.data.outcomeLearningPackageId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      learningEvidence:
        evidenceRecords.map(runtime.clone),
      provenance:
        provenanceRecords.map(runtime.clone),
      evidenceBindings:
        bindings.map(runtime.clone),
      limitations:
        handoff.data.limitations.map(runtime.clone),
      applicabilityScope:
        handoff.data.applicabilityScope,
      confidence:
        handoff.data.confidence,
      reliability:
        handoff.data.reliability,
      correlationId:
        handoff.data.correlationId,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.CL.learningEvidenceStore.put(
      "handoffs",
      classificationHandoff
    );

    await runtime.emit(
      "cl.learning_evidence.registered",
      {
        evidenceCount:evidenceRecords.length,
        lessonClassificationHandoffId:
          classificationHandoff.lessonClassificationHandoffId
      }
    );

    return runtime.success({
      learningEvidence:evidenceRecords,
      provenance:provenanceRecords,
      evidenceBindings:bindings,
      lessonClassificationHandoff:classificationHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerFromHandoff,
    getEvidence:({learningEvidenceId}) =>
      global.INFINICUS.CL.learningEvidenceStore.get(
        "evidence",
        learningEvidenceId
      ),
    getLessonClassificationHandoff:({
      lessonClassificationHandoffId
    }) =>
      global.INFINICUS.CL.learningEvidenceStore.get(
        "handoffs",
        lessonClassificationHandoffId
      ),
    listEvidence:() =>
      global.INFINICUS.CL.learningEvidenceStore.list(
        "evidence"
      ),
    listProvenance:() =>
      global.INFINICUS.CL.learningEvidenceStore.list(
        "provenance"
      )
  });

  runtime.registerService(
    "cl.learning_evidence_provenance_registry",
    api,
    {block:"CL-03"}
  );

  runtime.registerRoute(
    "cl.learning_evidence_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "cl.learning_evidence.register_from_handoff",
    registerFromHandoff
  );

  global.INFINICUS.CL.learningEvidenceProvenanceRegistryEngine=api;
})(window);
