(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.modelRulePolicyDeploymentEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.modelRulePolicyDeploymentEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.modelRulePolicyDeploymentEnginePolicyId;
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
      modelRulePolicyDeploymentEngineRecordId:runtime.createId("cl_record"),
      block:"CL-22",
      purpose:"Deploy approved model, rule, and policy updates.",
      sourceBlock:"CL-21",
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
      learningImpactVerificationHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-23",
      sourceBlock:"CL-22",
      sourceRecordId:record.modelRulePolicyDeploymentEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.learning_updates.deploy.completed",{sourceRecordId:record.modelRulePolicyDeploymentEngineRecordId,handoffId:handoff.learningImpactVerificationHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({modelRulePolicyDeploymentEngineRecordId})=>store.get("records",modelRulePolicyDeploymentEngineRecordId),
    getHandoff:({learningImpactVerificationHandoffId})=>store.get("handoffs",learningImpactVerificationHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.model_rule_policy_deployment_engine",api,{block:"CL-22"});

  runtime.registerRoute("cl.learning_deployment_policy.register",registerPolicy);
  runtime.registerRoute("cl.learning_updates.deploy",process);

  global.INFINICUS.CL.modelRulePolicyDeploymentEngine=api;
})(window);
