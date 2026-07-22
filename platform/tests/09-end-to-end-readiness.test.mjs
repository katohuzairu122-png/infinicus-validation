// BUILD-10 end-to-end readiness tests — spec §9 / §22.D
// These tests validate readiness plumbing and the functional SIM<->ADI pair
// ONLY — per spec §9, no test here may assert that the full nine-layer
// browser pipeline (DA->BO->BI->DT->SIM->ADI->ABA->OM->CL) is operational,
// because it is not.
import assert from 'node:assert/strict';
import { loadPlatformBootstrap, fullyReadyNamespaces, plain } from './_harness.mjs';

// 1. full readiness: isReady() === true when all 8 namespaces are fully ready
{
  const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
  assert.equal(window.INFINICUS.PLATFORM.bootstrap.isReady(), true);
}

// 2. SIMULATION capability check reads runs/horizonDays verbatim — never silently normalized
{
  const ns = fullyReadyNamespaces();
  ns.SIMULATION = { ...ns.SIMULATION, capabilities: { runs: 999, horizonDays: 999 } };
  const { window } = loadPlatformBootstrap(ns);
  const simCap = window.INFINICUS.PLATFORM.capabilities.find((c) => c.name === 'simulation');
  assert.equal(simCap.ready, false, 'a non-500/90 capabilities value must be reported as not ready, never coerced to look correct');
}

// 3. ADI readiness reflects a real call to the mocked adi.master.diagnose route
{
  const ns = fullyReadyNamespaces();
  let calledWith = null;
  ns.ADI = { runtime: { dispatch: (name) => { calledWith = name; return { ok: false, data: { status: 'degraded' } }; } } };
  const { window } = loadPlatformBootstrap(ns);
  assert.equal(calledWith, 'adi.master.diagnose');
  const adiCap = window.INFINICUS.PLATFORM.capabilities.find((c) => c.name === 'ai_decision_intelligence');
  assert.equal(adiCap.ready, false);
}

// 4. DT readiness uses runtime.diagnostics() specifically — DT never receives a
//    call to a nonexistent dt.master.diagnose route (DT has no DT-25, spec §2)
{
  const ns = fullyReadyNamespaces();
  let diagnosticsCalled = false;
  ns.DT = {
    runtime: {
      diagnostics: () => { diagnosticsCalled = true; return { ok: true, data: { blockCount: 24 } }; },
      dispatch: () => { throw new Error('DT must never receive a master.diagnose-style dispatch call'); }
    }
  };
  const { window } = loadPlatformBootstrap(ns);
  assert.equal(diagnosticsCalled, true, 'DT readiness must be read via runtime.diagnostics()');
  const dtCap = window.INFINICUS.PLATFORM.capabilities.find((c) => c.name === 'business_digital_twin');
  assert.equal(dtCap.ready, true);
}

// 5. one of DT/ABA/OM/CL missing -> overall degraded, not ready
{
  const ns = fullyReadyNamespaces();
  delete ns.ABA;
  const { window } = loadPlatformBootstrap(ns);
  assert.equal(window.INFINICUS.PLATFORM.status.state, 'degraded');
  assert.notEqual(window.INFINICUS.PLATFORM.status.state, 'ready');
}

// 6. getHandoffs() output is identical regardless of runtime readiness (static map, spec §8.3)
{
  const { window: readyWindow } = loadPlatformBootstrap(fullyReadyNamespaces());
  const { window: failedWindow } = loadPlatformBootstrap({});
  const readyHandoffs = plain(readyWindow.INFINICUS.PLATFORM.bootstrap.getHandoffs());
  const failedHandoffs = plain(failedWindow.INFINICUS.PLATFORM.bootstrap.getHandoffs());
  assert.deepEqual(readyHandoffs, failedHandoffs, 'the handoff map must never depend on runtime readiness');
}

// 7. platform-bootstrap.js never invokes the real Monte Carlo engine during initialize()
{
  const { callCounts } = loadPlatformBootstrap(fullyReadyNamespaces());
  assert.equal(callCounts.executeScenario, 0, 'initialize() must never call SIMULATION.executeScenario — no simulation runs during page load');
}

// 8. getVersionManifest() has exactly 8 layer keys — no BO entry (spec §15)
{
  const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
  const manifest = plain(window.INFINICUS.PLATFORM.bootstrap.getVersionManifest());
  assert.equal(Object.keys(manifest.layers).length, 8);
  assert.equal('BO' in manifest.layers, false);
  assert.equal(manifest.layers.SIMULATION, 'infinicus-engine-v3');
}

console.log('platform/tests/09-end-to-end-readiness.test.mjs passed.');
