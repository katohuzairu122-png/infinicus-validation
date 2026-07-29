(function(global){
  "use strict";

  function success(data=null,meta={}){
    return Object.freeze({
      ok:true,
      data,
      error:null,
      meta:Object.freeze({
        timestamp:new Date().toISOString(),
        ...meta
      })
    });
  }

  function failure(code,message,details=null,meta={}){
    return Object.freeze({
      ok:false,
      data:null,
      error:Object.freeze({
        code:String(code || "OM_UNKNOWN_ERROR"),
        message:String(message || "Outcome Monitoring operation failed."),
        details
      }),
      meta:Object.freeze({
        timestamp:new Date().toISOString(),
        ...meta
      })
    });
  }

  global.INFINICUS=global.INFINICUS || {};
  global.INFINICUS.OM=global.INFINICUS.OM || {};
  global.INFINICUS.OM.resultEnvelope=
    Object.freeze({success,failure});
})(window);
