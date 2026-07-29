// BUILD-10 handoff map tests — spec §8.3 / §22.C
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlatformBootstrap, fullyReadyNamespaces } from './_harness.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONTRACTS_DIR = resolve(HERE, '../../infinicus-platform/packages/handoff-contracts/src');

const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
const handoffs = window.INFINICUS.PLATFORM.bootstrap.getHandoffs();

// 1. exactly 9 entries
assert.equal(handoffs.length, 9);

// 2. each of the 9 frozen handoffIds present exactly once
const expectedIds = ['DA_TO_BO', 'BO_TO_BI', 'BI_TO_DT', 'DT_TO_SIM', 'SIM_TO_ADI', 'ADI_TO_ABA', 'ABA_TO_OM', 'OM_TO_CL', 'CL_FEEDBACK'];
for (const id of expectedIds) {
  assert.equal(handoffs.filter((h) => h.handoffId === id).length, 1, `${id} must appear exactly once`);
}

// 3. DA_TO_BO and BO_TO_BI are contract-backed
for (const id of ['DA_TO_BO', 'BO_TO_BI']) {
  const h = handoffs.find((x) => x.handoffId === id);
  assert.equal(h.contractBacked, true, `${id} must be contractBacked`);
  assert.equal(h.status, 'active');
}

// 4. SIM_TO_ADI is a direct-port, active handoff
{
  const h = handoffs.find((x) => x.handoffId === 'SIM_TO_ADI');
  assert.equal(h.mechanism, 'direct-port');
  assert.equal(h.status, 'active');
}

// 5. BI_TO_DT and DT_TO_SIM are not_wired (truthful, not falsely upgraded)
for (const id of ['BI_TO_DT', 'DT_TO_SIM']) {
  const h = handoffs.find((x) => x.handoffId === id);
  assert.equal(h.status, 'not_wired', `${id} must be reported not_wired`);
  assert.equal(h.contractBacked, false);
}

// 6. ADI_TO_ABA is not_wired
{
  const h = handoffs.find((x) => x.handoffId === 'ADI_TO_ABA');
  assert.equal(h.status, 'not_wired');
}

// 7. ABA_TO_OM, OM_TO_CL, CL_FEEDBACK are active but not contract-backed
for (const id of ['ABA_TO_OM', 'OM_TO_CL', 'CL_FEEDBACK']) {
  const h = handoffs.find((x) => x.handoffId === id);
  assert.equal(h.status, 'active');
  assert.equal(h.contractBacked, false);
}

// 8. every named contractFile matches a real file in handoff-contracts/src
const realFiles = new Set(readdirSync(CONTRACTS_DIR));
for (const h of handoffs) {
  assert.ok(realFiles.has(h.contractFile), `${h.contractFile} must exist under handoff-contracts/src`);
}

// 9. mechanism is always one of the 5 allowed enum values
const allowedMechanisms = new Set(['persistence', 'direct-port', 'registerPublisher', 'event-bus', 'not_wired']);
for (const h of handoffs) {
  assert.ok(allowedMechanisms.has(h.mechanism), `${h.mechanism} must be an allowed mechanism value`);
}

console.log('platform/tests/04-handoff-map.test.mjs passed.');
