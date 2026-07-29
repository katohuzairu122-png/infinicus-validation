(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.operationalProcessImprovementEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.operationalProcessImprovementEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.operationalProcessImprovementEnginePolicyId;
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
      operationalProcessImprovementEngineRecordId:runtime.createId("cl_record"),
      block:"CL-17",
      purpose:"Generate controlled operational process improvements.",
      sourceBlock:"CL-16",
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
      benefitAdverseLearningHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-18",
      sourceBlock:"CL-17",
      sourceRecordId:record.operationalProcessImprovementEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.operations.improve.completed",{sourceRecordId:record.operationalProcessImprovementEngineRecordId,handoffId:handoff.benefitAdverseLearningHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({operationalProcessImprovementEngineRecordId})=>store.get("records",operationalProcessImprovementEngineRecordId),
    getHandoff:({benefitAdverseLearningHandoffId})=>store.get("handoffs",benefitAdverseLearningHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.operational_process_improvement_engine",api,{block:"CL-17"});

  runtime.registerRoute("cl.operational_learning_policy.register",registerPolicy);
  runtime.registerRoute("cl.operations.improve",process);

  global.INFINICUS.CL.operationalProcessImprovementEngine=api;
})(window);
