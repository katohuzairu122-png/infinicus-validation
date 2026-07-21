(function(global){
  "use strict";

  function validate(manifest,abaNamespace){
    const checks = manifest.map(block=>{
      const available = Boolean(abaNamespace?.[block.namespaceKey]);

      return {
        blockId:block.blockId,
        name:block.name,
        namespaceKey:block.namespaceKey,
        available,
        sequence:block.sequence,
        required:block.required
      };
    });

    const missing = checks.filter(item=>item.required && !item.available);

    const ordered = checks.every(
      (item,index)=>item.sequence===index+1
    );

    return {
      ready:missing.length===0 && ordered,
      ordered,
      checks,
      missing
    };
  }

  global.INFINICUS.ABA.masterDependencyValidator =
    Object.freeze({validate});
})(window);
