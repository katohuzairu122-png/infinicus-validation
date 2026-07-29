(function(global){
  "use strict";

  const services=new Map();

  function register(name,service,metadata={}){
    if(!name || !service){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_SERVICE_INVALID",
        "Service name and implementation are required."
      );
    }

    if(services.has(name)){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_SERVICE_DUPLICATE",
        `Service is already registered: ${name}`
      );
    }

    services.set(name,{
      name,
      service,
      metadata:structuredClone(metadata),
      registeredAt:new Date().toISOString()
    });

    return global.INFINICUS.OM.resultEnvelope.success({
      name,
      metadata
    });
  }

  function get(name){
    const record=services.get(name);

    return record
      ? global.INFINICUS.OM.resultEnvelope.success(record.service)
      : global.INFINICUS.OM.resultEnvelope.failure(
          "OM_SERVICE_NOT_FOUND",
          `Service was not found: ${name}`
        );
  }

  function list(){
    return global.INFINICUS.OM.resultEnvelope.success(
      [...services.values()].map(item=>({
        name:item.name,
        metadata:structuredClone(item.metadata),
        registeredAt:item.registeredAt
      }))
    );
  }

  global.INFINICUS.OM.serviceRegistry=
    Object.freeze({register,get,list});
})(window);
