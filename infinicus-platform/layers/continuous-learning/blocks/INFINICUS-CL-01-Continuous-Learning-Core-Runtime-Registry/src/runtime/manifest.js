(function(global){
  "use strict";

  const runtime=global.INFINICUS.CL.runtime;

  const manifest=runtime.freeze({
    block:"CL-01",
    name:"Continuous Learning Core Runtime and Registry",
    version:"1.0.0",
    namespace:"window.INFINICUS.CL",
    publicAPI:"window.INFINICUS.CL.runtime",
    inputBoundary:"OM-24",
    nextBlock:"CL-02",
    responsibilities:[
      "service registry",
      "route registry",
      "event bus",
      "policy registry",
      "learning-state registry",
      "diagnostics"
    ]
  });

  global.INFINICUS.CL.manifest=manifest;

  runtime.registerRoute(
    "cl.runtime.manifest",
    ()=>runtime.success(manifest),
    {block:"CL-01"}
  );
})(window);
