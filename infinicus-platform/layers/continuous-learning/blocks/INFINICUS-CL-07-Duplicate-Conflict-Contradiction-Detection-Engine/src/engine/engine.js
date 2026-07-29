(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.duplicateConflictContradictionEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.duplicateConflictContradictionEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.duplicateConflictContradictionEnginePolicyId;
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
      duplicateConflictContradictionEngineRecordId:runtime.createId("cl_record"),
      block:"CL-07",
      purpose:"Detect duplicate, conflicting, and contradictory learning items.",
      sourceBlock:"CL-06",
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
      existingKnowledgeHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-08",
      sourceBlock:"CL-07",
      sourceRecordId:record.duplicateConflictContradictionEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.learning_conflicts.detect.completed",{sourceRecordId:record.duplicateConflictContradictionEngineRecordId,handoffId:handoff.existingKnowledgeHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({duplicateConflictContradictionEngineRecordId})=>store.get("records",duplicateConflictContradictionEngineRecordId),
    getHandoff:({existingKnowledgeHandoffId})=>store.get("handoffs",existingKnowledgeHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.duplicate_conflict_contradiction_engine",api,{block:"CL-07"});

  runtime.registerRoute("cl.learning_conflict_policy.register",registerPolicy);
  runtime.registerRoute("cl.learning_conflicts.detect",process);

  global.INFINICUS.CL.duplicateConflictContradictionEngine=api;
})(window);
