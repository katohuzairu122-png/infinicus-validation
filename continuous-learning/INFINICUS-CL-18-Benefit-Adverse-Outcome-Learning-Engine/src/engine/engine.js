(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.benefitAdverseOutcomeLearningEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.benefitAdverseOutcomeLearningEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.benefitAdverseOutcomeLearningEnginePolicyId;
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
      benefitAdverseOutcomeLearningEngineRecordId:runtime.createId("cl_record"),
      block:"CL-18",
      purpose:"Learn jointly from realized benefits and adverse outcomes.",
      sourceBlock:"CL-17",
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
      learningRecommendationHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-19",
      sourceBlock:"CL-18",
      sourceRecordId:record.benefitAdverseOutcomeLearningEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.benefit_adverse.learn.completed",{sourceRecordId:record.benefitAdverseOutcomeLearningEngineRecordId,handoffId:handoff.learningRecommendationHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({benefitAdverseOutcomeLearningEngineRecordId})=>store.get("records",benefitAdverseOutcomeLearningEngineRecordId),
    getHandoff:({learningRecommendationHandoffId})=>store.get("handoffs",learningRecommendationHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.benefit_adverse_outcome_learning_engine",api,{block:"CL-18"});

  runtime.registerRoute("cl.benefit_adverse_learning_policy.register",registerPolicy);
  runtime.registerRoute("cl.benefit_adverse.learn",process);

  global.INFINICUS.CL.benefitAdverseOutcomeLearningEngine=api;
})(window);
