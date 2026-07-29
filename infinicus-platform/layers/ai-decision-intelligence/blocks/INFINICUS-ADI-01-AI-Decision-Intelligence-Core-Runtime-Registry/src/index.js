export { createADIRuntime } from "./runtime.js";
export { success, failure } from "./result-envelope.js";
export { createId } from "./id-factory.js";
export { createRegistry } from "./registry.js";
export { lifecycle, DECISION_STATES } from "./lifecycle.js";
export { ADI_BLOCK_MANIFEST } from "./block-manifest.js";

import { createADIRuntime } from "./runtime.js";

export function installGlobal(target = globalThis) {
  target.INFINICUS ??= {};
  target.INFINICUS.ADI ??= {};
  if (target.INFINICUS.ADI.runtime) return target.INFINICUS.ADI.runtime;
  const runtime = createADIRuntime();
  target.INFINICUS.ADI.runtime = runtime;
  return runtime;
}
