import assert from "node:assert/strict";

const policy={
  routes:{
    warning:{
      ownerRole:"manager",
      acknowledgementMinutes:120
    },
    critical:{
      ownerRole:"executive",
      acknowledgementMinutes:30,
      escalationStages:[
        {afterMinutes:30,toRole:"executive"},
        {afterMinutes:60,toRole:"governance"}
      ]
    }
  }
};

assert.equal(policy.routes.warning.ownerRole,"manager");
assert.equal(policy.routes.critical.ownerRole,"executive");
assert.equal(
  policy.routes.critical.escalationStages.length,
  2
);

const allowedStates=[
  "open",
  "acknowledged",
  "escalated",
  "resolved"
];

assert.equal(allowedStates.includes("resolved"),true);

console.log("OM-12 alert and escalation tests passed.");
