(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.existingKnowledgeComparisonEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.existingKnowledgeComparisonEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.existingKnowledgeComparisonEnginePolicyId;
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
      existingKnowledgeComparisonEngineRecordId:runtime.createId("cl_record"),
      block:"CL-08",
      purpose:"Compare governed learning against existing enterprise knowledge.",
      sourceBlock:"CL-07",
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
      assumptionValidationHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-09",
      sourceBlock:"CL-08",
      sourceRecordId:record.existingKnowledgeComparisonEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.existing_knowledge.compare.completed",{sourceRecordId:record.existingKnowledgeComparisonEngineRecordId,handoffId:handoff.assumptionValidationHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({existingKnowledgeComparisonEngineRecordId})=>store.get("records",existingKnowledgeComparisonEngineRecordId),
    getHandoff:({assumptionValidationHandoffId})=>store.get("handoffs",assumptionValidationHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.existing_knowledge_comparison_engine",api,{block:"CL-08"});

  runtime.registerRoute("cl.knowledge_comparison_policy.register",registerPolicy);
  runtime.registerRoute("cl.existing_knowledge.compare",process);

  global.INFINICUS.CL.existingKnowledgeComparisonEngine=api;
})(window);
