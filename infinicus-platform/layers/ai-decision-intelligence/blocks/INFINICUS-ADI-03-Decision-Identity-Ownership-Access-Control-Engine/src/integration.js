import { createAccessControlEngine } from "./access-engine.js";
import { failure } from "./result-envelope.js";

export function attachToADIRuntime(runtime, options = {}) {
  const required=["registerService","registerRoute","emit","createId","success"];
  if (!runtime || required.some(name=>typeof runtime[name]!=="function")) return failure("ADI_RUNTIME_INCOMPATIBLE","A compatible ADI-01 runtime is required.");
  const engine=createAccessControlEngine({...options,emit:runtime.emit,createId:runtime.createId});
  const service=runtime.registerService("adi.access_control",engine,{blockId:"ADI-03",version:"1.0.0"});
  if(!service.ok)return service;
  const routes=[
    ["adi.access.authorize",(request,context)=>engine.authorize(request,context)],
    ["adi.decision_case.secure",(request,context)=>engine.secureDecisionCase(request.decisionCase??request,context)]
  ];
  for(const [name,handler] of routes){const result=runtime.registerRoute(name,handler,{blockId:"ADI-03"});if(!result.ok)return result;}
  void runtime.emit("adi.block.ready",{blockId:"ADI-03",version:"1.0.0"});
  return runtime.success({blockId:"ADI-03",service:"adi.access_control",routes:routes.map(([name])=>name)});
}
