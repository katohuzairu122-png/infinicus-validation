(function(global){
  "use strict";

  function percentVariance(current,reference){
    const c=Number(current);
    const r=Number(reference);

    if(!Number.isFinite(c) || !Number.isFinite(r)){
      return null;
    }

    if(r===0){
      return c===0 ? 0 : null;
    }

    return ((c-r)/Math.abs(r))*100;
  }

  function detect({progress,target,policy}={}){
    const issues=[];
    const current=Number(progress.currentValue);
    const baseline=Number(progress.baselineValue);
    const targetValue=Number(progress.targetValue);

    if(
      !Number.isFinite(current) ||
      !Number.isFinite(baseline) ||
      !Number.isFinite(targetValue)
    ){
      return {
        valid:false,
        issues:["Current, baseline, and target values must be finite."]
      };
    }

    const baselineVariance=current-baseline;
    const targetVariance=current-targetValue;
    const baselineVariancePercent=
      percentVariance(current,baseline);
    const targetVariancePercent=
      percentVariance(current,targetValue);

    const minimum=
      target.minimumAcceptableValue==null
        ? null
        : Number(target.minimumAcceptableValue);

    const maximum=
      target.maximumAcceptableValue==null
        ? null
        : Number(target.maximumAcceptableValue);

    const tolerance=
      target.tolerance==null
        ? 0
        : Math.abs(Number(target.tolerance));

    const rangeBreach=
      (
        minimum!==null &&
        Number.isFinite(minimum) &&
        current<minimum
      ) ||
      (
        maximum!==null &&
        Number.isFinite(maximum) &&
        current>maximum
      );

    const toleranceBreach=
      Math.abs(targetVariance)>tolerance &&
      tolerance>0;

    const absoluteTargetVariancePercent=
      targetVariancePercent==null
        ? null
        : Math.abs(targetVariancePercent);

    let severity="normal";

    if(
      progress.progressRatio <
      policy.progressCriticalBelow ||
      (
        absoluteTargetVariancePercent!==null &&
        absoluteTargetVariancePercent>=
          policy.criticalVariancePercent
      )
    ){
      severity="critical";
    }else if(
      progress.progressRatio <
      policy.progressWarningBelow ||
      rangeBreach ||
      toleranceBreach ||
      (
        absoluteTargetVariancePercent!==null &&
        absoluteTargetVariancePercent>=
          policy.warningVariancePercent
      )
    ){
      severity="warning";
    }else if(!progress.achieved){
      severity="acceptable_deviation";
    }

    return {
      valid:true,
      issues,
      baselineVariance:Number(baselineVariance.toFixed(6)),
      targetVariance:Number(targetVariance.toFixed(6)),
      baselineVariancePercent:
        baselineVariancePercent==null
          ? null
          : Number(baselineVariancePercent.toFixed(2)),
      targetVariancePercent:
        targetVariancePercent==null
          ? null
          : Number(targetVariancePercent.toFixed(2)),
      rangeBreach,
      toleranceBreach,
      severity,
      breached:
        ["warning","critical"].includes(severity)
    };
  }

  global.INFINICUS.OM.varianceDetector=
    Object.freeze({percentVariance,detect});
})(window);
