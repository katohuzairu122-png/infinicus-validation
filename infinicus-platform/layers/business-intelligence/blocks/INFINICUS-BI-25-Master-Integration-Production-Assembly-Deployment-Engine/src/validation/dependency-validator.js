(function(global){
  "use strict";

  function validate(manifest,namespace){
    const checks=manifest.map(block=>({
      ...block,
      available:Boolean(namespace?.[block.namespaceKey])
    }));

    const missing=checks.filter(item=>item.required && !item.available);
    const ordered=checks.every((item,index)=>item.sequence===index+1);

    return {
      ready:missing.length===0 && ordered,
      ordered,
      checks,
      missing
    };
  }

  global.INFINICUS.BI.masterDependencyValidator=Object.freeze({validate});
})(window);
