(function (global) {
  "use strict";

  async function render() {
    const output = document.querySelector("#output");
    const diagnostics =
      global.INFINICUS.BI.runtime.diagnostics();

    output.textContent = JSON.stringify({
      diagnostics,
      manifest: global.INFINICUS.BI.layerManifest
    }, null, 2);
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
