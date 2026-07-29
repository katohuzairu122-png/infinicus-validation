(function (global) {
  "use strict";

  async function submit(event) {
    event.preventDefault();

    const output =
      document.querySelector("#output");

    output.textContent = JSON.stringify({
      message:
        "BI-03 requires a published BI-02 dataset contract before an ingestion job can be registered.",
      requiredSequence: [
        "Register BI-02 source system",
        "Register BI-02 semantic entity",
        "Register BI-02 field mappings",
        "Publish BI-02 dataset contract",
        "Register BI-03 ingestion job",
        "Execute ingestion"
      ]
    }, null, 2);
  }

  global.addEventListener(
    "DOMContentLoaded",
    () => {
      document
        .querySelector("#ingestionForm")
        ?.addEventListener("submit", submit);
    }
  );
})(window);
