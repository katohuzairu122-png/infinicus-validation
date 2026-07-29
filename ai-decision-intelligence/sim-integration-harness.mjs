// BUILD-07 test harness: loads the REAL Engine v3 core (simulate/monteCarlo
// and their data tables) plus the REAL SIM facade out of root index.html into
// an isolated VM context. No engine code is duplicated — if the engine or
// facade source changes shape, extraction fails loudly and the
// characterization tests fail, which is exactly what BUILD-07 requires.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const INDEX_HTML = resolve(dirname(fileURLToPath(import.meta.url)), '../index.html');

function sliceBalanced(source, startMarker) {
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`Engine extraction failed: marker not found: ${startMarker}`);
  const open = source.indexOf('{', start);
  if (open === -1) throw new Error(`Engine extraction failed: no opening brace after: ${startMarker}`);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        let end = i + 1;
        if (source[end] === ';') end++;
        return source.slice(start, end);
      }
    }
  }
  throw new Error(`Engine extraction failed: unbalanced braces for: ${startMarker}`);
}

function sliceLine(source, marker) {
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Engine extraction failed: marker not found: ${marker}`);
  const end = source.indexOf('\n', start);
  return source.slice(start, end);
}

/**
 * Evaluates the real engine core + facade in a fresh VM context.
 * Returns the context's `window` (window.INFINICUS.SIMULATION is the facade).
 */
export function loadEngineV3Facade() {
  const html = readFileSync(INDEX_HTML, 'utf8');

  const pieces = [
    sliceLine(html, 'const SIM_DAYS = 90;'),
    sliceLine(html, 'const _flat = '),
    sliceLine(html, 'const _wknd = '),
    sliceLine(html, 'const _ramp = '),
    sliceBalanced(html, 'const PROFILES = {'),
  ];
  // EVT_POOL is an array literal; brace slicing does not apply. Slice to `];`.
  const evtStart = html.indexOf('const EVT_POOL');
  if (evtStart === -1) throw new Error('Engine extraction failed: EVT_POOL not found');
  pieces.push(html.slice(evtStart, html.indexOf('];', evtStart) + 2));

  const locStart = html.indexOf('const LOCATION_COSTS');
  if (locStart === -1) throw new Error('Engine extraction failed: LOCATION_COSTS not found');
  pieces.push(html.slice(locStart, html.indexOf('];', locStart) + 2));

  for (const marker of [
    'function rnd(min,max)',
    'function rndi(min,max)',
    'function gauss()',
    'function rNorm(mean,sd)',
    'function pickEvents()',
    'function detectLocation(locStr)',
    'const ENGINE_MODES = {',
    'function simulate(params)',
    'function monteCarlo(params)',
  ]) {
    pieces.push(sliceBalanced(html, marker));
  }
  pieces.push(sliceLine(html, 'const EXP_MULT = {'));
  pieces.push(sliceLine(html, 'const COMP_MULT = {'));

  const facadeStart = html.indexOf('/* ─── BUILD-07 — SIM execution/read facade');
  const facadeEnd = html.indexOf('/* Register publisher hooks', facadeStart);
  if (facadeStart === -1 || facadeEnd === -1) {
    throw new Error('Facade extraction failed: BUILD-07 facade block not found in index.html');
  }
  pieces.push(html.slice(facadeStart, facadeEnd));

  const context = vm.createContext({ console });
  context.window = { INFINICUS: { SIMULATION: {} } };
  vm.runInContext(pieces.join('\n\n'), context, { filename: 'engine-v3-extract.js' });
  return context.window;
}

export const FIXTURE_PARAMS = Object.freeze({
  industry: 'food',
  capital: 15000,
  price: 12,
  mktBud: 600,
  team: 2,
  engMode: 'balanced',
  exp: 'some',
  comp: 'medium',
  loc: '',
});
