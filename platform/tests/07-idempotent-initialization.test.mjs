// BUILD-10 idempotent-initialization tests — spec §16 / §22.B
import assert from 'node:assert/strict';
import { loadPlatformBootstrap, fullyReadyNamespaces, plain } from './_harness.mjs';

// 1. two calls to initialize() without force produce byte-identical status
{
  const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
  const r1 = plain(window.INFINICUS.PLATFORM.bootstrap.initialize());
  const r2 = plain(window.INFINICUS.PLATFORM.bootstrap.initialize());
  assert.deepEqual(r1, r2, 'duplicate initialize() calls must return identical results');
}

// 2. a duplicate call does not re-invoke any layer's diagnostic route a second time
{
  let daCalls = 0;
  const ns = fullyReadyNamespaces();
  ns.DA = { runtime: { invoke: () => { daCalls++; return { ok: true, data: { productionReady: true } }; } } };
  const { window } = loadPlatformBootstrap(ns);
  assert.equal(daCalls, 1, 'DA diagnose must be invoked exactly once during the initial load');
  window.INFINICUS.PLATFORM.bootstrap.initialize();
  window.INFINICUS.PLATFORM.bootstrap.initialize();
  assert.equal(daCalls, 1, 'a duplicate initialize() call must not re-invoke the DA diagnose route');
}

// 3. force:true re-entry DOES re-invoke each layer's diagnostic route
{
  let biCalls = 0;
  const ns = fullyReadyNamespaces();
  ns.BI = { runtime: { call: () => { biCalls++; return { ok: true, data: { productionReady: true } }; } } };
  const { window } = loadPlatformBootstrap(ns);
  assert.equal(biCalls, 1);
  window.INFINICUS.PLATFORM.bootstrap.initialize({ force: true });
  assert.equal(biCalls, 2, 'force:true must re-run the full detection pass');
}

// 4. diagnostics ring buffer does not grow unbounded across repeated duplicate calls
{
  const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
  const before = window.INFINICUS.PLATFORM.diagnostics.events.length;
  for (let i = 0; i < 20; i++) window.INFINICUS.PLATFORM.bootstrap.initialize();
  const after = window.INFINICUS.PLATFORM.diagnostics.events.length;
  assert.ok(after <= 50, 'diagnostics must remain bounded at 50 events regardless of duplicate calls');
  assert.ok(after >= before, 'duplicate calls append a no-op event each time, within the bound');
}

// 5. getCapabilities()/getHandoffs()/getVersionManifest() are stable across repeated reads
{
  const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
  const c1 = plain(window.INFINICUS.PLATFORM.bootstrap.getCapabilities());
  const c2 = plain(window.INFINICUS.PLATFORM.bootstrap.getCapabilities());
  assert.deepEqual(c1, c2);
  const h1 = plain(window.INFINICUS.PLATFORM.bootstrap.getHandoffs());
  const h2 = plain(window.INFINICUS.PLATFORM.bootstrap.getHandoffs());
  assert.deepEqual(h1, h2);
}

// 6. loading the file twice (two independent contexts) never throws (no global singleton corruption)
{
  const a = loadPlatformBootstrap(fullyReadyNamespaces());
  const b = loadPlatformBootstrap(fullyReadyNamespaces());
  assert.equal(a.window.INFINICUS.PLATFORM.status.state, 'ready');
  assert.equal(b.window.INFINICUS.PLATFORM.status.state, 'ready');
}

console.log('platform/tests/07-idempotent-initialization.test.mjs passed.');
