(function(global){
  "use strict";

  const subscribers=new Map();
  const history=[];

  function subscribe(eventName,handler){
    if(!eventName || typeof handler!=="function"){
      return global.INFINICUS.OM.resultEnvelope.failure(
        "OM_EVENT_SUBSCRIPTION_INVALID",
        "Event name and handler are required."
      );
    }

    const handlers=subscribers.get(eventName) || new Set();
    handlers.add(handler);
    subscribers.set(eventName,handlers);

    return global.INFINICUS.OM.resultEnvelope.success({
      eventName,
      unsubscribe:()=>handlers.delete(handler)
    });
  }

  async function emit(eventName,payload={}){
    const event={
      eventId:global.INFINICUS.OM.idFactory.createId("om_event"),
      eventName,
      payload:structuredClone(payload),
      occurredAt:new Date().toISOString()
    };

    history.push(event);

    const handlers=[
      ...(subscribers.get(eventName) || []),
      ...(subscribers.get("*") || [])
    ];

    const errors=[];

    for(const handler of handlers){
      try{
        await handler(structuredClone(event));
      }catch(error){
        errors.push(error?.message || "Event handler failed.");
      }
    }

    return global.INFINICUS.OM.resultEnvelope.success({
      event,
      handlerCount:handlers.length,
      errors
    });
  }

  function listHistory(){
    return global.INFINICUS.OM.resultEnvelope.success(
      history.map(structuredClone)
    );
  }

  global.INFINICUS.OM.eventBus=
    Object.freeze({subscribe,emit,listHistory});
})(window);
