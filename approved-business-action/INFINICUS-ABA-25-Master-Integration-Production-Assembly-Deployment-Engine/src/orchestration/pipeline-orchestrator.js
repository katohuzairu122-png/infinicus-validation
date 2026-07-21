(function(global){
  "use strict";

  const ABA = global.INFINICUS.ABA;

  const phaseDefinitions = Object.freeze([
    {phase:"intake",blockId:"ABA-02"},
    {phase:"definition",blockId:"ABA-03"},
    {phase:"lifecycle",blockId:"ABA-04"},
    {phase:"authority",blockId:"ABA-05"},
    {phase:"approval_policy",blockId:"ABA-06"},
    {phase:"approval_workflow",blockId:"ABA-07"},
    {phase:"approval_evidence",blockId:"ABA-08"},
    {phase:"action_contract",blockId:"ABA-09"},
    {phase:"boundaries",blockId:"ABA-10"},
    {phase:"revalidation",blockId:"ABA-11"},
    {phase:"collision_check",blockId:"ABA-12"},
    {phase:"decomposition",blockId:"ABA-13"},
    {phase:"assignment",blockId:"ABA-14"},
    {phase:"reservation",blockId:"ABA-15"},
    {phase:"scheduling",blockId:"ABA-16"},
    {phase:"adapter_selection",blockId:"ABA-17"},
    {phase:"dry_run",blockId:"ABA-18"},
    {phase:"execution",blockId:"ABA-19"},
    {phase:"rollback",blockId:"ABA-20"},
    {phase:"execution_evidence",blockId:"ABA-21"},
    {phase:"completion_verification",blockId:"ABA-22"},
    {phase:"monitoring_contract",blockId:"ABA-23"},
    {phase:"publication",blockId:"ABA-24"}
  ]);

  async function run({
    pipelineName="approved_business_action",
    correlationId=null,
    context={},
    handlers={}
  }={}){
    const runtime=ABA.runtime;
    const pipelineRunId=runtime.createId("aba_pipeline_run");
    const phases=[];
    let currentContext=runtime.clone(context);

    for(const definition of phaseDefinitions){
      const handler=handlers[definition.phase];

      if(typeof handler!=="function"){
        return runtime.failure(
          "ABA_PIPELINE_HANDLER_MISSING",
          `Pipeline handler missing for phase: ${definition.phase}`,
          {
            pipelineRunId,
            failedPhase:definition.phase,
            blockId:definition.blockId,
            phases
          }
        );
      }

      const startedAt=new Date().toISOString();

      try{
        const result=await handler(runtime.clone(currentContext));

        if(!result?.ok){
          return runtime.failure(
            "ABA_PIPELINE_PHASE_FAILED",
            `Pipeline phase failed: ${definition.phase}`,
            {
              pipelineRunId,
              failedPhase:definition.phase,
              blockId:definition.blockId,
              result,
              phases
            }
          );
        }

        currentContext={
          ...currentContext,
          [definition.phase]:runtime.clone(result.data)
        };

        phases.push({
          phase:definition.phase,
          blockId:definition.blockId,
          status:"completed",
          startedAt,
          completedAt:new Date().toISOString()
        });

        await runtime.emit(
          "aba.master.pipeline_phase_completed",
          {
            pipelineRunId,
            phase:definition.phase,
            blockId:definition.blockId,
            correlationId
          }
        );
      }catch(error){
        return runtime.failure(
          "ABA_PIPELINE_PHASE_EXCEPTION",
          error?.message || `Pipeline phase exception: ${definition.phase}`,
          {
            pipelineRunId,
            failedPhase:definition.phase,
            blockId:definition.blockId,
            phases
          }
        );
      }
    }

    const terminal =
      currentContext.publication?.outcomePublication ||
      currentContext.publication ||
      {};

    return runtime.success({
      pipelineRunId,
      pipelineName,
      correlationId,
      phases,
      context:currentContext,
      terminal,
      status:"completed",
      completedAt:new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.masterPipelineOrchestrator =
    Object.freeze({
      phaseDefinitions,
      run
    });
})(window);
