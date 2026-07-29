import assert from "node:assert/strict";

const onHand = 100;
const committed = 20;
const available = onHand - committed;
const demandPerDay = 10;

assert.equal(available, 80);
assert.equal(onHand / demandPerDay, 10);
assert.equal(available / onHand * 100, 80);

const products = [
  { productId: "p1", reorderPoint: 30 }
];
const states = [
  { productId: "p1", available: 20 }
];

const reorder = states.filter(state =>
  state.available <= products.find(p => p.productId === state.productId).reorderPoint
);

assert.equal(reorder.length, 1);

console.log("DT-12 inventory supply tests passed.");
