(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;

  if(!CL?.runtime){
    throw new Error("CL-01 must be loaded before CL-03.");
  }

  if(!CL?.learningPackageIntakeEngine){
    throw new Error("CL-02 must be loaded before CL-03.");
  }
})(window);
