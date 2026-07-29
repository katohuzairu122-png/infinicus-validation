(function(global){
  "use strict";

  function includesOrOpen(values,value){
    return !values.length || values.includes(value);
  }

  function validateParameterRule(name,value,rule={}){
    const issues=[];

    if(rule.required && (value===undefined || value===null)){
      issues.push(`Required parameter is missing: ${name}`);
      return issues;
    }

    if(value===undefined || value===null){
      return issues;
    }

    if(
      rule.minimum != null &&
      Number(value) < Number(rule.minimum)
    ){
      issues.push(`${name} is below the approved minimum.`);
    }

    if(
      rule.maximum != null &&
      Number(value) > Number(rule.maximum)
    ){
      issues.push(`${name} exceeds the approved maximum.`);
    }

    if(
      Array.isArray(rule.allowedValues) &&
      rule.allowedValues.length &&
      !rule.allowedValues.some(item =>
        JSON.stringify(item) === JSON.stringify(value)
      )
    ){
      issues.push(`${name} contains a value outside the approved set.`);
    }

    return issues;
  }

  function validate({
    contract,
    policy,
    requestedTarget,
    requestedParameters,
    executionWindow,
    financialValue,
    currency,
    quantity,
    geographicCode,
    operations
  }){
    const issues=[];

    if(contract.status!=="issued"){
      issues.push("Action contract is not active.");
    }

    if(
      contract.expiresAt &&
      new Date(contract.expiresAt).getTime() <= Date.now()
    ){
      issues.push("Action contract has expired.");
    }

    if(contract.revokedAt){
      issues.push("Action contract has been revoked.");
    }

    if(
      !includesOrOpen(
        policy.actionTypeIds,
        contract.actionTypeId
      )
    ){
      issues.push("Boundary policy does not apply to this action type.");
    }

    if(
      !includesOrOpen(
        policy.allowedTargetTypeIds,
        requestedTarget?.targetTypeId
      )
    ){
      issues.push("Requested target type is outside approved scope.");
    }

    if(
      contract.target?.targetId &&
      requestedTarget?.targetId !== contract.target.targetId
    ){
      issues.push("Requested target differs from approved target.");
    }

    for(const [name,rule] of Object.entries(policy.parameterRules || {})){
      issues.push(
        ...validateParameterRule(
          name,
          requestedParameters[name],
          rule
        )
      );
    }

    for(const [name,value] of Object.entries(requestedParameters || {})){
      if(
        Object.prototype.hasOwnProperty.call(
          contract.parameters || {},
          name
        ) &&
        JSON.stringify(value) !==
        JSON.stringify(contract.parameters[name])
      ){
        const rule = policy.parameterRules?.[name];

        if(!rule?.allowOverride){
          issues.push(
            `Requested parameter changes approved value: ${name}`
          );
        }
      }
    }

    if(
      policy.maximumFinancialValue != null &&
      Number(financialValue || 0) >
      policy.maximumFinancialValue
    ){
      issues.push("Requested financial value exceeds approved boundary.");
    }

    if(
      policy.maximumFinancialValue != null &&
      currency !== policy.currency
    ){
      issues.push("Requested currency differs from boundary currency.");
    }

    if(
      policy.maximumQuantity != null &&
      Number(quantity || 0) >
      policy.maximumQuantity
    ){
      issues.push("Requested quantity exceeds approved boundary.");
    }

    if(
      !includesOrOpen(
        policy.geographicCodes,
        geographicCode
      )
    ){
      issues.push("Requested geography is outside approved boundary.");
    }

    for(const operation of operations || []){
      if(
        policy.forbiddenOperations.includes(operation)
      ){
        issues.push(`Operation is forbidden: ${operation}`);
      }

      if(
        policy.allowedOperations.length &&
        !policy.allowedOperations.includes(operation)
      ){
        issues.push(`Operation is not approved: ${operation}`);
      }
    }

    if(
      policy.maximumDurationMinutes != null &&
      executionWindow?.startsAt &&
      executionWindow?.endsAt
    ){
      const duration =
        (
          new Date(executionWindow.endsAt).getTime() -
          new Date(executionWindow.startsAt).getTime()
        ) / 60000;

      if(duration > policy.maximumDurationMinutes){
        issues.push("Execution window exceeds approved duration.");
      }
    }

    return {
      valid:
        issues.length===0,
      issues
    };
  }

  global.INFINICUS.ABA.actionBoundaryValidator =
    Object.freeze({
      includesOrOpen,
      validateParameterRule,
      validate
    });
})(window);
