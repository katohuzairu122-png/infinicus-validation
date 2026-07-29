// BUILD-10 initialization state machine tests — spec §6 / §22.B
import assert from 'node:assert/strict';
import { loadPlatformBootstrap, fullyReadyNamespaces } from './_harness.mjs';

// 1. all 8 namespaces ready -> state === "ready"
{
  const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
  assert.equal(window.INFINICUS.PLATFORM.status.state, 'ready');
  assert.equal(window.INFINICUS.PLATFORM.status.readyLayers.length, 8);
}

// 2. one namespace missing -> degraded, present in missingLayers
{
  const ns = fullyReadyNamespaces();
  delete ns.DT;
  const { window } = loadPlatformBootstrap(ns);
  assert.equal(window.INFINICUS.PLATFORM.status.state, 'degraded');
  assert.ok(window.INFINICUS.PLATFORM.status.missingLayers.includes('DT'));
}

// 3. three of eight namespaces missing -> degraded with readyLayers.length === 5
{
  const ns = fullyReadyNamespaces();
  delete ns.DT;
  delete ns.OM;
  delete ns.CL;
  const { window } = loadPlatformBootstrap(ns);
  assert.equal(window.INFINICUS.PLATFORM.status.state, 'degraded');
  assert.equal(window.INFINICUS.PLATFORM.status.readyLayers.length, 5);
}

// 4. all namespaces missing -> failed
{
  const { window } = loadPlatformBootstrap({});
  assert.equal(window.INFINICUS.PLATFORM.status.state, 'failed');
  assert.equal(window.INFINICUS.PLATFORM.status.readyLayers.length, 0);
}

// 5. a layer whose diagnostic route returns ok:false -> degraded, that layer not in readyLayers
{
  const ns = fullyReadyNamespaces();
  ns.BI = { runtime: { call: () => ({ ok: false, data: null, error: { code: 'X', message: 'not ready' } }) } };
  const { window } = loadPlatformBootstrap(ns);
  assert.equal(window.INFINICUS.PLATFORM.status.state, 'degraded');
  assert.ok(!window.INFINICUS.PLATFORM.status.readyLayers.includes('BI'));
  assert.ok(window.INFINICUS.PLATFORM.status.degradedLayers.includes('BI'));
}

// 6. a layer diagnostic that throws does not abort the whole pass (isolation, spec §12)
{
  const ns = fullyReadyNamespaces();
  ns.ADI = { runtime: { dispatch: () => { throw new Error('boom'); } } };
  const { window } = loadPlatformBootstrap(ns);
  assert.equal(window.INFINICUS.PLATFORM.status.state, 'degraded');
  assert.equal(window.INFINICUS.PLATFORM.status.readyLayers.length, 7);
  assert.ok(window.INFINICUS.PLATFORM.status.errors.some((e) => e.layerId === 'ADI' && e.fatal === false));
}

// 7. duplicate initialize() call without force returns identical status (idempotent, spec §16)
{
  const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
  const before = window.INFINICUS.PLATFORM.bootstrap.getStatus();
  const result = window.INFINICUS.PLATFORM.bootstrap.initialize();
  assert.deepEqual(result.status.readyLayers, before.readyLayers);
  assert.equal(result.status.initializedAt, before.initializedAt, 'duplicate call must not recompute initializedAt');
}

// 8. initialize({force:true}) re-enters and recomputes initializedAt
{
  const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
  const before = window.INFINICUS.PLATFORM.bootstrap.getStatus();
  await new Promise((r) => setTimeout(r, 5));
  const result = window.INFINICUS.PLATFORM.bootstrap.initialize({ force: true });
  assert.notEqual(result.status.initializedAt, before.initializedAt, 'force re-entry must recompute initializedAt');
}

// 9. ok field on PlatformInitializationResult reflects state === "ready"
{
  const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
  const result = window.INFINICUS.PLATFORM.bootstrap.initialize({ force: true });
  assert.equal(result.ok, true);
  const ns = fullyReadyNamespaces();
  delete ns.DA;
  const { window: w2 } = loadPlatformBootstrap(ns);
  const result2 = w2.INFINICUS.PLATFORM.bootstrap.initialize({ force: true });
  assert.equal(result2.ok, false);
}

// 10. isReady() matches state === "ready" exactly
{
  const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
  assert.equal(window.INFINICUS.PLATFORM.bootstrap.isReady(), true);
  const ns = fullyReadyNamespaces();
  delete ns.OM;
  const { window: w2 } = loadPlatformBootstrap(ns);
  assert.equal(w2.INFINICUS.PLATFORM.bootstrap.isReady(), false);
}

console.log('platform/tests/03-bootstrap-state-machine.test.mjs passed.');
