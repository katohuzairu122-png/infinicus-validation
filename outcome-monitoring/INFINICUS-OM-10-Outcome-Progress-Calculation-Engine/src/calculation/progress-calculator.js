(function(global){
  "use strict";

  function numeric(value){
    const number=Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function calculate({
    baselineValue,
    currentValue,
    targetValue,
    minimumAcceptableValue,
    maximumAcceptableValue,
    direction,
    tolerance=0
  }={}){
    const baseline=numeric(baselineValue);
    const current=numeric(currentValue);
    const target=numeric(targetValue);
    const minimum=numeric(minimumAcceptableValue);
    const maximum=numeric(maximumAcceptableValue);
    const tol=Math.max(0,Number(tolerance || 0));

    if(baseline===null || current===null || target===null){
      return {
        valid:false,
        issues:["Baseline, current, and target values must be finite numbers."]
      };
    }

    let progressRatio=0;
    let targetGap=0;
    let achieved=false;
    let withinAcceptableRange=false;

    switch(direction){
      case "decrease":{
        const requiredChange=baseline-target;
        const actualChange=baseline-current;
        progressRatio=
          requiredChange===0
            ? (current<=target+tol ? 1 : 0)
            : actualChange/requiredChange;
        targetGap=current-target;
        achieved=current<=target+tol;
        break;
      }

      case "maintain":{
        const distance=Math.abs(current-target);
        progressRatio=distance<=tol ? 1 : Math.max(0,1-distance/(Math.abs(target)||1));
        targetGap=current-target;
        achieved=distance<=tol;
        break;
      }

      case "range":{
        const low=minimum ?? target-tol;
        const high=maximum ?? target+tol;
        withinAcceptableRange=current>=low && current<=high;
        achieved=withinAcceptableRange;

        if(withinAcceptableRange){
          progressRatio=1;
          targetGap=0;
        }else if(current<low){
          const requiredChange=low-baseline;
          const actualChange=current-baseline;
          progressRatio=
            requiredChange===0 ? 0 : actualChange/requiredChange;
          targetGap=current-low;
        }else{
          const requiredChange=baseline-high;
          const actualChange=baseline-current;
          progressRatio=
            requiredChange===0 ? 0 : actualChange/requiredChange;
          targetGap=current-high;
        }

        break;
      }

      case "increase":
      default:{
        const requiredChange=target-baseline;
        const actualChange=current-baseline;
        progressRatio=
          requiredChange===0
            ? (current>=target-tol ? 1 : 0)
            : actualChange/requiredChange;
        targetGap=target-current;
        achieved=current>=target-tol;
        break;
      }
    }

    return {
      valid:true,
      baselineValue:baseline,
      currentValue:current,
      targetValue:target,
      progressRatio:Number(progressRatio.toFixed(6)),
      progressPercent:Number((progressRatio*100).toFixed(2)),
      targetGap:Number(targetGap.toFixed(6)),
      achieved,
      withinAcceptableRange,
      direction,
      issues:[]
    };
  }

  global.INFINICUS.OM.outcomeProgressCalculator=
    Object.freeze({calculate});
})(window);
