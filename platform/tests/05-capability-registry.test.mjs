// BUILD-10 capability registry tests — spec §14 / §22.B
import assert from 'node:assert/strict';
import { loadPlatformBootstrap, fullyReadyNamespaces, plain } from './_harness.mjs';

const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
const capabilities = plain(window.INFINICUS.PLATFORM.bootstrap.getCapabilities());

// 1. exactly 9 entries
assert.equal(capabilities.length, 9);

// 2. exact expected capability names, fixed order
const expectedNames = [
  'data_acquisition', 'business_operations', 'business_intelligence',
  'business_digital_twin', 'simulation', 'ai_decision_intelligence',
  'approved_business_action', 'outcome_monitoring', 'continuous_learning'
];
assert.deepEqual(capabilities.map((c) => c.name), expectedNames);

// 3. business_operations is present with browserApplicable: false
{
  const bo = capabilities.find((c) => c.name === 'business_operations');
  assert.ok(bo, 'business_operations capability must exist');
  assert.equal(bo.browserApplicable, false);
  assert.equal(bo.ready, false);
  assert.ok(bo.diagnostics && typeof bo.diagnostics.note === 'string', 'BO must carry an explanatory note, not a bare failure');
}

// 4. every non-BO capability has browserApplicable: true
for (const c of capabilities) {
  if (c.name === 'business_operations') continue;
  assert.equal(c.browserApplicable, true, `${c.name} must be browserApplicable`);
}

// 5. all 8 non-BO capabilities report ready:true when every namespace is fully ready
for (const c of capabilities) {
  if (c.name === 'business_operations') continue;
  assert.equal(c.ready, true, `${c.name} must be ready`);
}

// 6. version reported is "1.0.0" for every capability entry
for (const c of capabilities) {
  assert.equal(c.version, '1.0.0');
}

// 7. publicInterface is populated for browser-applicable capabilities, null for BO
{
  const da = capabilities.find((c) => c.name === 'data_acquisition');
  assert.equal(da.publicInterface, 'window.INFINICUS.DA.runtime');
  const bo = capabilities.find((c) => c.name === 'business_operations');
  assert.equal(bo.publicInterface, null);
}

// 8. a degraded namespace produces degraded:true, ready:false for that capability only
{
  const ns = fullyReadyNamespaces();
  ns.CL = { runtime: { invoke: () => ({ ok: false, data: null, error: { code: 'X', message: 'x' } }) } };
  const { window: w2 } = loadPlatformBootstrap(ns);
  const caps2 = w2.INFINICUS.PLATFORM.bootstrap.getCapabilities();
  const cl = caps2.find((c) => c.name === 'continuous_learning');
  assert.equal(cl.ready, false);
  assert.equal(cl.degraded, true);
  const om = caps2.find((c) => c.name === 'outcome_monitoring');
  assert.equal(om.ready, true, 'a sibling layer must remain unaffected');
}

// 9. dependencies field reflects the handoff producer for at least one known case (BI depends on BO)
{
  const bi = capabilities.find((c) => c.name === 'business_intelligence');
  assert.ok(bi.dependencies.includes('BO'), 'business_intelligence dependencies must include BO per the handoff map');
}

console.log('platform/tests/05-capability-registry.test.mjs passed.');
