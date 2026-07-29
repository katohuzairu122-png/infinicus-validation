(function(global){
  "use strict";
  const CL=global.INFINICUS?.CL;

  if(!CL?.runtime){
    throw new Error("CL-01 must be loaded before CL-05.");
  }

  if(!CL?.lessonClassificationTaxonomyEngine){
    throw new Error("CL-04 must be loaded before CL-05.");
  }
})(window);
