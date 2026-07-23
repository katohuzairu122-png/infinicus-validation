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
