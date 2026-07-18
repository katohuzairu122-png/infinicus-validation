(function(global){
  "use strict";

  global.INFINICUS=global.INFINICUS || {};
  global.INFINICUS.CL=global.INFINICUS.CL || {};

  const services=new Map();
  const routes=new Map();
  const policies=new Map();
  const learningStates=new Map();
  const listeners=new Map();
  const runtimeEvents=[];

  function clone(value){
    if(value===undefined) return undefined;
    return structuredClone(value);
  }

  function freeze(value){
    if(value && typeof value==="object"){
      Object.freeze(value);
      for(const key of Object.keys(value)){
        const child=value[key];
        if(
          child &&
          typeof child==="object" &&
          !Object.isFrozen(child)
        ){
          freeze(child);
        }
      }
    }
    return value;
  }

  function createId(prefix="cl"){
    const random=
      global.crypto?.randomUUID?.() ||
      `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    return `${prefix}_${random}`;
  }

  function success(data,meta={}){
    return {
      ok:true,
      data:clone(data),
      meta:{
        timestamp:new Date().toISOString(),
        ...clone(meta)
      }
    };
  }

  function failure(code,message,details={}){
    return {
      ok:false,
      error:{
        code:String(code || "CL_UNKNOWN_ERROR"),
        message:String(message || "Unknown Continuous Learning error."),
        details:clone(details)
      },
      meta:{
        timestamp:new Date().toISOString()
      }
    };
  }

  async function emit(eventName,payload={}){
    const event={
      eventId:createId("cl_event"),
      eventName:String(eventName),
      payload:clone(payload),
      emittedAt:new Date().toISOString()
    };

    runtimeEvents.push(event);

    const handlers=listeners.get(eventName) || [];

    for(const handler of handlers){
      await handler(clone(event));
    }

    return success(event);
  }

  function on(eventName,handler){
    if(typeof handler!=="function"){
      return failure(
        "CL_EVENT_HANDLER_INVALID",
        "Event handler must be a function."
      );
    }

    const handlers=listeners.get(eventName) || [];
    handlers.push(handler);
    listeners.set(eventName,handlers);

    return success({
      eventName,
      handlerCount:handlers.length
    });
  }

  function registerService(name,service,metadata={}){
    if(!name || !service){
      return failure(
        "CL_SERVICE_INVALID",
        "Service name and implementation are required."
      );
    }

    if(services.has(name)){
      return failure(
        "CL_SERVICE_DUPLICATE",
        `Service is already registered: ${name}`
      );
    }

    const record=freeze({
      name:String(name),
      service,
      metadata:clone(metadata),
      registeredAt:new Date().toISOString()
    });

    services.set(name,record);

    emit("cl.runtime.service_registered",{
      name,
      metadata
    });

    return success({
      name,
      metadata:record.metadata
    });
  }

  function getService(name){
    const record=services.get(name);

    return record
      ? record.service
      : null;
  }

  function registerRoute(name,handler,metadata={}){
    if(!name || typeof handler!=="function"){
      return failure(
        "CL_ROUTE_INVALID",
        "Route name and handler function are required."
      );
    }

    if(routes.has(name)){
      return failure(
        "CL_ROUTE_DUPLICATE",
        `Route is already registered: ${name}`
      );
    }

    routes.set(name,freeze({
      name:String(name),
      handler,
      metadata:clone(metadata),
      registeredAt:new Date().toISOString()
    }));

    emit("cl.runtime.route_registered",{
      name,
      metadata
    });

    return success({name});
  }

  function getRoute(name){
    return routes.get(name)?.handler || null;
  }

  async function invoke(name,input={}){
    const route=routes.get(name);

    if(!route){
      return failure(
        "CL_ROUTE_NOT_FOUND",
        `Route was not found: ${name}`
      );
    }

    try{
      return await route.handler(clone(input));
    }catch(error){
      return failure(
        "CL_ROUTE_EXECUTION_FAILED",
        error?.message || "Route execution failed.",
        {name}
      );
    }
  }

  function registerPolicy({
    policyId,
    policyType,
    policy
  }={}){
    if(!policyId || !policyType || !policy){
      return failure(
        "CL_POLICY_INVALID",
        "Policy ID, type, and policy are required."
      );
    }

    const key=`${policyType}:${policyId}`;

    if(policies.has(key)){
      return failure(
        "CL_POLICY_DUPLICATE",
        `Policy is already registered: ${key}`
      );
    }

    const record=freeze({
      policyId:String(policyId),
      policyType:String(policyType),
      policy:clone(policy),
      registeredAt:new Date().toISOString()
    });

    policies.set(key,record);

    return success(record);
  }

  function getPolicy(policyType,policyId){
    const record=policies.get(`${policyType}:${policyId}`);
    return record ? clone(record) : null;
  }

  function registerLearningState(input={}){
    const learningStateId=
      input.learningStateId ||
      createId("cl_learning_state");

    const record=freeze({
      learningStateId,
      learningPackageId:input.learningPackageId || null,
      state:String(input.state || "received"),
      confidence:
        input.confidence==null
          ? null
          : Number(input.confidence),
      reliability:
        input.reliability==null
          ? null
          : Number(input.reliability),
      correlationId:input.correlationId || null,
      updatedAt:new Date().toISOString()
    });

    learningStates.set(learningStateId,record);

    emit("cl.runtime.learning_state_registered",record);

    return success(record);
  }

  function getLearningState(learningStateId){
    const record=learningStates.get(learningStateId);

    return record
      ? success(record)
      : failure(
          "CL_LEARNING_STATE_NOT_FOUND",
          "Learning state was not found.",
          {learningStateId}
        );
  }

  function diagnose(){
    return success({
      layer:"Continuous Learning",
      version:"1.0.0",
      namespace:"window.INFINICUS.CL",
      serviceCount:services.size,
      routeCount:routes.size,
      policyCount:policies.size,
      learningStateCount:learningStates.size,
      eventCount:runtimeEvents.length,
      status:"healthy"
    });
  }

  const runtime=Object.freeze({
    version:"1.0.0",
    layer:"Continuous Learning",
    createId,
    clone,
    freeze,
    success,
    failure,
    emit,
    on,
    registerService,
    getService,
    registerRoute,
    getRoute,
    invoke,
    registerPolicy,
    getPolicy,
    registerLearningState,
    getLearningState,
    diagnose,
    services,
    routes,
    policies,
    learningStates
  });

  global.INFINICUS.CL.runtime=runtime;

  runtime.registerService(
    "cl.runtime",
    runtime,
    {block:"CL-01"}
  );

  runtime.registerRoute(
    "cl.runtime.diagnose",
    diagnose,
    {block:"CL-01"}
  );
})(window);
