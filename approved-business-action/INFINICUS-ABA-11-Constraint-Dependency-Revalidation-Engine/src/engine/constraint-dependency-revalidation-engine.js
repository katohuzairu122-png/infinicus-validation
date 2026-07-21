(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerConstraint(input={}){
    const built =
      global.INFINICUS.ABA.constraintRuleModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.revalidationStore.put(
      "constraints",
      built.data
    );
  }

  async function registerDependency(input={}){
    const built =
      global.INFINICUS.ABA.dependencyModel.create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.revalidationStore.put(
      "dependencies",
      built.data
    );
  }

  async function revalidate({
    constraintRevalidationHandoffId,
    constraintRuleIds=[],
    dependencyIds=[],
    liveState={},
    dependencyStates={}
  }={}){
    const handoff =
      await global.INFINICUS.ABA.actionScopeBoundaryEngine
        .getConstraintRevalidationHandoff({
          constraintRevalidationHandoffId
        });

    if(!handoff.ok) return handoff;

    const rules=[];

    for(const id of constraintRuleIds){
      const result =
        await global.INFINICUS.ABA.revalidationStore.get(
          "constraints",
          id
        );

      if(!result.ok) return result;
      rules.push(result.data);
    }

    const dependencies=[];

    for(const id of dependencyIds){
      const result =
        await global.INFINICUS.ABA.revalidationStore.get(
          "dependencies",
          id
        );

      if(!result.ok) return result;
      dependencies.push(result.data);
    }

    const evaluation =
      global.INFINICUS.ABA.revalidationEvaluator.evaluate({
        rules,
        dependencies,
        liveState,
        dependencyStates,
        actionContext:handoff.data
      });

    const resultRecord={
      revalidationResultId:
        runtime.createId("aba_revalidation_result"),
      constraintRevalidationHandoffId,
      actionBoundaryId:
        handoff.data.actionBoundaryId,
      actionContractId:
        handoff.data.actionContractId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        handoff.data.businessId,
      passed:
        evaluation.passed,
      issues:
        runtime.clone(evaluation.issues),
      liveState:
        runtime.clone(liveState),
      dependencyStates:
        runtime.clone(dependencyStates),
      correlationId:
        handoff.data.correlationId,
      status:
        evaluation.passed
          ? "passed"
          : "blocked",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.revalidationStore.put(
      "results",
      resultRecord
    );

    for(const issue of evaluation.issues){
      await global.INFINICUS.ABA.revalidationStore.put(
        "issues",
        {
          revalidationIssueId:
            runtime.createId("aba_revalidation_issue"),
          revalidationResultId:
            resultRecord.revalidationResultId,
          actionInstanceId:
            resultRecord.actionInstanceId,
          ...runtime.clone(issue),
          correlationId:
            resultRecord.correlationId,
          createdAt:
            new Date().toISOString()
        }
      );
    }

    if(!evaluation.passed){
      await runtime.emit(
        "aba.revalidation.blocked",
        resultRecord
      );

      return runtime.failure(
        "ABA_REVALIDATION_FAILED",
        "Live constraints or dependencies failed revalidation.",
        resultRecord
      );
    }

    const conflictHandoff={
      conflictAnalysisHandoffId:
        runtime.createId("aba_conflict_analysis_handoff"),
      targetBlock:
        "ABA-12",
      revalidationResultId:
        resultRecord.revalidationResultId,
      actionBoundaryId:
        handoff.data.actionBoundaryId,
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
      actionCategoryId:
        handoff.data.actionCategoryId,
      target:
        runtime.clone(handoff.data.target),
      boundedParameters:
        runtime.clone(handoff.data.boundedParameters),
      executionWindow:
        runtime.clone(handoff.data.executionWindow),
      constraints:
        handoff.data.constraints.map(runtime.clone),
      dependencies:
        handoff.data.dependencies.map(runtime.clone),
      riskEvidence:
        handoff.data.riskEvidence.map(runtime.clone),
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      revalidationEvidence:
        runtime.clone(resultRecord),
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

    await global.INFINICUS.ABA.revalidationStore.put(
      "conflict_handoffs",
      conflictHandoff
    );

    await runtime.emit(
      "aba.revalidation.passed",
      {
        revalidationResult:resultRecord,
        conflictAnalysisHandoffId:
          conflictHandoff.conflictAnalysisHandoffId
      }
    );

    return runtime.success({
      revalidationResult:resultRecord,
      conflictAnalysisHandoff:conflictHandoff
    });
  }

  const api = Object.freeze({
    registerConstraint,
    registerDependency,
    revalidate,
    getRevalidationResult:({revalidationResultId}) =>
      global.INFINICUS.ABA.revalidationStore.get(
        "results",
        revalidationResultId
      ),
    getConflictAnalysisHandoff:({conflictAnalysisHandoffId}) =>
      global.INFINICUS.ABA.revalidationStore.get(
        "conflict_handoffs",
        conflictAnalysisHandoffId
      ),
    listIssues:() =>
      global.INFINICUS.ABA.revalidationStore.list(
        "issues"
      )
  });

  runtime.registerService(
    "aba.constraint_dependency_revalidation",
    api,
    {block:"ABA-11"}
  );

  runtime.registerRoute(
    "aba.constraint_rule.register",
    registerConstraint
  );

  runtime.registerRoute(
    "aba.dependency.register",
    registerDependency
  );

  runtime.registerRoute(
    "aba.constraints.revalidate",
    revalidate
  );

  runtime.registerBlock("ABA-11",{
    name:"Constraint and Dependency Revalidation Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.constraintDependencyRevalidationEngine =
    api;
})(window);
