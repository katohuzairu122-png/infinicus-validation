(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code){
      return runtime.failure(
        "ABA_CONTRACT_TEMPLATE_INVALID",
        "Contract template name and code are required."
      );
    }

    return runtime.success({
      actionContractTemplateId:
        input.actionContractTemplateId ||
        runtime.createId("aba_action_contract_template"),
      name:
        String(input.name),
      code:
        String(input.code),
      description:
        String(input.description || ""),
      requiredSections:
        runtime.clone(
          input.requiredSections || [
            "identity",
            "approval",
            "target",
            "parameters",
            "conditions",
            "constraints",
            "dependencies",
            "expected_outcomes",
            "rollback",
            "monitoring"
          ]
        ),
      defaultValidityHours:
        Math.max(1,Number(input.defaultValidityHours || 72)),
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.actionContractTemplateModel =
    Object.freeze({create});
})(window);
