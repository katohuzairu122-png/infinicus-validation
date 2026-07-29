(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.controlledKnowledgeUpdateEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.controlledKnowledgeUpdateEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.controlledKnowledgeUpdateEnginePolicyId;
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
      controlledKnowledgeUpdateEngineRecordId:runtime.createId("cl_record"),
      block:"CL-21",
      purpose:"Apply approved learning changes to controlled knowledge stores.",
      sourceBlock:"CL-20",
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
      modelRuleDeploymentHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-22",
      sourceBlock:"CL-21",
      sourceRecordId:record.controlledKnowledgeUpdateEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.knowledge_updates.apply.completed",{sourceRecordId:record.controlledKnowledgeUpdateEngineRecordId,handoffId:handoff.modelRuleDeploymentHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({controlledKnowledgeUpdateEngineRecordId})=>store.get("records",controlledKnowledgeUpdateEngineRecordId),
    getHandoff:({modelRuleDeploymentHandoffId})=>store.get("handoffs",modelRuleDeploymentHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.controlled_knowledge_update_engine",api,{block:"CL-21"});

  runtime.registerRoute("cl.knowledge_update_policy.register",registerPolicy);
  runtime.registerRoute("cl.knowledge_updates.apply",process);

  global.INFINICUS.CL.controlledKnowledgeUpdateEngine=api;
})(window);
