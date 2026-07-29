(function(global){
  "use strict";

  const routes=new Map();

  function register(name,handler,metadata={}){
    if(!name || typeof handler!=="function"){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_ROUTE_INVALID",
        "Route name and handler function are required."
      );
    }

    if(routes.has(name)){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_ROUTE_DUPLICATE",
        `Route is already registered: ${name}`
      );
    }

    routes.set(name,{
      name,
      handler,
      metadata:structuredClone(metadata),
      registeredAt:new Date().toISOString()
    });

    return global.INFINICUS.OM.resultEnvelope.success({
      name,
      metadata
    });
  }

  async function dispatch(name,payload={}){
    const route=routes.get(name);

    if(!route){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_ROUTE_NOT_FOUND",
        `Route was not found: ${name}`
      );
    }

    try{
      return await route.handler(payload);
    }catch(error){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_ROUTE_EXECUTION_FAILED",
        error?.message || `Route execution failed: ${name}`
      );
    }
  }

  function list(){
    return global.INFINICUS.OM.resultEnvelope.success(
      [...routes.values()].map(item=>({
        name:item.name,
        metadata:structuredClone(item.metadata),
        registeredAt:item.registeredAt
      }))
    );
  }

  global.INFINICUS.OM.routeRegistry=
    Object.freeze({register,dispatch,list});
})(window);
