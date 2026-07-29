(function(global){
  "use strict";

  function getByPath(object,path){
    if(!path) return object;

    return path
      .split(".")
      .reduce(
        (value,key) =>
          value == null ? undefined : value[key],
        object
      );
  }

  function compare(actual,operator,expected,tolerance=null){
    if(operator==="exists") return actual !== undefined && actual !== null;
    if(operator==="equals") return actual === expected;
    if(operator==="not_equals") return actual !== expected;
    if(operator==="gte") return Number(actual) >= Number(expected);
    if(operator==="lte") return Number(actual) <= Number(expected);
    if(operator==="gt") return Number(actual) > Number(expected);
    if(operator==="lt") return Number(actual) < Number(expected);
    if(operator==="includes"){
      return Array.isArray(actual)
        ? actual.includes(expected)
        : String(actual || "").includes(String(expected));
    }
    if(operator==="within_tolerance"){
      return Math.abs(Number(actual)-Number(expected)) <= Number(tolerance || 0);
    }
    return false;
  }

  function evaluate({
    rules,
    dependencies,
    liveState,
    dependencyStates,
    actionContext
  }){
    const issues=[];

    for(const rule of rules.filter(item=>item.status==="active")){
      const actual = getByPath(liveState,rule.statePath);
      const passed = compare(
        actual,
        rule.operator,
        rule.expectedValue,
        rule.tolerance
      );

      if(!passed){
        issues.push({
          type:"constraint",
          ruleId:rule.constraintRuleId,
          code:rule.code,
          severity:rule.severity,
          blocking:rule.blocking,
          actual,
          expected:rule.expectedValue,
          message:`Constraint failed: ${rule.name}`
        });
      }
    }

    for(const dependency of dependencies.filter(item=>item.status==="active")){
      const state = dependencyStates[dependency.code];

      if(
        dependency.expiresAt &&
        new Date(dependency.expiresAt).getTime() <= Date.now()
      ){
        issues.push({
          type:"dependency",
          dependencyId:dependency.dependencyId,
          code:dependency.code,
          severity:"critical",
          blocking:dependency.blocking,
          message:`Dependency expired: ${dependency.name}`
        });
        continue;
      }

      if(state !== dependency.requiredState){
        issues.push({
          type:"dependency",
          dependencyId:dependency.dependencyId,
          code:dependency.code,
          severity:"high",
          blocking:dependency.blocking,
          actual:state,
          expected:dependency.requiredState,
          message:`Dependency unavailable: ${dependency.name}`
        });
      }
    }

    if(
      actionContext.expiresAt &&
      new Date(actionContext.expiresAt).getTime() <= Date.now()
    ){
      issues.push({
        type:"action",
        code:"ACTION_EXPIRED",
        severity:"critical",
        blocking:true,
        message:"Approved action has expired."
      });
    }

    if(actionContext.revokedAt){
      issues.push({
        type:"action",
        code:"ACTION_REVOKED",
        severity:"critical",
        blocking:true,
        message:"Approved action has been revoked."
      });
    }

    return {
      passed:
        !issues.some(item=>item.blocking),
      issues
    };
  }

  global.INFINICUS.ABA.revalidationEvaluator =
    Object.freeze({
      getByPath,
      compare,
      evaluate
    });
})(window);
