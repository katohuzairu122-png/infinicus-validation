(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.businessRuleLearningEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.businessRuleLearningEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.businessRuleLearningEnginePolicyId;
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
      businessRuleLearningEngineRecordId:runtime.createId("cl_record"),
      block:"CL-10",
      purpose:"Generate governed business-rule updates from validated learning.",
      sourceBlock:"CL-09",
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
      decisionPolicyLearningHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-11",
      sourceBlock:"CL-10",
      sourceRecordId:record.businessRuleLearningEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.business_rules.learn.completed",{sourceRecordId:record.businessRuleLearningEngineRecordId,handoffId:handoff.decisionPolicyLearningHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({businessRuleLearningEngineRecordId})=>store.get("records",businessRuleLearningEngineRecordId),
    getHandoff:({decisionPolicyLearningHandoffId})=>store.get("handoffs",decisionPolicyLearningHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.business_rule_learning_engine",api,{block:"CL-10"});

  runtime.registerRoute("cl.business_rule_learning_policy.register",registerPolicy);
  runtime.registerRoute("cl.business_rules.learn",process);

  global.INFINICUS.CL.businessRuleLearningEngine=api;
})(window);
