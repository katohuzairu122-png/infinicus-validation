// BUILD-10 failure-path tests — spec §12 / §22.F
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadPlatformBootstrap, fullyReadyNamespaces, BOOTSTRAP_PATH, plain } from './_harness.mjs';

// 1. missing bundle (namespace entirely absent) -> non-fatal, PLATFORM_LAYER_NAMESPACE_MISSING
{
  const ns = fullyReadyNamespaces();
  delete ns.OM;
  const { window } = loadPlatformBootstrap(ns);
  const err = window.INFINICUS.PLATFORM.status.errors.find((e) => e.layerId === 'OM');
  assert.ok(err, 'an error must be recorded for the missing OM namespace');
  assert.equal(err.code, 'PLATFORM_LAYER_NAMESPACE_MISSING');
  assert.equal(err.fatal, false);
  assert.notEqual(window.INFINICUS.PLATFORM.status.state, 'failed', 'a single missing layer must not be fatal');
}

// 2. corrupt namespace (not an object) -> non-fatal, PLATFORM_LAYER_NAMESPACE_MISSING, no thrown exception
{
  const ns = fullyReadyNamespaces();
  ns.DA = 'not an object';
  let threw = false;
  let window;
  try {
    ({ window } = loadPlatformBootstrap(ns));
  } catch {
    threw = true;
  }
  assert.equal(threw, false, 'a corrupt namespace must not throw out of initialize()');
  const err = window.INFINICUS.PLATFORM.status.errors.find((e) => e.layerId === 'DA');
  assert.ok(err);
  assert.equal(err.code, 'PLATFORM_LAYER_NAMESPACE_MISSING');
}

// 3. incompatible SIMULATION capabilities -> PLATFORM_LAYER_VERSION_INCOMPATIBLE
{
  const ns = fullyReadyNamespaces();
  ns.SIMULATION = { ...ns.SIMULATION, capabilities: { runs: 250, horizonDays: 90 } };
  const { window } = loadPlatformBootstrap(ns);
  const err = window.INFINICUS.PLATFORM.status.errors.find((e) => e.code === 'PLATFORM_LAYER_VERSION_INCOMPATIBLE');
  assert.ok(err, 'an incompatible SIMULATION.capabilities value must be reported, never silently normalized');
}

// 4. failed Simulation check (executeScenario not a function)
{
  const ns = fullyReadyNamespaces();
  ns.SIMULATION = { ...ns.SIMULATION, executeScenario: 'not-a-function' };
  const { window } = loadPlatformBootstrap(ns);
  const simCap = window.INFINICUS.PLATFORM.capabilities.find((c) => c.name === 'simulation');
  assert.equal(simCap.ready, false);
  assert.ok(window.INFINICUS.PLATFORM.status.errors.some((e) => e.layerId === 'SIMULATION'));
}

// 5. failed ADI check (diagnose throws) -> caught, PLATFORM_LAYER_DIAGNOSTIC_FAILED
{
  const ns = fullyReadyNamespaces();
  ns.ADI = { runtime: { dispatch: () => { throw new Error('adi exploded'); } } };
  const { window } = loadPlatformBootstrap(ns);
  const err = window.INFINICUS.PLATFORM.status.errors.find((e) => e.layerId === 'ADI');
  assert.equal(err.code, 'PLATFORM_LAYER_DIAGNOSTIC_FAILED');
}

// 6. no localStorage / indexedDB usage anywhere in the source (defensive scan)
{
  const src = readFileSync(BOOTSTRAP_PATH, 'utf8');
  assert.equal(/\blocalStorage\b/.test(src), false, 'platform-bootstrap.js must never use localStorage');
  assert.equal(/\bindexedDB\b/.test(src), false, 'platform-bootstrap.js must never use indexedDB');
}

// 7. no addEventListener usage (no duplicate listeners possible, spec §16)
{
  const src = readFileSync(BOOTSTRAP_PATH, 'utf8');
  assert.equal(/addEventListener/.test(src), false, 'platform-bootstrap.js must not register DOM event listeners');
}

// 8. partial initialization: 7 of 8 throw, 1 succeeds -> degraded, not failed
{
  const ns = fullyReadyNamespaces();
  const throwing = () => { throw new Error('down'); };
  ns.DA = { runtime: { invoke: throwing } };
  ns.DT = { runtime: { diagnostics: throwing } };
  ns.BI = { runtime: { call: throwing } };
  ns.ABA = { runtime: { dispatch: throwing } };
  ns.OM = { runtime: { dispatch: throwing } };
  ns.CL = { runtime: { invoke: throwing } };
  ns.ADI = { runtime: { dispatch: throwing } };
  const { window } = loadPlatformBootstrap(ns);
  assert.equal(window.INFINICUS.PLATFORM.status.state, 'degraded');
  assert.equal(window.INFINICUS.PLATFORM.status.readyLayers.length, 1);
  assert.deepEqual(plain(window.INFINICUS.PLATFORM.status.readyLayers), ['SIMULATION']);
}

// 9. all 8 throw/missing -> failed, and initialize() itself still returns normally
{
  const throwing = () => { throw new Error('down'); };
  const ns = {
    DA: { runtime: { invoke: throwing } },
    DT: { runtime: { diagnostics: throwing } },
    BI: { runtime: { call: throwing } },
    ABA: { runtime: { dispatch: throwing } },
    OM: { runtime: { dispatch: throwing } },
    CL: { runtime: { invoke: throwing } },
    ADI: { runtime: { dispatch: throwing } },
    /* SIM readiness never invokes executeScenario/getCompletedRun during bootstrap
       (spec §19) — it only checks their type and .capabilities shape — so making
       every layer fail requires an invalid capabilities value here too. */
    SIMULATION: { executeScenario: throwing, getCompletedRun: throwing, capabilities: { runs: 1, horizonDays: 1 } }
  };
  let threw = false;
  let window;
  try {
    ({ window } = loadPlatformBootstrap(ns));
  } catch {
    threw = true;
  }
  assert.equal(threw, false, 'initialize() must return normally even when every layer check fails');
  assert.equal(window.INFINICUS.PLATFORM.status.state, 'failed');
}

console.log('platform/tests/06-error-isolation.test.mjs passed.');
