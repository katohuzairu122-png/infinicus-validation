(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.learningRecommendationGenerationEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.learningRecommendationGenerationEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.learningRecommendationGenerationEnginePolicyId;
    const policy=await store.get("policies",policyId);
    if(!policy.ok) return policy;

    const upstream=input.upstreamHandoff||input.payload||{};
    const confidence=Number(upstream.confidence??input.confidence??0.7);
    const reliability=Number(upstream.reliability??input.reliability??0.7);

    const status=
      confidence>=policy.data.minimumConfidence &&
      reliability>=policy.data.minimumReliability
        ? (policy.data.requireHumanReview ? "review_required" : "accepted")
        : "insufficient_evidence";

    const record={
      learningRecommendationGenerationEngineRecordId:runtime.createId("cl_record"),
      block:"CL-19",
      purpose:"Generate prioritized, evidence-backed learning recommendations.",
      sourceBlock:"CL-18",
      status,
      confidence,
      reliability,
      findings:runtime.clone(input.findings||upstream.findings||[]),
      recommendations:runtime.clone(input.recommendations||[]),
      conflicts:runtime.clone(input.conflicts||[]),
      assumptions:runtime.clone(input.assumptions||[]),
      updates:runtime.clone(input.updates||[]),
      correlationId:upstream.correlationId||input.correlationId||null,
      lineage:runtime.clone(upstream.lineage||input.lineage||[]),
      createdAt:new Date().toISOString()
    };

    await store.put("records",record);

    const handoff={
      learningGovernanceHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-20",
      sourceBlock:"CL-19",
      sourceRecordId:record.learningRecommendationGenerationEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.learning_recommendations.generate.completed",{sourceRecordId:record.learningRecommendationGenerationEngineRecordId,handoffId:handoff.learningGovernanceHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({learningRecommendationGenerationEngineRecordId})=>store.get("records",learningRecommendationGenerationEngineRecordId),
    getHandoff:({learningGovernanceHandoffId})=>store.get("handoffs",learningGovernanceHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.learning_recommendation_generation_engine",api,{block:"CL-19"});

  runtime.registerRoute("cl.learning_recommendation_policy.register",registerPolicy);
  runtime.registerRoute("cl.learning_recommendations.generate",process);

  global.INFINICUS.CL.learningRecommendationGenerationEngine=api;
})(window);
