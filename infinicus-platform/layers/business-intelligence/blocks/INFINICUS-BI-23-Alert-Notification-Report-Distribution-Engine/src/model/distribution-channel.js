(function(global){
  "use strict";

  function create(input={}){
    const runtime=global.INFINICUS.BI.runtime;

    if(!input.name || !input.code || !input.channelType){
      return runtime.failure(
        "BI_DISTRIBUTION_CHANNEL_INVALID",
        "Channel name, code, and type are required."
      );
    }

    return runtime.success({
      distributionChannelId:
        input.distributionChannelId ||
        runtime.createId("bi_distribution_channel"),
      name:String(input.name),
      code:String(input.code),
      channelType:String(input.channelType),
      endpointReference:input.endpointReference || null,
      credentialReference:input.credentialReference || null,
      supportedFormats:runtime.clone(input.supportedFormats || ["json"]),
      status:String(input.status || "active"),
      healthStatus:String(input.healthStatus || "unknown"),
      createdAt:new Date().toISOString()
    });
  }

  global.INFINICUS.BI.distributionChannelModel=Object.freeze({create});
})(window);
