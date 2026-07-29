#!/usr/bin/env node
// BUILD-26 — Dependency scanning gate (spec §2). Runs the real `pnpm
// audit` against the npm advisory database and fails the build on any
// advisory not explicitly allowlisted below — each entry requires a
// justification, not a blanket suppression. `pnpm audit`'s own
// `pnpm.auditConfig.ignoreCves` (package.json) only matches
// CVE-numbered advisories; sharp's advisory here has no assigned CVE
// (GHSA-only), so it can't be allowlisted that way — this script
// matches on the advisory's github_advisory_id instead, precisely.
//
// Usage: node check-dependency-vulnerabilities.mjs
// Exit code: 0 if every finding is allowlisted; 1 otherwise (with a
// printed list of the un-allowlisted findings).

import { execFileSync } from 'node:child_process';

const ALLOWLIST = [
  {
    githubAdvisoryId: 'GHSA-5xrq-8626-4rwp',
    package: 'vitest',
    reason:
      'Requires the Vitest UI server (`vitest --ui`) to be actively listening. Every test script in this monorepo runs `vitest run` — the UI server is never started, in any package, in CI, or in local development, so the vulnerable code path is unreachable. Verified via grep across every package.json\'s "test" script.',
  },
  {
    githubAdvisoryId: 'GHSA-f88m-g3jw-g9cj',
    package: 'sharp',
    reason:
      'Transitive dependency of Next.js\'s built-in image-optimization component (next/image). apps/web never imports next/image (verified via grep) — no code path in this repository invokes sharp/libvips, so the vulnerable image-processing routines are never executed.',
  },
  // ── BUILD-30 launch-acceptance findings (esbuild/vite, transitive via vitest) ──
  // All four advisories below are vulnerabilities in vite's or esbuild's
  // OWN development server (`vite dev`/`vite preview`, or esbuild's
  // `--serve` mode) — not in any code these packages execute when used
  // as vitest's internal module-transform/resolution engine (`vitest
  // run`, the only way this monorepo ever invokes vitest — see the
  // vitest entry above). Verified live: `grep` across every
  // package.json's "dev"/"preview" script in the entire workspace shows
  // none of them invoke `vite`/`esbuild` directly — every package's
  // "dev" script is `tsc --watch`, and apps/web's is `next dev` (Next.js's
  // own dev server, unrelated to vite). vite/esbuild are pulled in only
  // as vitest's own transitive dependencies.
  {
    githubAdvisoryId: 'GHSA-67mh-4wv8-2f99',
    package: 'esbuild',
    reason:
      'esbuild\'s own development server (`esbuild --serve`) can be queried cross-origin. Never started in this repository — esbuild is used only as vitest\'s internal bundler for `vitest run`, never via its own CLI/serve mode.',
  },
  {
    githubAdvisoryId: 'GHSA-4w7w-66w2-5vf9',
    package: 'vite',
    reason:
      'Path traversal in vite dev server\'s handling of optimized-dependency `.map` files. Requires `vite dev`/`vite preview` to be running; this repository never starts vite\'s own dev/preview server (see file-level note above).',
  },
  {
    githubAdvisoryId: 'GHSA-v6wh-96g9-6wx3',
    package: 'vite',
    reason:
      'NTLMv2 hash disclosure via UNC path handling, in vite\'s `launch-editor` dev-server integration, Windows-only. Never reachable: no vite dev server is ever started in this repository, and this platform\'s CI/deployment targets are not Windows.',
  },
  {
    githubAdvisoryId: 'GHSA-fx2h-pf6j-xcff',
    package: 'vite',
    reason:
      'vite dev server\'s `server.fs.deny` path-restriction bypass on Windows alternate data streams. Never reachable: no vite dev server is ever started in this repository, and this platform\'s CI/deployment targets are not Windows.',
  },
];

function main() {
  let auditJson;
  try {
    // pnpm audit exits non-zero when vulnerabilities exist even with --json — capture stdout regardless.
    auditJson = execFileSync('pnpm', ['audit', '--json'], { encoding: 'utf8' });
  } catch (err) {
    auditJson = err.stdout;
  }

  if (!auditJson || auditJson.trim().length === 0) {
    console.error('ERROR: pnpm audit produced no output.');
    process.exit(1);
  }

  const report = JSON.parse(auditJson);
  const advisories = Object.values(report.advisories ?? {});

  if (advisories.length === 0) {
    console.log('Dependency scan passed — 0 advisories found.');
    return;
  }

  const allowlistIds = new Set(ALLOWLIST.map((a) => a.githubAdvisoryId));
  const unallowlisted = advisories.filter((a) => !allowlistIds.has(a.github_advisory_id));
  const allowlisted = advisories.filter((a) => allowlistIds.has(a.github_advisory_id));

  for (const a of allowlisted) {
    const entry = ALLOWLIST.find((e) => e.githubAdvisoryId === a.github_advisory_id);
    console.log(`ALLOWLISTED: [${a.severity}] ${a.module_name} (${a.github_advisory_id}) — ${entry.reason}`);
  }

  if (unallowlisted.length > 0) {
    console.error(`\nDependency scan FAILED — ${unallowlisted.length} un-allowlisted advisory(ies):`);
    for (const a of unallowlisted) {
      console.error(`  - [${a.severity}] ${a.module_name} (${a.github_advisory_id}): ${a.title}`);
    }
    console.error('\nEither upgrade the affected package, or add a justified entry to ALLOWLIST in this script.');
    process.exit(1);
  }

  console.log(`\nDependency scan passed — ${allowlisted.length} advisory(ies), all allowlisted with a documented reason.`);
}

main();
