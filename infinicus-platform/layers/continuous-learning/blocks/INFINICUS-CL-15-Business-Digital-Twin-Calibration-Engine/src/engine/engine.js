(function(global){
  "use strict";
  const runtime=global.INFINICUS.CL.runtime;
  const store=global.INFINICUS.CL.businessDigitalTwinCalibrationEngineStore;

  async function registerPolicy(input={}){
    const built=global.INFINICUS.CL.businessDigitalTwinCalibrationEnginePolicyModel.create(input);
    if(!built.ok) return built;
    return store.put("policies",built.data);
  }

  async function process(input={}){
    const policyId=input.businessDigitalTwinCalibrationEnginePolicyId;
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
      businessDigitalTwinCalibrationEngineRecordId:runtime.createId("cl_record"),
      block:"CL-15",
      purpose:"Calibrate Business Digital Twin state and behavior models.",
      sourceBlock:"CL-14",
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
      dataQualityLearningHandoffId:runtime.createId("cl_handoff"),
      targetBlock:"CL-16",
      sourceBlock:"CL-15",
      sourceRecordId:record.businessDigitalTwinCalibrationEngineRecordId,
      record:runtime.clone(record),
      confidence,
      reliability,
      correlationId:record.correlationId,
      lineage:record.lineage.map(runtime.clone),
      status:status==="accepted"||status==="review_required" ? "ready" : "blocked",
      createdAt:new Date().toISOString()
    };

    await store.put("handoffs",handoff);
    await runtime.emit("cl.digital_twin.calibrate.completed",{sourceRecordId:record.businessDigitalTwinCalibrationEngineRecordId,handoffId:handoff.dataQualityLearningHandoffId});
    return runtime.success({record,handoff});
  }


  const api=Object.freeze({registerPolicy,process,
    getRecord:({businessDigitalTwinCalibrationEngineRecordId})=>store.get("records",businessDigitalTwinCalibrationEngineRecordId),
    getHandoff:({dataQualityLearningHandoffId})=>store.get("handoffs",dataQualityLearningHandoffId),
    listRecords:()=>store.list("records")});
  runtime.registerService("cl.business_digital_twin_calibration_engine",api,{block:"CL-15"});

  runtime.registerRoute("cl.digital_twin_calibration_policy.register",registerPolicy);
  runtime.registerRoute("cl.digital_twin.calibrate",process);

  global.INFINICUS.CL.businessDigitalTwinCalibrationEngine=api;
})(window);
