#!/usr/bin/env node
// BUILD-23 — CLI helper for deploy.sh: records/updates a
// platform.deployment_events row via DeploymentEventRepository.
//
// Deliberately a real Node script reading arguments through process.argv
// (safe) rather than deploy.sh building an inline `node -e '...'` string
// with shell variables interpolated directly into it — the latter would
// let a value containing a single quote (a commit message, a CI actor
// name, anything caller-supplied) break out of the string and execute
// arbitrary code. This script is the fix: every value crosses the
// bash-to-node boundary as an argv element, never as interpolated source.
//
// Usage:
//   node deployment-audit.cjs start <version> <environment> <gitSha> <deployedBy>
//     -> prints the new deployment_events id to stdout
//   node deployment-audit.cjs succeeded <id> <notes>
//   node deployment-audit.cjs failed <id> <notes>
//   node deployment-audit.cjs check-promotion <version> <environment>
//     -> exit 0 if this version is allowed to promote to this environment,
//        exit 1 (with an explanatory message) if not. The promotion
//        chain: local/test are unrestricted; staging requires a prior
//        'succeeded' deployment of the SAME version to 'test'; production
//        requires a prior 'succeeded' deployment of the SAME version to
//        'staging'. This is the actual, enforced promotion gate (spec §2)
//        — not just a documented policy nobody checks.
//
// Requires DATABASE_URL in the environment.

const path = require('node:path');
const { createPool, DeploymentEventRepository, closePool } = require(
  path.join(__dirname, '..', '..', '..', 'packages', 'database', 'dist', 'index.js')
);

async function main() {
  const [, , command, ...args] = process.argv;
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is required');
    process.exit(1);
  }
  createPool({ connectionString: process.env.DATABASE_URL });
  const repo = new DeploymentEventRepository();

  try {
    if (command === 'start') {
      const [version, environment, gitSha, deployedBy] = args;
      const event = await repo.start({ version, environment, gitSha, deployedBy });
      console.log(event.id);
    } else if (command === 'succeeded') {
      const [id, notes] = args;
      await repo.markSucceeded(id, notes);
    } else if (command === 'failed') {
      const [id, notes] = args;
      await repo.markFailed(id, notes);
    } else if (command === 'check-promotion') {
      const [version, environment] = args;
      const requiredPriorEnvironment = { staging: 'test', production: 'staging' }[environment];
      if (!requiredPriorEnvironment) {
        console.log(`No promotion prerequisite for environment "${environment}" — proceeding.`);
        return;
      }
      const recent = await repo.listForEnvironment(requiredPriorEnvironment, 100);
      const priorSuccess = recent.find((e) => e.version === version && e.status === 'succeeded');
      if (!priorSuccess) {
        console.error(
          `ERROR: version "${version}" has no succeeded deployment to "${requiredPriorEnvironment}" — cannot promote to "${environment}".`
        );
        process.exitCode = 1;
        return;
      }
      console.log(`Promotion gate satisfied: "${version}" succeeded in "${requiredPriorEnvironment}" at ${priorSuccess.completedAt}.`);
    } else {
      console.error(`ERROR: unknown command "${command}" (expected start|succeeded|failed)`);
      process.exit(1);
    }
  } finally {
    await closePool();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
