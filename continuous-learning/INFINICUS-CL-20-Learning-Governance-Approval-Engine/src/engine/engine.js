(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.learningGovernanceApprovalEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.learningGovernanceApprovalEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.learningGovernanceApprovalEnginePolicyId;
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
      learningGovernanceApprovalEngineRecordId:runtime.createId("cl_record"),
      block:"CL-20",
      purpose:"Govern, approve, reject, or revise proposed learning changes.",
      sourceBlock:"CL-19",
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
      controlledKnowledgeUpdateHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-21",
      sourceBlock:"CL-20",
      sourceRecordId:record.learningGovernanceApprovalEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.learning_changes.review.completed",{sourceRecordId:record.learningGovernanceApprovalEngineRecordId,handoffId:handoff.controlledKnowledgeUpdateHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({learningGovernanceApprovalEngineRecordId})=>store.get("records",learningGovernanceApprovalEngineRecordId),
    getHandoff:({controlledKnowledgeUpdateHandoffId})=>store.get("handoffs",controlledKnowledgeUpdateHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.learning_governance_approval_engine",api,{block:"CL-20"});

  runtime.registerRoute("cl.learning_governance_policy.register",registerPolicy);
  runtime.registerRoute("cl.learning_changes.review",process);

  global.INFINICUS.CL.learningGovernanceApprovalEngine=api;
})(window);
