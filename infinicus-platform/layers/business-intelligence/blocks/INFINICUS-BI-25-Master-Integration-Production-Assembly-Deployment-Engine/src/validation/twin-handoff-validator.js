(function(global){
  "use strict";

  function validate(result={}){
    const issues=[];

    if(!result.businessStatePackage){
      issues.push("Business state package is missing.");
    }

    if(!result.twinPublication){
      issues.push("Business Digital Twin publication is missing.");
    }

    if(!result.twinPublicationReceipt){
      issues.push("Business Digital Twin publication receipt is missing.");
    }

    if(!result.biIntegrationHandoff){
      issues.push("BI integration handoff is missing.");
    }

    if(
      result.businessStatePackage &&
      !result.businessStatePackage.businessId
    ){
      issues.push("Published business state lacks business identity.");
    }

    return {valid:issues.length===0,issues};
  }

  global.INFINICUS.BI.twinHandoffValidator=Object.freeze({validate});
})(window);
