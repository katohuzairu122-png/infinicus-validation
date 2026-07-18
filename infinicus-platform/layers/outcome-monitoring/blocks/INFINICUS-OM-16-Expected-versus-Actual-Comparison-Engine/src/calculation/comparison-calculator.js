(function(global){
  "use strict";

  function calculate({
    expected,
    actual,
    direction,
    minimumAcceptableValue,
    maximumAcceptableValue
  }={}){
    const e=Number(expected);
    const a=Number(actual);

    if(!Number.isFinite(e) || !Number.isFinite(a)){
      return {
        valid:false,
        issues:["Expected and actual values must be finite numbers."]
      };
    }

    const absoluteGap=a-e;
    const percentageGap=e===0 ? null : (absoluteGap/Math.abs(e))*100;

    let achievementRatio=0;
    let achieved=false;
    let withinAcceptableRange=false;

    switch(direction){
      case "decrease":
        achievementRatio=a===0 ? 1 : e/a;
        achieved=a<=e;
        break;

      case "maintain":
        achievementRatio=
          Math.max(0,1-Math.abs(a-e)/(Math.abs(e)||1));
        achieved=a===e;
        break;

      case "range":{
        const min=
          minimumAcceptableValue==null
            ? e
            : Number(minimumAcceptableValue);
        const max=
          maximumAcceptableValue==null
            ? e
            : Number(maximumAcceptableValue);

        withinAcceptableRange=a>=min && a<=max;
        achieved=withinAcceptableRange;
        achievementRatio=withinAcceptableRange ? 1 : 0;
        break;
      }

      case "increase":
      default:
        achievementRatio=e===0 ? (a>=e ? 1 : 0) : a/e;
        achieved=a>=e;
        break;
    }

    return {
      valid:true,
      expectedValue:e,
      actualValue:a,
      absoluteGap:Number(absoluteGap.toFixed(6)),
      percentageGap:
        percentageGap==null
          ? null
          : Number(percentageGap.toFixed(2)),
      achievementRatio:Number(achievementRatio.toFixed(6)),
      achieved,
      withinAcceptableRange,
      issues:[]
    };
  }

  global.INFINICUS.OM.expectedActualComparisonCalculator=
    Object.freeze({calculate});
})(window);
