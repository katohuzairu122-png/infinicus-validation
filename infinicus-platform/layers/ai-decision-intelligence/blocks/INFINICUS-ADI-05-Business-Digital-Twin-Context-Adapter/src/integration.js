import{createDigitalTwinContextAdapter}from"./twin-adapter.js";import{failure}from"./result-envelope.js";
export function attachToADIRuntime(runtime,options={}){
 const required=["registerService","registerRoute","getService","emit","success"];if(!runtime||required.some(name=>typeof runtime[name]!=="function"))return failure("ADI_RUNTIME_INCOMPATIBLE","A compatible ADI-01 runtime is required.");
 const contextService=options.contextEngine?{ok:true,data:options.contextEngine}:runtime.getService("adi.decision_context");
 if(!contextService.ok)return failure("ADI_CONTEXT_ENGINE_REQUIRED","ADI-04 must be attached before ADI-05.");
 const adapter=createDigitalTwinContextAdapter({...options,emit:runtime.emit});const service=runtime.registerService("adi.digital_twin_context_adapter",adapter,{blockId:"ADI-05",version:"1.0.0",mode:"read_only"});if(!service.ok)return service;
 const route=runtime.registerRoute("adi.digital_twin_context.acquire",(request,context)=>adapter.acquire(request,context),{blockId:"ADI-05"});if(!route.ok)return route;
 const provider=contextService.data.providers.register({providerId:"adi05.business_digital_twin",sourceType:"business_digital_twin",blockId:"ADI-05"},{acquire:async(query,context)=>{const result=await adapter.acquire(query,context);if(!result.ok)throw new Error(`${result.error.code}: ${result.error.message}`);return result.data.fragments;}});
 if(!provider.ok)return provider;void runtime.emit("adi.block.ready",{blockId:"ADI-05",version:"1.0.0"});return runtime.success({blockId:"ADI-05",service:"adi.digital_twin_context_adapter",route:"adi.digital_twin_context.acquire",providerId:"adi05.business_digital_twin"});
}
