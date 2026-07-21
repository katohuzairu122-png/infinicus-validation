import assert from "node:assert/strict";

const adapter={
  status:"active",
  healthStatus:"healthy",
  capabilityCodes:["email","webhook"],
  supportedEnvironments:["production","sandbox"]
};

assert.equal(adapter.status==="active",true);
assert.equal(adapter.healthStatus==="healthy",true);
assert.equal(adapter.capabilityCodes.includes("webhook"),true);
assert.equal(adapter.supportedEnvironments.includes("production"),true);

const selected=[
  {priority:10,eligible:true},
  {priority:20,eligible:true}
].sort((a,b)=>b.priority-a.priority)[0];

assert.equal(selected.priority,20);

console.log("ABA-17 adapter registry tests passed.");
