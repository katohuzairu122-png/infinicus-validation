(function(global){
  "use strict";
  function create(input={}){
    const runtime=global.INFINICUS.ABA.runtime;
    if(!input.name || !input.resourceType){
      return runtime.failure(
        "ABA_RESOURCE_INVALID",
        "Resource name and resourceType are required."
      );
    }
    return runtime.success({
      resourceId:input.resourceId || runtime.createId("aba_resource"),
      name:String(input.name),
      resourceType:String(input.resourceType),
      poolId:input.poolId || null,
      unit:String(input.unit || "unit"),
      totalQuantity:Number(input.totalQuantity || 0),
      reservedQuantity:Number(input.reservedQuantity || 0),
      availableQuantity:
        Number(input.availableQuantity ??
          (Number(input.totalQuantity || 0)-Number(input.reservedQuantity || 0))),
      currency:input.currency || null,
      locationCode:input.locationCode || null,
      status:String(input.status || "active"),
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }
  global.INFINICUS.ABA.resourceModel=Object.freeze({create});
})(window);
