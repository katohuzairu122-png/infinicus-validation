(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.decisionPolicyLearningEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.decisionPolicyLearningEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.decisionPolicyLearningEnginePolicyId;
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
      decisionPolicyLearningEngineRecordId:runtime.createId("cl_record"),
      block:"CL-11",
      purpose:"Generate decision-policy updates from governed learning.",
      sourceBlock:"CL-10",
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
      riskModelLearningHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-12",
      sourceBlock:"CL-11",
      sourceRecordId:record.decisionPolicyLearningEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.decision_policies.learn.completed",{sourceRecordId:record.decisionPolicyLearningEngineRecordId,handoffId:handoff.riskModelLearningHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({decisionPolicyLearningEngineRecordId})=>store.get("records",decisionPolicyLearningEngineRecordId),
    getHandoff:({riskModelLearningHandoffId})=>store.get("handoffs",riskModelLearningHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.decision_policy_learning_engine",api,{block:"CL-11"});

  runtime.registerRoute("cl.decision_policy_learning_policy.register",registerPolicy);
  runtime.registerRoute("cl.decision_policies.learn",process);

  global.INFINICUS.CL.decisionPolicyLearningEngine=api;
})(window);
