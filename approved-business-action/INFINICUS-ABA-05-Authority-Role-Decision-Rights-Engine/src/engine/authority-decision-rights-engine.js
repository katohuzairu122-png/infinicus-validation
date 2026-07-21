(function (global) {
  "use strict";

  const runtime = global.INFINICUS.ABA.runtime;

  async function registerRole(input = {}) {
    const built = global.INFINICUS.ABA.roleModel.create(input);
    if (!built.ok) return built;
    return global.INFINICUS.ABA.authorityStore.put("roles", built.data);
  }

  async function registerScope(input = {}) {
    const built = global.INFINICUS.ABA.authorityScopeModel.create(input);
    if (!built.ok) return built;
    return global.INFINICUS.ABA.authorityStore.put("scopes", built.data);
  }

  async function registerDecisionRight(input = {}) {
    const role =
      await global.INFINICUS.ABA.authorityStore.get(
        "roles",
        input.roleId
      );

    if (!role.ok) return role;

    const scope =
      await global.INFINICUS.ABA.authorityStore.get(
        "scopes",
        input.authorityScopeId
      );

    if (!scope.ok) return scope;

    const built =
      global.INFINICUS.ABA.decisionRightModel.create(input);

    if (!built.ok) return built;

    return global.INFINICUS.ABA.authorityStore.put(
      "rights",
      built.data
    );
  }

  async function registerDelegation(input = {}) {
    const right =
      await global.INFINICUS.ABA.authorityStore.get(
        "rights",
        input.decisionRightId
      );

    if (!right.ok) return right;

    const built =
      global.INFINICUS.ABA.delegationModel.create(input);

    if (!built.ok) return built;

    return global.INFINICUS.ABA.authorityStore.put(
      "delegations",
      built.data
    );
  }

  async function evaluateAuthority({
    authorityHandoffId,
    actor,
    roleId,
    decisionRightId,
    delegationId,
    financialValue = 0,
    currency = "USD",
    riskSeverity = "low",
    conflicts = []
  } = {}) {
    const handoff =
      await global.INFINICUS.ABA.actionInstanceLifecycleRegistry
        .getAuthorityHandoff({ authorityHandoffId });

    if (!handoff.ok) return handoff;

    const role =
      await global.INFINICUS.ABA.authorityStore.get(
        "roles",
        roleId
      );

    if (!role.ok) return role;

    const right =
      await global.INFINICUS.ABA.authorityStore.get(
        "rights",
        decisionRightId
      );

    if (!right.ok) return right;

    const scope =
      await global.INFINICUS.ABA.authorityStore.get(
        "scopes",
        right.data.authorityScopeId
      );

    if (!scope.ok) return scope;

    let delegation = null;

    if (delegationId) {
      const delegated =
        await global.INFINICUS.ABA.authorityStore.get(
          "delegations",
          delegationId
        );

      if (!delegated.ok) return delegated;
      delegation = delegated.data;
    }

    const evaluationResult =
      global.INFINICUS.ABA.authorityEvaluator.evaluate({
        actor,
        role: role.data,
        decisionRight: right.data,
        scope: scope.data,
        delegation,
        action: handoff.data,
        financialValue,
        currency,
        riskSeverity,
        conflicts
      });

    const evaluation = {
      authorityEvaluationId:
        runtime.createId("aba_authority_evaluation"),
      authorityHandoffId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      businessId:
        handoff.data.businessId,
      actor:
        runtime.clone(actor),
      roleId,
      decisionRightId,
      authorityScopeId:
        scope.data.authorityScopeId,
      delegationId:
        delegation?.delegationId || null,
      financialValue:
        Number(financialValue),
      currency,
      riskSeverity,
      conflicts:
        runtime.clone(conflicts),
      eligible:
        evaluationResult.eligible,
      issues:
        evaluationResult.issues,
      correlationId:
        handoff.data.correlationId,
      status:
        evaluationResult.eligible
          ? "eligible"
          : "ineligible",
      createdAt:
        new Date().toISOString()
    };

    await global.INFINICUS.ABA.authorityStore.put(
      "evaluations",
      evaluation
    );

    if (!evaluationResult.eligible) {
      await runtime.emit(
        "aba.authority.ineligible",
        evaluation
      );

      return runtime.failure(
        "ABA_AUTHORITY_INELIGIBLE",
        "Actor is not eligible to approve this action.",
        evaluation
      );
    }

    const policyHandoff = {
      approvalPolicyHandoffId:
        runtime.createId("aba_approval_policy_handoff"),
      targetBlock:
        "ABA-06",
      authorityEvaluationId:
        evaluation.authorityEvaluationId,
      authorityHandoffId,
      actionInstanceId:
        handoff.data.actionInstanceId,
      actionDefinitionId:
        handoff.data.actionDefinitionId,
      businessId:
        handoff.data.businessId,
      twinId:
        handoff.data.twinId,
      decisionId:
        handoff.data.decisionId,
      recommendationId:
        handoff.data.recommendationId,
      actionTypeId:
        handoff.data.actionTypeId,
      actionTypeCode:
        handoff.data.actionTypeCode,
      actionCategoryId:
        handoff.data.actionCategoryId,
      target:
        runtime.clone(handoff.data.target),
      parameters:
        runtime.clone(handoff.data.parameters),
      requiredApprovalClass:
        handoff.data.requiredApprovalClass,
      reversibility:
        handoff.data.reversibility,
      constraints:
        handoff.data.constraints.map(runtime.clone),
      dependencies:
        handoff.data.dependencies.map(runtime.clone),
      riskEvidence:
        handoff.data.riskEvidence.map(runtime.clone),
      expectedOutcomes:
        handoff.data.expectedOutcomes.map(runtime.clone),
      eligibleAuthority:
        runtime.clone(evaluation),
      financialValue:
        Number(financialValue),
      currency,
      riskSeverity,
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

    await global.INFINICUS.ABA.authorityStore.put(
      "policy_handoffs",
      policyHandoff
    );

    await runtime.emit(
      "aba.authority.eligible",
      {
        evaluation,
        approvalPolicyHandoffId:
          policyHandoff.approvalPolicyHandoffId
      }
    );

    return runtime.success({
      authorityEvaluation:
        evaluation,
      approvalPolicyHandoff:
        policyHandoff
    });
  }

  const api = Object.freeze({
    registerRole,
    registerScope,
    registerDecisionRight,
    registerDelegation,
    evaluateAuthority,
    getAuthorityEvaluation: ({ authorityEvaluationId }) =>
      global.INFINICUS.ABA.authorityStore.get(
        "evaluations",
        authorityEvaluationId
      ),
    getApprovalPolicyHandoff: ({ approvalPolicyHandoffId }) =>
      global.INFINICUS.ABA.authorityStore.get(
        "policy_handoffs",
        approvalPolicyHandoffId
      ),
    listRoles: () =>
      global.INFINICUS.ABA.authorityStore.list("roles"),
    listDecisionRights: () =>
      global.INFINICUS.ABA.authorityStore.list("rights")
  });

  runtime.registerService(
    "aba.authority_decision_rights",
    api,
    { block: "ABA-05" }
  );

  runtime.registerRoute(
    "aba.role.register",
    registerRole
  );

  runtime.registerRoute(
    "aba.authority_scope.register",
    registerScope
  );

  runtime.registerRoute(
    "aba.decision_right.register",
    registerDecisionRight
  );

  runtime.registerRoute(
    "aba.delegation.register",
    registerDelegation
  );

  runtime.registerRoute(
    "aba.authority.evaluate",
    evaluateAuthority
  );

  runtime.registerBlock("ABA-05", {
    name:
      "Authority, Role and Decision-Rights Engine",
    version:
      "1.0.0",
    status:
      "active"
  });

  global.INFINICUS.ABA.authorityDecisionRightsEngine =
    api;
})(window);
