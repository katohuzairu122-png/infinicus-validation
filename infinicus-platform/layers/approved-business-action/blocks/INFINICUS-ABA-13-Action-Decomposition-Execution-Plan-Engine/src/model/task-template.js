(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_TASK_TEMPLATE_INVALID",
        "Task template name and code are required."
      );
    }

    return runtime.success({
      taskTemplateId:
        input.taskTemplateId ||
        runtime.createId("aba_task_template"),
      name:
        String(input.name),
      code:
        String(input.code),
      description:
        String(input.description || ""),
      actionTypeIds:
        runtime.clone(input.actionTypeIds || []),
      defaultDurationMinutes:
        Math.max(1, Number(input.defaultDurationMinutes || 60)),
      requiredCapabilities:
        runtime.clone(input.requiredCapabilities || []),
      requiredInputs:
        runtime.clone(input.requiredInputs || []),
      expectedOutputs:
        runtime.clone(input.expectedOutputs || []),
      completionCriteria:
        runtime.clone(input.completionCriteria || []),
      verificationCriteria:
        runtime.clone(input.verificationCriteria || []),
      rollbackInstructions:
        runtime.clone(input.rollbackInstructions || []),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.taskTemplateModel =
    Object.freeze({create});
})(window);
