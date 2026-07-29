// BUILD-10 namespace-contract tests — spec §4 / §22.B
import assert from 'node:assert/strict';
import { loadPlatformBootstrap, fullyReadyNamespaces } from './_harness.mjs';

// 1. window.INFINICUS.PLATFORM exists after load
const { window: w1 } = loadPlatformBootstrap(fullyReadyNamespaces());
assert.ok(w1.INFINICUS.PLATFORM, 'window.INFINICUS.PLATFORM must exist');

// 2. required shape: version, bootstrap, status, capabilities, diagnostics, handoffs
const P = w1.INFINICUS.PLATFORM;
for (const key of ['version', 'bootstrap', 'status', 'capabilities', 'diagnostics', 'handoffs']) {
  assert.ok(key in P, `PLATFORM.${key} must be present`);
}

// 3. version is exactly "1.0.0"
assert.equal(P.version, '1.0.0');

// 4. public API methods exist and are functions
for (const method of ['initialize', 'getStatus', 'isReady', 'getCapabilities', 'getDiagnostics', 'getHandoffs', 'getVersionManifest']) {
  assert.equal(typeof P.bootstrap[method], 'function', `bootstrap.${method} must be a function`);
}

// 5. existing namespaces are not renamed, wrapped, or proxied — still direct objects
assert.equal(typeof w1.INFINICUS.DA, 'object');
assert.equal(typeof w1.INFINICUS.DA.runtime.invoke, 'function');
assert.equal(typeof w1.INFINICUS.SIMULATION.executeScenario, 'function');

// 6. no window.INFINICUS.BO namespace is ever created (spec: no BO browser namespace)
assert.equal('BO' in w1.INFINICUS, false, 'no Business Operations browser namespace may be created');

// 7. getVersionManifest has exactly 8 layer keys, no BO
const manifest = P.bootstrap.getVersionManifest();
assert.equal(manifest.platformVersion, '1.0.0');
assert.equal(Object.keys(manifest.layers).length, 8);
assert.equal('BO' in manifest.layers, false);

// 8. PLATFORM.status matches bootstrap.getStatus() output shape
const status = P.bootstrap.getStatus();
assert.ok(['not_started', 'validating', 'initializing', 'ready', 'degraded', 'failed'].includes(status.state));

// 9. capabilities is exactly 9 entries (one per architectural layer incl. BO)
assert.equal(P.bootstrap.getCapabilities().length, 9);

// 10. handoffs is exactly 9 entries
assert.equal(P.bootstrap.getHandoffs().length, 9);

console.log('platform/tests/02-namespace-contract.test.mjs passed.');
