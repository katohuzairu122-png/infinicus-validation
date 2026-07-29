// BUILD-10 security tests — spec §17 / §22
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadPlatformBootstrap, fullyReadyNamespaces, BOOTSTRAP_PATH } from './_harness.mjs';

const rawSrc = readFileSync(BOOTSTRAP_PATH, 'utf8');
// Strip /* ... */ and // comments before scanning for forbidden calls, so an
// explanatory comment mentioning a forbidden term (e.g. "no innerHTML")
// cannot itself trip the scan — only real code matters here.
const src = rawSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

// 1. no eval(
assert.equal(/\beval\s*\(/.test(src), false, 'platform-bootstrap.js must never call eval');

// 2. no new Function(
assert.equal(/new\s+Function\s*\(/.test(src), false, 'platform-bootstrap.js must never construct a Function from a string');

// 3. no setTimeout/setInterval with a string first argument (dynamic code execution)
assert.equal(/set(Timeout|Interval)\s*\(\s*['"`]/.test(src), false, 'no string-based setTimeout/setInterval');

// 4. no innerHTML / outerHTML / insertAdjacentHTML
assert.equal(/innerHTML|outerHTML|insertAdjacentHTML/.test(src), false, 'platform-bootstrap.js must never write HTML');

// 5. no localStorage / sessionStorage
assert.equal(/\b(localStorage|sessionStorage)\b/.test(src), false, 'no browser storage use');

// 6. no fetch / XMLHttpRequest (no new network endpoint)
assert.equal(/\bfetch\s*\(|XMLHttpRequest/.test(src), false, 'platform-bootstrap.js must never make a network call');

// 7. diagnostics never carry a raw full response payload — only the redacted summary shape
{
  const ns = fullyReadyNamespaces();
  ns.BI = {
    runtime: {
      call: () => ({
        ok: true,
        data: { status: 'ready', productionReady: true, secretApiKey: 'sk-should-never-leak', customerRecord: { name: 'should not leak' } }
      })
    }
  };
  const { window } = loadPlatformBootstrap(ns);
  const events = window.INFINICUS.PLATFORM.diagnostics.events;
  const serialized = JSON.stringify(events);
  assert.equal(serialized.includes('secretApiKey'), false, 'diagnostics must never leak arbitrary layer-response fields');
  assert.equal(serialized.includes('should not leak'), false, 'diagnostics must never leak nested business data');
}

// 8. no credential-shaped key is ever set on window.INFINICUS.PLATFORM
{
  const { window } = loadPlatformBootstrap(fullyReadyNamespaces());
  const serialized = JSON.stringify(window.INFINICUS.PLATFORM);
  for (const forbidden of ['password', 'apiKey', 'secret', 'token', 'credential']) {
    assert.equal(serialized.toLowerCase().includes(forbidden.toLowerCase()), false, `PLATFORM namespace must never contain a "${forbidden}"-named field`);
  }
}

// 9. a layer-controlled string is never used as a prototype-polluting bracket key
{
  const ns = fullyReadyNamespaces();
  ns.DA = { runtime: { invoke: () => ({ ok: true, data: { status: '__proto__' } }) } };
  const { window } = loadPlatformBootstrap(ns);
  assert.equal(Object.prototype.polluted, undefined, 'a layer-controlled string must never pollute Object.prototype');
  assert.equal(window.INFINICUS.PLATFORM.status.state, 'ready');
}

console.log('platform/tests/08-security.test.mjs passed.');
