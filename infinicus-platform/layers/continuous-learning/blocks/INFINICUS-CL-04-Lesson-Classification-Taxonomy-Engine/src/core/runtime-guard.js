(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;

  if(!CL?.runtime){
    throw new Error("CL-01 must be loaded before CL-04.");
  }

  if(!CL?.learningEvidenceProvenanceRegistryEngine){
    throw new Error("CL-03 must be loaded before CL-04.");
  }
})(window);
