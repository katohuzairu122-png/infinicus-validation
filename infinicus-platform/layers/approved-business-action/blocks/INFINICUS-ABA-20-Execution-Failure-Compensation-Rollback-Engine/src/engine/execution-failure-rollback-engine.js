(function(global){
  "use strict";

  const runtime=global.INFINICUS.ABA.runtime;
  const rollbackExecutors=new Map();

  async function registerPolicy(input={}){
    const built=
      global.INFINICUS.ABA.executionFailurePolicyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.executionRollbackStore.put(
      "policies",
      built.data
    );
  }

  function registerRollbackExecutor(code,executor){
    if(!code || typeof executor!=="function"){
      return runtime.failure(
        "ABA_ROLLBACK_EXECUTOR_INVALID",
        "Rollback code and executor function are required."
      );
    }

    rollbackExecutors.set(code,executor);

    return runtime.success({code});
  }

  async function handleFailure({
    executionFailureHandoffId,
    executionFailurePolicyId,
    rollbackSteps=[]
  }={}){
    const handoff=
      await global.INFINICUS.ABA.controlledActionExecutionEngine
        .getExecutionFailureHandoff({
          executionFailureHandoffId
        });

    if(!handoff.ok) return handoff;

    const policy=
      await global.INFINICUS.ABA.executionRollbackStore.get(
        "policies",
        executionFailurePolicyId
      );

    if(!policy.ok) return policy;

    const classified=
      handoff.data.failures.map(failure=>({
        failure:runtime.clone(failure),
        classification:
          global.INFINICUS.ABA.executionFailureClassifier
            .classify(failure,policy.data)
      }));

    const failureCase={
      executionFailureCaseId:
        runtime.createId("aba_execution_failure_case"),
      executionFailureHandoffId,
      executionScheduleId:
        handoff.data.executionScheduleId,
      executionPlanId:
        handoff.data.executionPlanId,
      completedResults:
        handoff.data.results.map(runtime.clone),
      classifiedFailures:
        classified.map(runtime.clone),
      retryPolicy:
        runtime.clone(handoff.data.retryPolicy),
      correlationId:
        handoff.data.correlationId,
      state:"under_review",
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionRollbackStore.put(
      "cases",
      failureCase
    );

    const manualRequired=
      classified.some(item =>
        item.classification.category==="manual_intervention"
      );

    if(manualRequired){
      const updated={
        ...failureCase,
        state:"manual_intervention_required",
        updatedAt:new Date().toISOString()
      };

      await global.INFINICUS.ABA.executionRollbackStore.put(
        "cases",
        updated
      );

      return runtime.success({
        executionFailureCase:updated,
        rollbackPlan:null
      });
    }

    const plan={
      rollbackPlanId:
        runtime.createId("aba_rollback_plan"),
      executionFailureCaseId:
        failureCase.executionFailureCaseId,
      executionPlanId:
        failureCase.executionPlanId,
      state:"planned",
      correlationId:
        failureCase.correlationId,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionRollbackStore.put(
      "plans",
      plan
    );

    const stepRecords=[];

    for(const input of rollbackSteps){
      const built=
        global.INFINICUS.ABA.rollbackStepModel.create(input);

      if(!built.ok) return built;

      const step={
        ...built.data,
        rollbackPlanId:plan.rollbackPlanId
      };

      await global.INFINICUS.ABA.executionRollbackStore.put(
        "steps",
        step
      );

      stepRecords.push(step);
    }

    const ordered=
      [...stepRecords].sort((a,b)=>b.order-a.order);

    const attempts=[];
    let finalState="rolled_back";

    for(const step of ordered){
      if(
        step.rollbackType==="rollback" &&
        step.reversible===false
      ){
        finalState="compensation_required";
        continue;
      }

      const executor=
        rollbackExecutors.get(step.code);

      if(!executor){
        finalState="rollback_failed";

        attempts.push({
          rollbackAttemptId:
            runtime.createId("aba_rollback_attempt"),
          rollbackPlanId:
            plan.rollbackPlanId,
          rollbackStepId:
            step.rollbackStepId,
          state:"failed",
          errorMessage:
            `No rollback executor registered for: ${step.code}`,
          createdAt:
            new Date().toISOString()
        });

        if(policy.data.stopOnRollbackFailure){
          break;
        }

        continue;
      }

      try{
        const response=
          await executor(
            runtime.clone(step),
            {
              mode:step.rollbackType
            }
          );

        const attempt={
          rollbackAttemptId:
            runtime.createId("aba_rollback_attempt"),
          rollbackPlanId:
            plan.rollbackPlanId,
          rollbackStepId:
            step.rollbackStepId,
          state:"completed",
          response:
            runtime.clone(response),
          createdAt:
            new Date().toISOString()
        };

        await global.INFINICUS.ABA.executionRollbackStore.put(
          "attempts",
          attempt
        );

        attempts.push(attempt);
      }catch(error){
        finalState="rollback_failed";

        const attempt={
          rollbackAttemptId:
            runtime.createId("aba_rollback_attempt"),
          rollbackPlanId:
            plan.rollbackPlanId,
          rollbackStepId:
            step.rollbackStepId,
          state:"failed",
          errorMessage:
            error?.message || "Rollback execution failed.",
          createdAt:
            new Date().toISOString()
        };

        await global.INFINICUS.ABA.executionRollbackStore.put(
          "attempts",
          attempt
        );

        attempts.push(attempt);

        if(policy.data.stopOnRollbackFailure){
          break;
        }
      }
    }

    const completedPlan={
      ...plan,
      state:finalState,
      updatedAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionRollbackStore.put(
      "plans",
      completedPlan
    );

    const evidenceHandoff={
      executionEvidenceHandoffId:
        runtime.createId("aba_execution_evidence_handoff"),
      targetBlock:"ABA-21",
      executionFailureCaseId:
        failureCase.executionFailureCaseId,
      rollbackPlanId:
        completedPlan.rollbackPlanId,
      executionScheduleId:
        failureCase.executionScheduleId,
      executionPlanId:
        failureCase.executionPlanId,
      completedResults:
        failureCase.completedResults.map(runtime.clone),
      classifiedFailures:
        failureCase.classifiedFailures.map(runtime.clone),
      rollbackSteps:
        stepRecords.map(runtime.clone),
      rollbackAttempts:
        attempts.map(runtime.clone),
      finalState,
      correlationId:
        failureCase.correlationId,
      status:"ready",
      createdAt:new Date().toISOString()
    };

    await global.INFINICUS.ABA.executionRollbackStore.put(
      "evidence_handoffs",
      evidenceHandoff
    );

    await runtime.emit(
      "aba.execution_failure.handled",
      {
        executionFailureCase:failureCase,
        rollbackPlan:completedPlan,
        executionEvidenceHandoffId:
          evidenceHandoff.executionEvidenceHandoffId
      }
    );

    return runtime.success({
      executionFailureCase:failureCase,
      rollbackPlan:completedPlan,
      rollbackAttempts:attempts,
      executionEvidenceHandoff:evidenceHandoff
    });
  }

  const api=Object.freeze({
    registerPolicy,
    registerRollbackExecutor,
    handleFailure,
    getFailureCase:({executionFailureCaseId}) =>
      global.INFINICUS.ABA.executionRollbackStore.get(
        "cases",
        executionFailureCaseId
      ),
    getExecutionEvidenceHandoff:({executionEvidenceHandoffId}) =>
      global.INFINICUS.ABA.executionRollbackStore.get(
        "evidence_handoffs",
        executionEvidenceHandoffId
      ),
    listRollbackAttempts:() =>
      global.INFINICUS.ABA.executionRollbackStore.list(
        "attempts"
      )
  });

  runtime.registerService(
    "aba.execution_failure_rollback",
    api,
    {block:"ABA-20"}
  );

  runtime.registerRoute(
    "aba.execution_failure_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.execution_failure.handle",
    handleFailure
  );

  runtime.registerBlock("ABA-20",{
    name:"Execution Failure, Compensation and Rollback Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.executionFailureRollbackEngine=
    api;
})(window);
