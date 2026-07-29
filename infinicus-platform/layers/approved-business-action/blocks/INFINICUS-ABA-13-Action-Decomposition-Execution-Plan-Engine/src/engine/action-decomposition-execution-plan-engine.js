(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerTaskTemplate(input={}){
    const built =
      global.INFINICUS.ABA.taskTemplateModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.decompositionStore.put(
      "templates",
      built.data
    );
  }

  async function decompose({
    actionDecompositionHandoffId,
    taskDefinitions=[]
  }={}){
    const handoff =
      await global.INFINICUS.ABA.actionCollisionEngine
        .getActionDecompositionHandoff({
          actionDecompositionHandoffId
        });

    if(!handoff.ok) return handoff;

    const plan={
      executionPlanId:
        runtime.createId("aba_execution_plan"),
      actionDecompositionHandoffId,
      collisionAnalysisId:
        handoff.data.collisionAnalysisId,
      actionContractId:
        handoff.data.actionContractId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionTypeCode:
        handoff.data.actionTypeCode,
      target:
        runtime.clone(handoff.data.target),
      boundedParameters:
        runtime.clone(handoff.data.boundedParameters),
      executionWindow:
        runtime.clone(handoff.data.executionWindow),
      allocations:
        runtime.clone(handoff.data.allocations),
      operations:
        runtime.clone(handoff.data.operations),
      state:
        "draft",
      version:
        1,
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      createdAt:
        new Date().toISOString(),
      updatedAt:
        new Date().toISOString()
    };

    const taskRecords=[];

    for(let index=0;index<taskDefinitions.length;index+=1){
      const definition=taskDefinitions[index];

      const template =
        await global.INFINICUS.ABA.decompositionStore.get(
          "templates",
          definition.taskTemplateId
        );

      if(!template.ok) return template;

      const built =
        global.INFINICUS.ABA.executionTaskModel.create({
          plan,
          template:template.data,
          input:definition,
          sequence:index+1
        });

      if(!built.ok) return built;
      taskRecords.push(built.data);
    }

    const validation =
      global.INFINICUS.ABA.decompositionValidator.validate(
        taskRecords
      );

    if(!validation.valid){
      return runtime.failure(
        "ABA_EXECUTION_PLAN_INVALID",
        "Execution plan failed decomposition validation.",
        validation
      );
    }

    const criticalPath =
      global.INFINICUS.ABA.decompositionValidator
        .calculateCriticalPath(taskRecords);

    const completedPlan={
      ...plan,
      taskCount:
        taskRecords.length,
      criticalPath:
        runtime.clone(criticalPath),
      state:
        "defined",
      updatedAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.decompositionStore.put(
      "plans",
      completedPlan
    );

    for(const task of taskRecords){
      await global.INFINICUS.ABA.decompositionStore.put(
        "tasks",
        task
      );

      if(task.isMilestone){
        await global.INFINICUS.ABA.decompositionStore.put(
          "milestones",
          {
            executionMilestoneId:
              runtime.createId("aba_execution_milestone"),
            executionPlanId:
              completedPlan.executionPlanId,
            executionTaskId:
              task.executionTaskId,
            name:
              task.name,
            verificationCriteria:
              runtime.clone(task.verificationCriteria),
            state:
              "planned",
            createdAt:
              new Date().toISOString()
          }
        );
      }
    }

    const assignmentHandoff={
      taskAssignmentHandoffId:
        runtime.createId("aba_task_assignment_handoff"),
      targetBlock:
        "ABA-14",
      executionPlanId:
        completedPlan.executionPlanId,
      actionContractId:
        completedPlan.actionContractId,
      actionInstanceId:
        completedPlan.actionInstanceId,
      businessId:
        completedPlan.businessId,
      twinId:
        completedPlan.twinId,
      actionTypeId:
        completedPlan.actionTypeId,
      actionTypeCode:
        completedPlan.actionTypeCode,
      target:
        runtime.clone(completedPlan.target),
      executionWindow:
        runtime.clone(completedPlan.executionWindow),
      allocations:
        runtime.clone(completedPlan.allocations),
      tasks:
        taskRecords.map(runtime.clone),
      criticalPath:
        runtime.clone(criticalPath),
      constraints:
        handoff.data.constraints.map(runtime.clone),
      dependencies:
        handoff.data.dependencies.map(runtime.clone),
      riskEvidence:
        handoff.data.riskEvidence.map(runtime.clone),
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      confidence:
        handoff.data.confidence,
      lineage:
        handoff.data.lineage.map(runtime.clone),
      correlationId:
        handoff.data.correlationId,
      causationId:
        handoff.data.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.decompositionStore.put(
      "assignment_handoffs",
      assignmentHandoff
    );

    await runtime.emit(
      "aba.execution_plan.created",
      {
        executionPlan:completedPlan,
        taskAssignmentHandoffId:
          assignmentHandoff.taskAssignmentHandoffId
      }
    );

    return runtime.success({
      executionPlan:completedPlan,
      tasks:taskRecords,
      taskAssignmentHandoff:assignmentHandoff
    });
  }

  const api = Object.freeze({
    registerTaskTemplate,
    decompose,
    getExecutionPlan:({executionPlanId}) =>
      global.INFINICUS.ABA.decompositionStore.get(
        "plans",
        executionPlanId
      ),
    getTaskAssignmentHandoff:({taskAssignmentHandoffId}) =>
      global.INFINICUS.ABA.decompositionStore.get(
        "assignment_handoffs",
        taskAssignmentHandoffId
      ),
    listExecutionTasks:({executionPlanId}) =>
      global.INFINICUS.ABA.decompositionStore.listByIndex(
        "tasks",
        "executionPlanId",
        executionPlanId
      )
  });

  runtime.registerService(
    "aba.action_decomposition_execution_plan",
    api,
    {block:"ABA-13"}
  );

  runtime.registerRoute(
    "aba.task_template.register",
    registerTaskTemplate
  );

  runtime.registerRoute(
    "aba.action.decompose",
    decompose
  );

  runtime.registerBlock("ABA-13",{
    name:"Action Decomposition and Execution Plan Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.actionDecompositionExecutionPlanEngine =
    api;
})(window);
