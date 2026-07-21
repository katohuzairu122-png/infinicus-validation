# Integration contract

Attach last, after ADI-01 through ADI-24. The engine validates canonical service IDs and block metadata. `assertReady` returns a failure envelope until every required service is present and correctly identified.

Recommended deployment order is the manifest order. Stop deployment at the first failed attachment and inspect that block's dependency response.
