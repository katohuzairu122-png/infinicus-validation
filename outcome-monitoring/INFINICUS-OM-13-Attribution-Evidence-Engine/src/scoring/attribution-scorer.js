(function(global){
  "use strict";

  function bounded(value){
    return Math.max(0,Math.min(1,Number(value || 0)));
  }

  function score({
    evidence,
    policy
  }={}){
    const weights=policy.weights;
    const components={
      timing:bounded(evidence.timingAlignment),
      scope:bounded(evidence.scopeAlignment),
      exposure:bounded(evidence.exposureEvidence),
      mechanism:bounded(evidence.mechanismEvidence),
      counterfactual:bounded(evidence.counterfactualEvidence),
      alternativeExplanations:
        1-bounded(evidence.alternativeExplanationStrength)
    };

    const totalWeight=Object.values(weights).reduce(
      (sum,value)=>sum+Number(value || 0),
      0
    ) || 1;

    const attributionScore=
      Object.entries(components).reduce(
        (sum,[key,value])=>
          sum+value*Number(weights[key] || 0),
        0
      ) / totalWeight;

    const missing=[];

    if(!evidence.actionInstanceId){
      missing.push("action_identity");
    }

    if(policy.requireCounterfactual && !evidence.counterfactualReference){
      missing.push("counterfactual");
    }

    let classification="insufficient";

    if(
      !missing.length &&
      attributionScore>=policy.minimumStrongAttribution
    ){
      classification="strong_attribution";
    }else if(
      !missing.length &&
      attributionScore>=policy.minimumSufficientEvidence
    ){
      classification="plausible_attribution";
    }else if(attributionScore>0){
      classification="correlation_only";
    }

    return {
      attributionScore:Number(attributionScore.toFixed(4)),
      components,
      missing,
      sufficient:
        !missing.length &&
        attributionScore>=policy.minimumSufficientEvidence,
      classification
    };
  }

  global.INFINICUS.OM.attributionScorer=
    Object.freeze({score});
})(window);
