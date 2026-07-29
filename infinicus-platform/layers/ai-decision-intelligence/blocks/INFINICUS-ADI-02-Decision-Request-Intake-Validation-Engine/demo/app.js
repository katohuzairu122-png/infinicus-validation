import { createDecisionRequestIntakeEngine } from "../src/index.js";
const engine = createDecisionRequestIntakeEngine({
  // Demo-only authorization. Production must inject its real identity policy adapter.
  authorize: async () => ({ allowed:true })
});
const deadline = document.querySelector('[name="decisionDeadline"]');
deadline.value = new Date(Date.now() + 7 * 86400000).toISOString().slice(0,16);
document.querySelector("#form").addEventListener("submit", async event => {
  event.preventDefault();
  const input = Object.fromEntries(new FormData(event.currentTarget));
  Object.assign(input, { requestSource:"human", decisionType:"problem", urgency:"high", scope:"business", idempotencyKey:"demo_request_1" });
  document.querySelector("#result").textContent = JSON.stringify(await engine.submit(input), null, 2);
});
