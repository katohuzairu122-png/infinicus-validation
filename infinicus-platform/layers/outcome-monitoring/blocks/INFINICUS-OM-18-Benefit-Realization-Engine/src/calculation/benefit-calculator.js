(function(global){
  "use strict";

  function calculate({
    expectedBenefit,
    actualBenefit,
    actionCost,
    startedAt,
    realizedAt,
    sustainabilityScore
  }={}){
    const expected=Number(expectedBenefit);
    const actual=Number(actualBenefit);
    const cost=Number(actionCost);

    if(!Number.isFinite(expected) || !Number.isFinite(actual)){
      return {
        valid:false,
        issues:["Expected and actual benefit values must be finite numbers."]
      };
    }

    if(!Number.isFinite(cost) || cost<0){
      return {
        valid:false,
        issues:["Action cost must be a non-negative finite number."]
      };
    }

    const realizationRatio=
      expected===0
        ? (actual>0 ? 1 : 0)
        : actual/expected;

    const netBenefit=actual-cost;
    const benefitCostRatio=
      cost===0
        ? (actual>0 ? null : 0)
        : actual/cost;

    const timeToBenefitDays=
      startedAt && realizedAt
        ? Math.max(
            0,
            (
              new Date(realizedAt).getTime() -
              new Date(startedAt).getTime()
            ) / 86400000
          )
        : null;

    return {
      valid:true,
      expectedBenefit:expected,
      actualBenefit:actual,
      actionCost:cost,
      realizationRatio:Number(realizationRatio.toFixed(6)),
      realizationPercent:Number((realizationRatio*100).toFixed(2)),
      netBenefit:Number(netBenefit.toFixed(6)),
      benefitCostRatio:
        benefitCostRatio==null
          ? null
          : Number(benefitCostRatio.toFixed(6)),
      timeToBenefitDays:
        timeToBenefitDays==null
          ? null
          : Number(timeToBenefitDays.toFixed(2)),
      sustainabilityScore:
        Math.max(0,Math.min(1,Number(sustainabilityScore ?? 0))),
      issues:[]
    };
  }

  global.INFINICUS.OM.benefitRealizationCalculator=
    Object.freeze({calculate});
})(window);
