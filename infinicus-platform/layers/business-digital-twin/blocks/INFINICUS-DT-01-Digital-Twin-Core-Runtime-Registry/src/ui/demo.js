(function (global) {
  "use strict";

  function render() {
    const output = document.querySelector("#output");

    output.textContent = JSON.stringify(
      global.INFINICUS.DT.runtime.diagnostics(),
      null,
      2
    );
  }

  global.addEventListener("DOMContentLoaded", render);
})(window);
