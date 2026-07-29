(function(global){
  "use strict";

  const phases=[
    "intake",
    "master_data",
    "connectors",
    "harmonization",
    "quality",
    "metrics",
    "financial",
    "revenue",
    "profitability",
    "customer",
    "product",
    "operations",
    "workforce",
    "inventory",
    "liquidity",
    "trends",
    "benchmarking",
    "risk",
    "forecast_inputs",
    "root_cause",
    "reporting",
    "distribution",
    "twin_publication"
  ];

  async function run({context={},handlers={},correlationId=null}={}){
    const runtime=global.INFINICUS.BI.runtime;
    const pipelineRunId=runtime.createId("bi_pipeline_run");
    const completed=[];
    let current=runtime.clone(context);

    for(const phase of phases){
      const handler=handlers[phase];

      if(typeof handler!=="function"){
        return runtime.failure(
          "BI_PIPELINE_HANDLER_MISSING",
          `Missing pipeline handler: ${phase}`,
          {pipelineRunId,completed}
        );
      }

      const result=await handler(runtime.clone(current));

      if(!result?.ok){
        return runtime.failure(
          "BI_PIPELINE_PHASE_FAILED",
          `Business Intelligence pipeline failed at: ${phase}`,
          {pipelineRunId,phase,result,completed}
        );
      }

      current={...current,[phase]:runtime.clone(result.data)};
      completed.push({
        phase,
        status:"completed",
        completedAt:new Date().toISOString()
      });

      await runtime.emit("bi.master.phase_completed",{
        pipelineRunId,
        phase,
        correlationId
      });
    }

    return runtime.success({
      pipelineRunId,
      correlationId,
      completed,
      context:current,
      status:"completed",
      completedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.masterPipelineOrchestrator=
    Object.freeze({phases,run});
})(window);
