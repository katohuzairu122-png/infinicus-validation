// Shared VM harness for platform-bootstrap.js tests — same extraction/execution
// technique as ai-decision-intelligence/sim-integration-harness.mjs (BUILD-07):
// loads the REAL file source into an isolated vm.Context with a mocked
// window.INFINICUS, so tests exercise the actual shipped code, not a
// reimplementation of it.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

export const BOOTSTRAP_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../platform-bootstrap.js');
export const INDEX_HTML_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../../index.html');

/** Normalizes a value produced inside the vm.Context (a different JS realm)
 * into a plain main-realm value, so node:assert's strict/deep comparisons
 * (which are realm-sensitive for arrays/objects) behave as expected. */
export function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function ok(data) {
  return { ok: true, data: data === undefined ? { status: 'ready', productionReady: true } : data, error: null };
}
function fail(data) {
  return { ok: false, data: data === undefined ? null : data, error: { code: 'MOCK_NOT_READY', message: 'mock reports not ready' } };
}

/** One fully-ready mock namespace object per required layer. */
export function fullyReadyNamespaces() {
  return {
    DA: { runtime: { invoke: (name) => ok() } },
    DT: { runtime: { diagnostics: () => ok({ layer: 'Business Digital Twin', version: '1.0.0', blockCount: 24, registries: {} }) } },
    BI: { runtime: { call: (name) => ok() } },
    ABA: { runtime: { dispatch: (name) => ok() } },
    OM: { runtime: { dispatch: (name) => ok() } },
    CL: { runtime: { invoke: (name) => ok() } },
    ADI: { runtime: { dispatch: (name) => ok({ status: 'ready' }) } },
    SIMULATION: {
      engineVersion: 'infinicus-engine-v3',
      capabilities: Object.freeze({ runs: 500, horizonDays: 90, seedSupported: false }),
      executeScenario: () => ({ ok: true, run: {} }),
      getCompletedRun: () => ({ ok: true, run: {} })
    }
  };
}

/**
 * Loads the real platform-bootstrap.js source into a fresh VM context whose
 * window.INFINICUS is pre-populated with the given layer namespace mocks
 * (any layer key omitted is left entirely absent, simulating a missing bundle).
 * Returns { window, callCounts } where callCounts.executeScenario tracks
 * whether the real Monte Carlo entry point was ever invoked during load.
 */
export function loadPlatformBootstrap(namespaces) {
  const source = readFileSync(BOOTSTRAP_PATH, 'utf8');
  const callCounts = { executeScenario: 0 };
  const infinicus = {};
  for (const [layerId, ns] of Object.entries(namespaces || {})) {
    if (ns && ns.SIMULATION_PROXY) continue;
    infinicus[layerId === 'SIM' ? 'SIMULATION' : layerId] = ns;
  }
  if (infinicus.SIMULATION && typeof infinicus.SIMULATION.executeScenario === 'function') {
    const real = infinicus.SIMULATION.executeScenario;
    infinicus.SIMULATION.executeScenario = (...args) => { callCounts.executeScenario++; return real(...args); };
  }
  const consoleCalls = { warn: [], error: [] };
  const mockConsole = {
    warn: (...args) => consoleCalls.warn.push(args.join(' ')),
    error: (...args) => consoleCalls.error.push(args.join(' ')),
    log: () => {}
  };
  const context = vm.createContext({ console: mockConsole, Date, Math, JSON, structuredClone });
  context.window = { INFINICUS: infinicus, crypto: globalThis.crypto };
  vm.runInContext(source, context, { filename: 'platform-bootstrap-extract.js' });
  return { window: context.window, callCounts, consoleCalls };
}
