# Deployment Guide

## 1. Load order

Load ABA-01 through ABA-24 before ABA-25.

## 2. Production storage

The included IndexedDB stores are development references. Production deployment should use:

- server-side database
- durable event log
- secure audit storage
- backup and recovery
- retention policies
- row-level or tenant-level access controls

## 3. Secrets

Do not place API keys, passwords, tokens, or private keys in browser JavaScript.

Use:

- server-side secret manager
- encrypted environment variables
- connector credential references
- short-lived access tokens

## 4. Required production checks

- all required blocks loaded
- all mandatory services registered
- all required routes available
- signed evidence enabled
- checksums enabled
- dry-run enforcement enabled
- idempotency enabled
- queue leasing enabled
- Outcome Monitoring enabled
- Continuous Learning enabled

## 5. Deployment gate

Call:

`masterIntegrationEngine.assessDeploymentReadiness({ config })`

Only proceed when `productionReady === true`.
