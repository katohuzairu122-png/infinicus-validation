(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.assumptionValidationRevisionEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.assumptionValidationRevisionEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.assumptionValidationRevisionEnginePolicyId;
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
      assumptionValidationRevisionEngineRecordId:runtime.createId("cl_record"),
      block:"CL-09",
      purpose:"Validate, confirm, challenge, and revise business assumptions.",
      sourceBlock:"CL-08",
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
      businessRuleLearningHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-10",
      sourceBlock:"CL-09",
      sourceRecordId:record.assumptionValidationRevisionEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.assumptions.validate.completed",{sourceRecordId:record.assumptionValidationRevisionEngineRecordId,handoffId:handoff.businessRuleLearningHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({assumptionValidationRevisionEngineRecordId})=>store.get("records",assumptionValidationRevisionEngineRecordId),
    getHandoff:({businessRuleLearningHandoffId})=>store.get("handoffs",businessRuleLearningHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.assumption_validation_revision_engine",api,{block:"CL-09"});

  runtime.registerRoute("cl.assumption_policy.register",registerPolicy);
  runtime.registerRoute("cl.assumptions.validate",process);

  global.INFINICUS.CL.assumptionValidationRevisionEngine=api;
})(window);
