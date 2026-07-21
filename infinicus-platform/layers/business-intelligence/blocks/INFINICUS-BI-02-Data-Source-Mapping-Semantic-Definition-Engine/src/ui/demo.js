(function (global) {
  "use strict";

  function parse(value) {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  }

  async function submit(event) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const output = document.querySelector("#output");

    try {
      const result =
        await global.INFINICUS.BI
          .dataSourceMappingEngine
          .registerSourceSystem(
            parse(String(form.get("source") || "{}"))
          );

      output.textContent =
        JSON.stringify(result, null, 2);

      output.dataset.state =
        result.ok ? "ok" : "error";
    } catch (error) {
      output.textContent = error.message;
      output.dataset.state = "error";
    }
  }

  global.addEventListener("DOMContentLoaded", () => {
    document
      .querySelector("#mappingForm")
      ?.addEventListener("submit", submit);
  });
})(window);
