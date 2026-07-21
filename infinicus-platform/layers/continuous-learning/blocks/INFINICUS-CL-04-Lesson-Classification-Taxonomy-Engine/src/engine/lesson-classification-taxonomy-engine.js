(function(global){
  "use strict";

  const runtime=global.INFINICUS.CL.runtime;

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.CL.learningTaxonomyPolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.CL.lessonClassificationStore.put(
      "policies",
      built.data
    );
  }

  async function registerTaxonomy(input={}){
    if(!input.name || !input.categoryCode){
      return runtime.failure(
        "CL_TAXONOMY_INVALID",
        "Taxonomy name and category code are required."
      );
    }

    const taxonomy={
      learningTaxonomyId:
        input.learningTaxonomyId ||
        runtime.createId("cl_taxonomy"),
      name:String(input.name),
      categoryCode:String(input.categoryCode),
      subcategoryCode:
        input.subcategoryCode
          ? String(input.subcategoryCode)
          : null,
      domain:String(input.domain || "general"),
      learningPurpose:
        String(input.learningPurpose || "knowledge"),
      keywords:
        runtime.clone(input.keywords || []),
      evidenceTypes:
        runtime.clone(
          input.evidenceTypes || [
            "observed",
            "calculated",
            "contextual",
            "documentary",
            "expert_review",
            "hypothesis"
          ]
        ),
      status:String(input.status || "active"),
      createdAt:new Date().toISOString()
    };

    return global.INFINICUS.CL.lessonClassificationStore.put(
      "taxonomies",
      taxonomy
    );
  }

  async function classify({
    lessonClassificationHandoffId,
    learningTaxonomyPolicyId
  }={}){
    const handoff=
      await global.INFINICUS.CL.learningEvidenceProvenanceRegistryEngine
        .getLessonClassificationHandoff({
          lessonClassificationHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.CL.lessonClassificationStore.get(
        "policies",
        learningTaxonomyPolicyId
      );

    if(!policy.ok) return policy;

    const taxonomies=
      await global.INFINICUS.CL.lessonClassificationStore.list(
        "taxonomies"
      );

    if(!taxonomies.ok) return taxonomies;

    const activeTaxonomies=
      taxonomies.data.filter(
        item=>item.status==="active"
      );

    const classifications=[];
    const unclassified=[];

    for(const evidence of handoff.data.learningEvidence){
      const eligibleTaxonomies=
        activeTaxonomies.filter(
          taxonomy=>
            taxonomy.evidenceTypes.includes(
              evidence.evidenceType
            )
        );

      const result=
        global.INFINICUS.CL.taxonomyClassifier.classify({
          evidence,
          taxonomies:eligibleTaxonomies,
          policy:policy.data
        });

      if(
        policy.data.requirePrimaryCategory &&
        result.unclassified
      ){
        const record={
          unclassifiedLearningItemId:
            runtime.createId("cl_unclassified_item"),
          learningEvidenceId:
            evidence.learningEvidenceId,
          outcomeLearningPackageId:
            handoff.data.outcomeLearningPackageId,
          reason:"no_taxonomy_match_above_threshold",
          evidenceType:
            evidence.evidenceType,
          confidence:
            evidence.confidence,
          correlationId:
            evidence.correlationId,
          createdAt:new Date().toISOString()
        };

        await global.INFINICUS.CL.lessonClassificationStore.put(
          "unclassified",
          record
        );

        unclassified.push(record);
        continue;
      }

      const classification={
        lessonClassificationId:
          runtime.createId("cl_lesson_classification"),
        learningEvidenceId:
          evidence.learningEvidenceId,
        outcomeLearningPackageId:
          handoff.data.outcomeLearningPackageId,
        itemId:
          evidence.itemId,
        itemType:
          evidence.itemType,
        evidenceType:
          evidence.evidenceType,
        primaryCategory:
          result.primaryClassification,
        classifications:
          result.classifications.map(runtime.clone),
        classificationConfidence:
          result.primaryClassification?.confidence || 0,
        confidence:
          Math.min(
            evidence.confidence,
            result.primaryClassification?.confidence || 0
          ),
        reliability:
          evidence.reliability,
        correlationId:
          evidence.correlationId,
        lineage:
          evidence.lineage.map(runtime.clone),
        classifiedAt:new Date().toISOString()
      };

      await global.INFINICUS.CL.lessonClassificationStore.put(
        "classifications",
        classification
      );

      classifications.push(classification);
    }

    const applicabilityHandoff={
      applicabilityScopeHandoffId:
        runtime.createId("cl_applicability_scope_handoff"),
      targetBlock:"CL-05",
      learningPackageIntakeId:
        handoff.data.learningPackageIntakeId,
      outcomeLearningPackageId:
        handoff.data.outcomeLearningPackageId,
      outcomeVerdictId:
        handoff.data.outcomeVerdictId,
      classifications:
        classifications.map(runtime.clone),
      unclassifiedItems:
        unclassified.map(runtime.clone),
      learningEvidence:
        handoff.data.learningEvidence.map(runtime.clone),
      provenance:
        handoff.data.provenance.map(runtime.clone),
      evidenceBindings:
        handoff.data.evidenceBindings.map(runtime.clone),
      limitations:
        handoff.data.limitations.map(runtime.clone),
      declaredApplicabilityScope:
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

    await global.INFINICUS.CL.lessonClassificationStore.put(
      "handoffs",
      applicabilityHandoff
    );

    await runtime.emit(
      "cl.lessons.classified",
      {
        classificationCount:
          classifications.length,
        unclassifiedCount:
          unclassified.length,
        applicabilityScopeHandoffId:
          applicabilityHandoff.applicabilityScopeHandoffId
      }
    );

    return runtime.success({
      classifications,
      unclassifiedItems:unclassified,
      applicabilityScopeHandoff:applicabilityHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerTaxonomy,
    classify,
    getClassification:({lessonClassificationId}) =>
      global.INFINICUS.CL.lessonClassificationStore.get(
        "classifications",
        lessonClassificationId
      ),
    getApplicabilityScopeHandoff:({
      applicabilityScopeHandoffId
    }) =>
      global.INFINICUS.CL.lessonClassificationStore.get(
        "handoffs",
        applicabilityScopeHandoffId
      ),
    listClassifications:() =>
      global.INFINICUS.CL.lessonClassificationStore.list(
        "classifications"
      ),
    listUnclassifiedItems:() =>
      global.INFINICUS.CL.lessonClassificationStore.list(
        "unclassified"
      )
  });

  runtime.registerService(
    "cl.lesson_classification_taxonomy",
    api,
    {block:"CL-04"}
  );

  runtime.registerRoute(
    "cl.learning_taxonomy_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "cl.learning_taxonomy.register",
    registerTaxonomy
  );

  runtime.registerRoute(
    "cl.lessons.classify",
    classify
  );

  global.INFINICUS.CL.lessonClassificationTaxonomyEngine=api;
})(window);
