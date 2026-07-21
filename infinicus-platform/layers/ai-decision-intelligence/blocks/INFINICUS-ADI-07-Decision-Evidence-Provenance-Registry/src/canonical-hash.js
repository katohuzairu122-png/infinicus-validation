function canonical(value){
 if(value===null||typeof value!=="object")return JSON.stringify(value);
 if(Array.isArray(value))return`[${value.map(canonical).join(",")}]`;
 return`{${Object.keys(value).sort().map(key=>`${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}
export function canonicalize(value){return canonical(value)}
export async function sha256(value){
 if(!globalThis.crypto?.subtle)throw new Error("Web Crypto SHA-256 is unavailable.");
 const bytes=new TextEncoder().encode(canonical(value));const digest=await globalThis.crypto.subtle.digest("SHA-256",bytes);
 return[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
}
