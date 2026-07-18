(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.riskModelLearningEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.riskModelLearningEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.riskModelLearningEnginePolicyId;
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
      riskModelLearningEngineRecordId:runtime.createId("cl_record"),
      block:"CL-12",
      purpose:"Update risk factors, weights, thresholds, and controls.",
      sourceBlock:"CL-11",
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
      forecastCalibrationHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-13",
      sourceBlock:"CL-12",
      sourceRecordId:record.riskModelLearningEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.risk_models.learn.completed",{sourceRecordId:record.riskModelLearningEngineRecordId,handoffId:handoff.forecastCalibrationHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({riskModelLearningEngineRecordId})=>store.get("records",riskModelLearningEngineRecordId),
    getHandoff:({forecastCalibrationHandoffId})=>store.get("handoffs",forecastCalibrationHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.risk_model_learning_engine",api,{block:"CL-12"});

  runtime.registerRoute("cl.risk_learning_policy.register",registerPolicy);
  runtime.registerRoute("cl.risk_models.learn",process);

  global.INFINICUS.CL.riskModelLearningEngine=api;
})(window);
