import{createSimulationResultsAdapter}from"./simulation-adapter.js";import{failure}from"./result-envelope.js";
export function attachToADIRuntime(runtime,options={}){
 const required=["registerService","registerRoute","getService","emit","success"];if(!runtime||required.some(name=>typeof runtime[name]!=="function"))return failure("ADI_RUNTIME_INCOMPATIBLE","A compatible ADI-01 runtime is required.");
 const contextService=options.contextEngine?{ok:true,data:options.contextEngine}:runtime.getService("adi.decision_context");if(!contextService.ok)return failure("ADI_CONTEXT_ENGINE_REQUIRED","ADI-04 must be attached before ADI-06.");
 const adapter=createSimulationResultsAdapter({...options,emit:runtime.emit});const service=runtime.registerService("adi.simulation_results_adapter",adapter,{blockId:"ADI-06",version:"1.0.0",mode:"read_only"});if(!service.ok)return service;
 const route=runtime.registerRoute("adi.simulation_results.acquire",(request,context)=>adapter.acquire(request,context),{blockId:"ADI-06"});if(!route.ok)return route;
 const provider=contextService.data.providers.register({providerId:"adi06.simulation_results",sourceType:"simulation_results",blockId:"ADI-06"},{acquire:async(query,context)=>{const result=await adapter.acquire(query,context);if(!result.ok)throw new Error(`${result.error.code}: ${result.error.message}`);return result.data.fragments;}});if(!provider.ok)return provider;
 void runtime.emit("adi.block.ready",{blockId:"ADI-06",version:"1.0.0"});return runtime.success({blockId:"ADI-06",service:"adi.simulation_results_adapter",route:"adi.simulation_results.acquire",providerId:"adi06.simulation_results"});
}
