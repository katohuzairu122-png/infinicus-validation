import{CONTEXT_SOURCE_TYPES}from"./constants.js";import{success,failure}from"./result-envelope.js";
export function createProviderRegistry(){const providers=new Map();return Object.freeze({
 register(descriptor,provider){
  if(!descriptor?.providerId||!CONTEXT_SOURCE_TYPES.includes(descriptor.sourceType)||typeof provider?.acquire!=="function")return failure("ADI_CONTEXT_PROVIDER_INVALID","Provider ID, supported source type and acquire function are required.");
  if(providers.has(descriptor.providerId))return failure("ADI_CONTEXT_PROVIDER_DUPLICATE",`Provider already exists: ${descriptor.providerId}`);
  providers.set(descriptor.providerId,Object.freeze({descriptor:Object.freeze({...descriptor}),provider,registeredAt:new Date().toISOString()}));
  return success({providerId:descriptor.providerId,sourceType:descriptor.sourceType});
 },
 get(id){const item=providers.get(id);return item?success(item):failure("ADI_CONTEXT_PROVIDER_NOT_FOUND",`Provider was not found: ${id}`)},
 list(){return success([...providers.values()].map(item=>({descriptor:{...item.descriptor},registeredAt:item.registeredAt})))},
 entries(){return [...providers.values()]}
});}
