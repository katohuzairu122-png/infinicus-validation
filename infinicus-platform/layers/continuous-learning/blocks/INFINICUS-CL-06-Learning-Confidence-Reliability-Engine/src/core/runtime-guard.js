(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;

  if(!CL?.runtime){
    throw new Error("CL-01 must be loaded before CL-06.");
  }

  if(!CL?.applicabilityScopeContextEngine){
    throw new Error("CL-05 must be loaded before CL-06.");
  }
})(window);
