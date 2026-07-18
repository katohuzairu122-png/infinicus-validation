(function(global){
  "use strict";

  function create(input={}){
    const runtime = global.INFINICUS.ABA.runtime;

    if(!input.name || !input.code || !input.constraintType){
      return runtime.failure(
        "ABA_CONSTRAINT_RULE_INVALID",
        "name, code, and constraintType are required."
      );
    }

    return runtime.success({
      constraintRuleId:
        input.constraintRuleId ||
        runtime.createId("aba_constraint_rule"),
      name:
        String(input.name),
      code:
        String(input.code),
      constraintType:
        String(input.constraintType),
      statePath:
        String(input.statePath || ""),
      operator:
        String(input.operator || "exists"),
      expectedValue:
        runtime.clone(input.expectedValue),
      tolerance:
        input.tolerance == null
          ? null
          : Number(input.tolerance),
      severity:
        String(input.severity || "high"),
      blocking:
        input.blocking !== false,
      status:
        String(input.status || "active"),
      createdAt:
        new Date().toISOString()
    });
  }

  global.INFINICUS.ABA.constraintRuleModel =
    Object.freeze({create});
})(window);
