(function(global){
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerPolicy(input={}){
    const built =
      global.INFINICUS.ABA.actionBoundaryPolicyModel
        .create(input);

    if(!built.ok) return built;

    return global.INFINICUS.ABA.actionBoundaryStore.put(
      "policies",
      built.data
    );
  }

  async function defineBoundary({
    actionBoundaryHandoffId,
    actionBoundaryPolicyId,
    requestedTarget,
    requestedParameters={},
    executionWindow={},
    financialValue=0,
    currency="USD",
    quantity=0,
    geographicCode=null,
    operations=[]
  }={}){
    const handoff =
      await global.INFINICUS.ABA.approvedActionContractEngine
        .getActionBoundaryHandoff({
          actionBoundaryHandoffId
        });

    if(!handoff.ok) return handoff;

    const contract =
      await global.INFINICUS.ABA.approvedActionContractEngine
        .getActionContract({
          actionContractId:
            handoff.data.actionContractId
        });

    if(!contract.ok) return contract;

    const policy =
      await global.INFINICUS.ABA.actionBoundaryStore.get(
        "policies",
        actionBoundaryPolicyId
      );

    if(!policy.ok) return policy;

    const validation =
      global.INFINICUS.ABA.actionBoundaryValidator.validate({
        contract:contract.data,
        policy:policy.data,
        requestedTarget:
          requestedTarget || contract.data.target,
        requestedParameters,
        executionWindow,
        financialValue,
        currency,
        quantity,
        geographicCode,
        operations
      });

    if(!validation.valid){
      const violation={
        actionBoundaryViolationId:
          runtime.createId("aba_action_boundary_violation"),
        actionBoundaryHandoffId,
        actionContractId:
          contract.data.actionContractId,
        actionInstanceId:
          contract.data.actionInstanceId,
        issues:
          validation.issues,
        requestedTarget:
          runtime.clone(requestedTarget || {}),
        requestedParameters:
          runtime.clone(requestedParameters),
        executionWindow:
          runtime.clone(executionWindow),
        financialValue:
          Number(financialValue),
        currency,
        quantity:
          Number(quantity),
        geographicCode,
        operations:
          runtime.clone(operations),
        correlationId:
          contract.data.correlationId,
        createdAt:
          new Date().toISOString()
      };

      await global.INFINICUS.ABA.actionBoundaryStore.put(
        "violations",
        violation
      );

      await runtime.emit(
        "aba.action_boundary.violated",
        violation
      );

      return runtime.failure(
        "ABA_ACTION_BOUNDARY_VIOLATION",
        "Requested action exceeds approved boundaries.",
        violation
      );
    }

    const boundary={
      actionBoundaryId:
        runtime.createId("aba_action_boundary"),
      actionBoundaryHandoffId,
      actionBoundaryPolicyId,
      actionContractId:
        contract.data.actionContractId,
      actionInstanceId:
        contract.data.actionInstanceId,
      businessId:
        contract.data.businessId,
      twinId:
        contract.data.twinId,
      decisionId:
        contract.data.decisionId,
      recommendationId:
        contract.data.recommendationId,
      actionTypeId:
        contract.data.actionTypeId,
      actionTypeCode:
        contract.data.actionTypeCode,
      actionCategoryId:
        contract.data.actionCategoryId,
      target:
        runtime.clone(
          requestedTarget || contract.data.target
        ),
      boundedParameters:
        runtime.clone(requestedParameters),
      executionWindow:
        runtime.clone(executionWindow),
      financialBoundary:{
        maximum:
          policy.data.maximumFinancialValue,
        requested:
          Number(financialValue),
        currency
      },
      quantityBoundary:{
        maximum:
          policy.data.maximumQuantity,
        requested:
          Number(quantity)
      },
      geographicBoundary:{
        allowed:
          runtime.clone(policy.data.geographicCodes),
        requested:
          geographicCode
      },
      operationBoundary:{
        allowed:
          runtime.clone(policy.data.allowedOperations),
        forbidden:
          runtime.clone(policy.data.forbiddenOperations),
        requested:
          runtime.clone(operations)
      },
      parameterRules:
        runtime.clone(policy.data.parameterRules),
      approvalConditions:
        contract.data.approvalConditions.map(runtime.clone),
      executionConditions:
        contract.data.executionConditions.map(runtime.clone),
      rollbackConditions:
        contract.data.rollbackConditions.map(runtime.clone),
      monitoringRequirements:
        contract.data.monitoringRequirements.map(runtime.clone),
      constraints:
        contract.data.constraints.map(runtime.clone),
      dependencies:
        contract.data.dependencies.map(runtime.clone),
      expectedOutcomes:
        contract.data.expectedOutcomes.map(runtime.clone),
      expiresAt:
        contract.data.expiresAt,
      revokedAt:
        contract.data.revokedAt,
      confidence:
        contract.data.confidence,
      lineage:
        contract.data.lineage.map(runtime.clone),
      correlationId:
        contract.data.correlationId,
      causationId:
        contract.data.causationId,
      status:
        "bounded",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionBoundaryStore.put(
      "boundaries",
      boundary
    );

    const revalidationHandoff={
      constraintRevalidationHandoffId:
        runtime.createId("aba_constraint_revalidation_handoff"),
      targetBlock:
        "ABA-11",
      actionBoundaryId:
        boundary.actionBoundaryId,
      actionContractId:
        boundary.actionContractId,
      actionInstanceId:
        boundary.actionInstanceId,
      businessId:
        boundary.businessId,
      twinId:
        boundary.twinId,
      decisionId:
        boundary.decisionId,
      recommendationId:
        boundary.recommendationId,
      actionTypeId:
        boundary.actionTypeId,
      actionTypeCode:
        boundary.actionTypeCode,
      actionCategoryId:
        boundary.actionCategoryId,
      target:
        runtime.clone(boundary.target),
      boundedParameters:
        runtime.clone(boundary.boundedParameters),
      executionWindow:
        runtime.clone(boundary.executionWindow),
      financialBoundary:
        runtime.clone(boundary.financialBoundary),
      quantityBoundary:
        runtime.clone(boundary.quantityBoundary),
      geographicBoundary:
        runtime.clone(boundary.geographicBoundary),
      operationBoundary:
        runtime.clone(boundary.operationBoundary),
      approvalConditions:
        boundary.approvalConditions.map(runtime.clone),
      executionConditions:
        boundary.executionConditions.map(runtime.clone),
      rollbackConditions:
        boundary.rollbackConditions.map(runtime.clone),
      monitoringRequirements:
        boundary.monitoringRequirements.map(runtime.clone),
      constraints:
        boundary.constraints.map(runtime.clone),
      dependencies:
        boundary.dependencies.map(runtime.clone),
      expectedOutcomes:
        boundary.expectedOutcomes.map(runtime.clone),
      expiresAt:
        boundary.expiresAt,
      revokedAt:
        boundary.revokedAt,
      confidence:
        boundary.confidence,
      lineage:
        boundary.lineage.map(runtime.clone),
      correlationId:
        boundary.correlationId,
      causationId:
        boundary.causationId,
      status:
        "ready",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.actionBoundaryStore.put(
      "revalidation_handoffs",
      revalidationHandoff
    );

    await runtime.emit(
      "aba.action_boundary.defined",
      {
        actionBoundary:boundary,
        constraintRevalidationHandoffId:
          revalidationHandoff.constraintRevalidationHandoffId
      }
    );

    return runtime.success({
      actionBoundary:boundary,
      constraintRevalidationHandoff:
        revalidationHandoff
    });
  }

  const api = Object.freeze({
    registerPolicy,
    defineBoundary,
    getActionBoundary:({actionBoundaryId}) =>
      global.INFINICUS.ABA.actionBoundaryStore.get(
        "boundaries",
        actionBoundaryId
      ),
    getConstraintRevalidationHandoff:({
      constraintRevalidationHandoffId
    }) =>
      global.INFINICUS.ABA.actionBoundaryStore.get(
        "revalidation_handoffs",
        constraintRevalidationHandoffId
      ),
    listViolations:() =>
      global.INFINICUS.ABA.actionBoundaryStore.list(
        "violations"
      )
  });

  runtime.registerService(
    "aba.action_scope_boundary",
    api,
    {block:"ABA-10"}
  );

  runtime.registerRoute(
    "aba.action_boundary_policy.register",
    registerPolicy
  );

  runtime.registerRoute(
    "aba.action_boundary.define",
    defineBoundary
  );

  runtime.registerBlock("ABA-10",{
    name:"Action Scope, Parameter and Boundary Engine",
    version:"1.0.0",
    status:"active"
  });

  global.INFINICUS.ABA.actionScopeBoundaryEngine =
    api;
})(window);
