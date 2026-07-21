(function(global){
  "use strict";

  function create({plan,template,input={},sequence=1}){
    const runtime = global.INFINICUS.ABA.runtime;

    return runtime.success({
      executionTaskId:
        input.executionTaskId ||
        runtime.createId("aba_execution_task"),
      executionPlanId:
        plan.executionPlanId,
      taskTemplateId:
        template.taskTemplateId,
      name:
        String(input.name || template.name),
      code:
        String(input.code || template.code),
      description:
        String(input.description || template.description || ""),
      sequence:
        Number(input.sequence || sequence),
      groupCode:
        String(input.groupCode || "default"),
      executionMode:
        String(input.executionMode || "sequential"),
      durationMinutes:
        Math.max(
          1,
          Number(
            input.durationMinutes ||
            template.defaultDurationMinutes ||
            60
          )
        ),
      dependencies:
        runtime.clone(input.dependencies || []),
      requiredCapabilities:
        runtime.clone(
          input.requiredCapabilities ||
          template.requiredCapabilities ||
          []
        ),
      inputs:
        runtime.clone(input.inputs || {}),
      expectedOutputs:
        runtime.clone(
          input.expectedOutputs ||
          template.expectedOutputs ||
          []
        ),
      completionCriteria:
        runtime.clone(
          input.completionCriteria ||
          template.completionCriteria ||
          []
        ),
      verificationCriteria:
        runtime.clone(
          input.verificationCriteria ||
          template.verificationCriteria ||
          []
        ),
      rollbackInstructions:
        runtime.clone(
          input.rollbackInstructions ||
          template.rollbackInstructions ||
          []
        ),
      isMilestone:
        Boolean(input.isMilestone),
      isRollbackPoint:
        Boolean(input.isRollbackPoint),
      state:
        "planned",
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.executionTaskModel =
    Object.freeze({create});
})(window);
