(function(global){
  "use strict";

  function randomPart(){
    if(global.crypto?.randomUUID){
      return global.crypto.randomUUID().replaceAll("-","");
    }

    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2)
    );
  }

  function createId(prefix="om"){
    return `${prefix}_${randomPart()}`;
  }

  global.INFINICUS.OM.idFactory=
    Object.freeze({createId});
})(window);
