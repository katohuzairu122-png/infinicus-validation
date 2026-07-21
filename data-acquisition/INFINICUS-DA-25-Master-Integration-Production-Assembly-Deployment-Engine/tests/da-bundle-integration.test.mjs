// BUILD-08 — DA layer structural, bundle, and source-to-root parity tests.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LAYER = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const REPO = resolve(LAYER, "..");
const SOURCE = join(REPO, "infinicus-platform/layers/data-acquisition/blocks");

// ── Structural verification: 25 blocks, none missing, none duplicated ───────
const rootBlocks = readdirSync(LAYER).filter((d) => d.startsWith("INFINICUS-DA-")).sort();
assert.equal(rootBlocks.length, 25, "exactly 25 root DA blocks required");
for (let i = 1; i <= 25; i++) {
  const nn = String(i).padStart(2, "0");
  const matches = rootBlocks.filter((b) => b.startsWith(`INFINICUS-DA-${nn}-`));
  assert.equal(matches.length, 1, `block DA-${nn} must exist exactly once (found ${matches.length})`);
}

// ── Source-to-root parity: every root src file is byte-identical to source ──
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
let compared = 0;
for (const block of rootBlocks) {
  for (const file of walk(join(LAYER, block))) {
    const rel = file.slice(join(LAYER, block).length);
    // The bundle-integration test itself is a root-only addition.
    if (rel.endsWith("da-bundle-integration.test.mjs")) continue;
    const sourceFile = join(SOURCE, block, rel);
    assert.equal(sha(file), sha(sourceFile), `root file diverged from source: ${block}${rel}`);
    compared++;
  }
}
assert.ok(compared > 200, `parity comparison covered ${compared} files`);

// ── Bundle order: DA-01 first … DA-25 last, each exactly once ───────────────
const bundle = readFileSync(join(LAYER, "da-bundle.js"), "utf8");
let lastIndex = -1;
for (let i = 1; i <= 25; i++) {
  const nn = String(i).padStart(2, "0");
  const marker = `/* ===== INFINICUS-DA-${nn}-`;
  const first = bundle.indexOf(marker);
  assert.ok(first !== -1, `bundle missing block marker DA-${nn}`);
  assert.equal(bundle.indexOf(marker, first + 1), -1, `bundle contains DA-${nn} more than once`);
  assert.ok(first > lastIndex, `bundle order violated at DA-${nn}`);
  lastIndex = first;
}
assert.ok(!bundle.includes("/src/ui/"), "ui demo hooks must not be bundled");
assert.ok(!/password|api[_-]?key|BEGIN [A-Z]+ PRIVATE KEY/i.test(bundle.replace(/credential_reference/gi, "")),
  "bundle must not embed credentials");

// ── Bundle execution: runtime, namespace, services, routes, diagnose ────────
globalThis.window ??= globalThis;
await import(join(LAYER, "da-bundle.js"));
const DA = globalThis.INFINICUS.DA;
assert.ok(DA && DA.runtime, "window.INFINICUS.DA.runtime must exist");
assert.equal(typeof DA.runtime.registerService, "function");
assert.equal(typeof DA.runtime.invoke, "function");
assert.equal(DA.runtime.services.size, 25, "all 25 blocks must register a service");
assert.ok(DA.runtime.routes.size >= 50, `expected ≥50 routes, got ${DA.runtime.routes.size}`);
assert.ok(DA.runtime.getRoute("da.runtime.diagnose"), "da.runtime.diagnose route required");

const diagnose = DA.runtime.diagnose();
assert.equal(diagnose.ok, true);
assert.equal(diagnose.data.layer, "Data Acquisition");
assert.equal(diagnose.data.status, "healthy");
assert.equal(diagnose.data.serviceCount, 25);

const manifest = await DA.runtime.invoke("da.runtime.manifest");
assert.equal(manifest.ok, true);
assert.equal(manifest.data.block, "DA-01");

// No competing namespace: DA is the only Data Acquisition global.
assert.equal(globalThis.INFINICUS.DAL, undefined, "no competing INFINICUS.DAL namespace");

// index.html wiring: script present and ordered before dt-bundle.
const html = readFileSync(join(REPO, "index.html"), "utf8");
const daTag = html.indexOf('<script src="/data-acquisition/da-bundle.js" defer></script>');
const dtTag = html.indexOf('<script src="/digital-twin/dt-bundle.js" defer></script>');
assert.ok(daTag !== -1, "index.html must load da-bundle.js with defer");
assert.ok(dtTag !== -1 && daTag < dtTag, "da-bundle.js must load before dt-bundle.js");

console.log("DA-25 bundle integration tests passed.");
