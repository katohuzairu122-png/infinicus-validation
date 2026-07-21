# BUILD-06 Completion Report — AI Decision Intelligence Layer

- **Build ID:** BUILD-06
- **Layer:** ADI (AI Decision Intelligence)
- **Date:** 2026-07-21
- **Branch:** `claude/infinicus-engine-debug-3loqb4`
- **Status:** COMPLETED

## What Was Built

Root-level `ai-decision-intelligence/` layer: 25 blocks converted from the
monorepo ES-module source
(`infinicus-platform/layers/ai-decision-intelligence/blocks/`) into
browser-global IIFE format, plus the concatenated `adi-bundle.js` wired into
`index.html`.

Conversion was performed with esbuild 0.21.5 (already present in the
monorepo pnpm store) bundling each block's `src/index.js` into a
self-contained IIFE. Each block registers its public API at
`window.INFINICUS.ADI.blocks["ADI-NN"]`. A bootstrap section at the end of
the bundle installs the ADI-01 runtime (`installGlobal`) and attaches
ADI-02 through ADI-25 in dependency order.

## Files Created

- 201 files under `ai-decision-intelligence/`
  - 25 block directories, each with `src/` (IIFE build), `tests/`
    (assert-based .mjs), `CLAUDE.md`, `README.md`, `package.json`,
    `docs/API.md`, `docs/INTEGRATION-CONTRACT.md`, `demo/index.html`
  - `adi-bundle.js` (269 KB, 25 blocks + bootstrap)
- 1 file modified: `index.html` (added
  `<script src="/ai-decision-intelligence/adi-bundle.js" defer></script>`
  after the cl-bundle.js script tag)

## Defects Found and Fixed

- **ADI-24 was Node.js-only:** its source imported `createHash` from
  `node:crypto`, which cannot run in a browser. The root-level build
  replaces it with an async Web Crypto (`crypto.subtle.digest("SHA-256")`)
  implementation. Hash parity with the original `node:crypto` output was
  verified byte-for-byte on sample payloads. The monorepo source was NOT
  modified — the patch is applied to a temporary copy during generation.

## Bootstrap Adapter Policy

Blocks that require external adapters receive safe defaults at attach time
(real adapters can be injected later without code changes):

- ADI-05 `readSnapshot` → returns `null` (acquire reports failure honestly)
- ADI-06 `readCompletedRun` → returns `null`
- ADI-16 `executeScenario` → throws "Simulation engine adapter is not connected."
- ADI-24 `publisher` → records handoff packages to `INFINICUS.ADI.handoffOutbox`

No upstream validation is bypassed; unavailable upstream layers surface as
standard failure envelopes.

## Validation Results

| Check | Result |
|---|---|
| `node --check ai-decision-intelligence/adi-bundle.js` | PASS |
| `node --check` on all 25 block src files | PASS (25/25) |
| Root ADI block tests (attach-chain + behaviour) | PASS (25/25, incl. ADI-25 `assertReady` with 0 missing services) |
| Full bundle execution in Node (window shim) | PASS — all 24 attach results `ok:true` |
| ADI-24 Web Crypto digest parity vs node:crypto | PASS (byte-identical) |
| Regression: ABA + BI + DT + OM + CL layer tests | PASS (127/127) |
| Monorepo ADI source tests (`node --test`) | PASS (212 pass, 0 fail) |
| Monorepo source unmodified | CONFIRMED (`git status`: only `index.html` modified + new `ai-decision-intelligence/`) |

## index.html Integration

`adi-bundle.js` loads with `defer` after dt/bi/aba/om/cl bundles, so
`window.INFINICUS.ADI.runtime` and all 25 services are available before
DOMContentLoaded handlers run. `index.html` remains loadable; no existing
bundle was touched.

## Queue State

- BUILD-06 → `completed`
- BUILD-07 (SIM — Simulation layer integration cleanup) → `ready`
