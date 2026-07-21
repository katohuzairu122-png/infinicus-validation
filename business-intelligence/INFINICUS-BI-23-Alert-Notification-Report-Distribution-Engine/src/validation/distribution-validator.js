(function(global){
  "use strict";

  const severityRank={
    information:1,
    low:2,
    medium:3,
    high:4,
    critical:5
  };

  function validate({handoff,policy,channel,audience}){
    const issues=[];

    if(policy.status!=="active") issues.push("Distribution policy is inactive.");
    if(channel.status!=="active") issues.push("Distribution channel is inactive.");
    if(!["healthy","degraded"].includes(channel.healthStatus)){
      issues.push("Distribution channel is not healthy.");
    }
    if(audience.status!=="active") issues.push("Audience is inactive.");

    if(
      severityRank[handoff.severity || "information"] <
      severityRank[policy.minimumSeverity || "information"]
    ){
      issues.push("Report severity is below policy threshold.");
    }

    if(
      policy.allowedChannelCodes.length &&
      !policy.allowedChannelCodes.includes(channel.code)
    ){
      issues.push("Distribution channel is not allowed by policy.");
    }

    const supported=
      (handoff.exportFormats || []).some(format =>
        channel.supportedFormats.includes(format)
      );

    if((handoff.exportFormats || []).length && !supported){
      issues.push("Channel does not support a requested export format.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.BI.distributionValidator=
    Object.freeze({severityRank,validate});
})(window);
