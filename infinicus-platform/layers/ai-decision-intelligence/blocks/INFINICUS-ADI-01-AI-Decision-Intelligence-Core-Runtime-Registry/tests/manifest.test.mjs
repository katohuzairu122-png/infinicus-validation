import test from "node:test";
import assert from "node:assert/strict";
import { ADI_BLOCK_MANIFEST } from "../src/index.js";

test("manifest contains 25 ordered unique blocks", () => {
  assert.equal(ADI_BLOCK_MANIFEST.length, 25);
  assert.equal(new Set(ADI_BLOCK_MANIFEST.map(item => item.blockId)).size, 25);
  assert.equal(ADI_BLOCK_MANIFEST[0].blockId, "ADI-01");
  assert.equal(ADI_BLOCK_MANIFEST[24].blockId, "ADI-25");
});
