(function(global){
  "use strict";

  function normalizeValue({
    value,
    sourceUnit,
    targetUnit,
    valueType,
    converter,
    policy
  }){
    const issues=[];
    let normalized=value;

    if(valueType==="number" && typeof normalized!=="number"){
      if(policy.allowNumericCoercion && normalized!==null && normalized!==""){
        normalized=Number(normalized);
      }
    }

    if(valueType==="number" && !Number.isFinite(normalized)){
      issues.push("Value cannot be normalized to a finite number.");
    }

    if(sourceUnit && targetUnit && sourceUnit!==targetUnit){
      if(typeof converter!=="function"){
        if(policy.rejectUnknownUnits){
          issues.push(`No unit converter registered: ${sourceUnit} -> ${targetUnit}`);
        }
      }else{
        normalized=converter(normalized);
      }
    }

    if(
      typeof normalized==="number" &&
      Number.isFinite(normalized)
    ){
      normalized=Number(
        normalized.toFixed(policy.preservePrecisionDigits)
      );
    }

    return {
      valid:issues.length===0,
      normalized,
      issues
    };
  }

  global.INFINICUS.OM.metricNormalizationValidator=
    Object.freeze({normalizeValue});
})(window);
