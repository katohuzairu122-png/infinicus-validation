(function(global){
  "use strict";

  const bounded=value=>
    Math.max(0,Math.min(1,Number(value || 0)));

  function score({
    attributionAssessment,
    evidence,
    policy
  }={}){
    const missing=[];

    if(policy.requireTemporalOrder && evidence.temporalOrder!==true){
      missing.push("temporal_order");
    }

    if(policy.requireCounterfactual && !evidence.counterfactualReference){
      missing.push("counterfactual");
    }

    const components={
      temporalOrder:evidence.temporalOrder === true ? 1 : 0,
      mechanism:bounded(evidence.mechanismStrength),
      doseResponse:bounded(evidence.doseResponseStrength),
      counterfactual:bounded(evidence.counterfactualStrength),
      reproducibility:bounded(evidence.reproducibilityStrength),
      attributionStrength:bounded(attributionAssessment.attributionScore)
    };

    const totalWeight=
      Object.values(policy.weights).reduce(
        (sum,value)=>sum+Number(value || 0),
        0
      ) || 1;

    const baseScore=
      Object.entries(components).reduce(
        (sum,[key,value])=>
          sum+value*Number(policy.weights[key] || 0),
        0
      ) / totalWeight;

    const confounderPenalty=
      bounded(evidence.confounderStrength) *
      policy.confounderPenaltyWeight;

    const alternativePenalty=
      bounded(evidence.alternativeExplanationStrength) *
      policy.alternativeExplanationPenaltyWeight;

    const causalScore=
      Math.max(
        0,
        Math.min(1,baseScore-confounderPenalty-alternativePenalty)
      );

    let classification="inconclusive";

    if(
      !missing.length &&
      causalScore>=policy.minimumStrongCausation
    ){
      classification="strong_causal_support";
    }else if(
      !missing.length &&
      causalScore>=policy.minimumPlausibleCausation
    ){
      classification="plausible_causal_support";
    }else if(causalScore>0){
      classification="weak_causal_support";
    }

    return {
      causalScore:Number(causalScore.toFixed(4)),
      baseScore:Number(baseScore.toFixed(4)),
      confounderPenalty:Number(confounderPenalty.toFixed(4)),
      alternativePenalty:Number(alternativePenalty.toFixed(4)),
      components,
      missing,
      classification,
      causationEstablished:
        classification==="strong_causal_support"
    };
  }

  global.INFINICUS.OM.causationScorer=
    Object.freeze({score});
})(window);
