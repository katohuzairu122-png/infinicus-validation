(function(global){
  "use strict";
  const runtime = global.INFINICUS.ABA.runtime;

  async function createWorkflow({
    approvalWorkflowHandoffId,
    stages = [],
    approvers = []
  }={}){
    const handoff = await global.INFINICUS.ABA.approvalPolicyThresholdEngine
      .getApprovalWorkflowHandoff({approvalWorkflowHandoffId});
    if(!handoff.ok) return handoff;

    const validity = global.INFINICUS.ABA.approvalWorkflowValidator
      .validateApprovers(handoff.data,approvers);
    if(!validity.valid){
      return runtime.failure("ABA_APPROVAL_WORKFLOW_INVALID","Approver assignment failed.",validity);
    }

    const built = global.INFINICUS.ABA.approvalWorkflowModel.create(handoff.data);
    if(!built.ok) return built;
    await global.INFINICUS.ABA.approvalWorkflowStore.put("workflows",built.data);

    const stageInputs = stages.length ? stages : [{
      stageNumber:1,
      roleIds:handoff.data.requiredApproverRoles,
      mode:handoff.data.workflowMode,
      requiredCount:handoff.data.requiredApprovalCount
    }];

    const stageRecords=[];
    const taskRecords=[];

    for(const stageInput of stageInputs){
      const stageBuilt = global.INFINICUS.ABA.approvalStageModel.create({
        workflow:built.data,
        stageNumber:stageInput.stageNumber,
        roleIds:stageInput.roleIds,
        mode:stageInput.mode,
        requiredCount:stageInput.requiredCount
      });
      if(!stageBuilt.ok) return stageBuilt;
      const stage = {
        ...stageBuilt.data,
        state: Number(stageInput.stageNumber)===1 ? "active" : "pending",
        startedAt: Number(stageInput.stageNumber)===1 ? new Date().toISOString() : null
      };
      await global.INFINICUS.ABA.approvalWorkflowStore.put("stages",stage);
      stageRecords.push(stage);

      const stageApprovers = approvers.filter(a =>
        !stage.roleIds.length || stage.roleIds.includes(a.roleId)
      );

      for(const approver of stageApprovers){
        const taskBuilt = global.INFINICUS.ABA.approvalTaskModel.create({
          workflow:built.data,stage,approver
        });
        if(!taskBuilt.ok) return taskBuilt;
        await global.INFINICUS.ABA.approvalWorkflowStore.put("tasks",taskBuilt.data);
        taskRecords.push(taskBuilt.data);
      }
    }

    await runtime.emit("aba.approval_workflow.created",{
      workflow:built.data,
      stageCount:stageRecords.length,
      taskCount:taskRecords.length
    });

    return runtime.success({
      approvalWorkflow:built.data,
      stages:stageRecords,
      tasks:taskRecords
    });
  }

  async function respond({
    approvalTaskId,
    decision,
    conditions=[],
    comment=null
  }={}){
    const allowed=["approved","approved_with_conditions","rejected"];
    if(!allowed.includes(decision)){
      return runtime.failure("ABA_APPROVAL_DECISION_INVALID","Unsupported approval decision.");
    }

    const task = await global.INFINICUS.ABA.approvalWorkflowStore.get("tasks",approvalTaskId);
    if(!task.ok) return task;
    if(task.data.state==="responded"){
      return runtime.success({approvalTask:task.data,idempotentReplay:true});
    }

    const workflow = await global.INFINICUS.ABA.approvalWorkflowStore.get(
      "workflows",task.data.approvalWorkflowId
    );
    if(!workflow.ok) return workflow;

    if(new Date(workflow.data.deadlineAt).getTime() <= Date.now()){
      return runtime.failure("ABA_APPROVAL_WORKFLOW_EXPIRED","Approval workflow deadline has passed.");
    }

    if(decision==="approved_with_conditions" && !workflow.data.allowConditionalApproval){
      return runtime.failure("ABA_CONDITIONAL_APPROVAL_NOT_ALLOWED","Conditional approval is not allowed.");
    }

    const updatedTask={
      ...runtime.clone(task.data),
      state:"responded",
      decision,
      conditions:runtime.clone(conditions),
      comment,
      respondedAt:new Date().toISOString()
    };
    await global.INFINICUS.ABA.approvalWorkflowStore.put("tasks",updatedTask);

    const stageTasks = await global.INFINICUS.ABA.approvalWorkflowStore
      .listByIndex("tasks","stageId",task.data.approvalStageId);
    if(!stageTasks.ok) return stageTasks;

    const stage = await global.INFINICUS.ABA.approvalWorkflowStore.get(
      "stages",task.data.approvalStageId
    );
    if(!stage.ok) return stage;

    const evaluation = global.INFINICUS.ABA.approvalWorkflowValidator.evaluateStage({
      tasks:stageTasks.data.map(t=>t.approvalTaskId===approvalTaskId?updatedTask:t),
      mode:stage.data.mode,
      requiredCount:stage.data.requiredCount,
      unanimous:workflow.data.unanimous
    });

    let updatedWorkflow=workflow.data;
    let evidenceHandoff=null;

    if(evaluation.complete){
      const updatedStage={
        ...runtime.clone(stage.data),
        state:evaluation.outcome==="rejected"?"rejected":"completed",
        completedAt:new Date().toISOString()
      };
      await global.INFINICUS.ABA.approvalWorkflowStore.put("stages",updatedStage);

      updatedWorkflow={
        ...runtime.clone(workflow.data),
        state:evaluation.outcome,
        version:workflow.data.version+1,
        updatedAt:new Date().toISOString()
      };
      await global.INFINICUS.ABA.approvalWorkflowStore.put("workflows",updatedWorkflow);

      evidenceHandoff={
        approvalEvidenceHandoffId:runtime.createId("aba_approval_evidence_handoff"),
        targetBlock:"ABA-08",
        approvalWorkflowId:updatedWorkflow.approvalWorkflowId,
        actionInstanceId:updatedWorkflow.actionInstanceId,
        workflowOutcome:evaluation.outcome,
        tasks:(await global.INFINICUS.ABA.approvalWorkflowStore
          .listByIndex("tasks","workflowId",updatedWorkflow.approvalWorkflowId)).data,
        correlationId:updatedWorkflow.correlationId,
        causationId:updatedWorkflow.causationId,
        status:"ready",
        createdAt:new Date().toISOString()
      };
      await global.INFINICUS.ABA.approvalWorkflowStore.put("evidence_handoffs",evidenceHandoff);
    }

    await runtime.emit("aba.approval_task.responded",{
      approvalTask:updatedTask,
      workflowOutcome:evaluation.outcome,
      approvalEvidenceHandoffId:evidenceHandoff?.approvalEvidenceHandoffId||null
    });

    return runtime.success({
      approvalTask:updatedTask,
      approvalWorkflow:updatedWorkflow,
      stageEvaluation:evaluation,
      approvalEvidenceHandoff:evidenceHandoff
    });
  }

  async function escalate({approvalWorkflowId,reason}={}){
    const workflow = await global.INFINICUS.ABA.approvalWorkflowStore.get(
      "workflows",approvalWorkflowId
    );
    if(!workflow.ok) return workflow;

    const updated={
      ...runtime.clone(workflow.data),
      state:"escalated",
      version:workflow.data.version+1,
      escalationReason:reason||"Approval deadline or authority escalation.",
      updatedAt:new Date().toISOString()
    };
    await global.INFINICUS.ABA.approvalWorkflowStore.put("workflows",updated);
    await runtime.emit("aba.approval_workflow.escalated",updated);
    return runtime.success(updated);
  }

  const api=Object.freeze({
    createWorkflow,
    respond,
    escalate,
    getWorkflow:({approvalWorkflowId}) =>
      global.INFINICUS.ABA.approvalWorkflowStore.get("workflows",approvalWorkflowId),
    getApprovalEvidenceHandoff:({approvalEvidenceHandoffId}) =>
      global.INFINICUS.ABA.approvalWorkflowStore.get("evidence_handoffs",approvalEvidenceHandoffId),
    listWorkflowTasks:({approvalWorkflowId}) =>
      global.INFINICUS.ABA.approvalWorkflowStore.listByIndex("tasks","workflowId",approvalWorkflowId)
  });

  runtime.registerService("aba.multi_stage_approval_workflow",api,{block:"ABA-07"});
  runtime.registerRoute("aba.approval_workflow.create",createWorkflow);
  runtime.registerRoute("aba.approval_task.respond",respond);
  runtime.registerRoute("aba.approval_workflow.escalate",escalate);
  runtime.registerBlock("ABA-07",{
    name:"Multi-Stage Approval Workflow Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.multiStageApprovalWorkflowEngine=api;
})(window);
