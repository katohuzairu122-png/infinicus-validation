# Maintainer guidance

- Package only gates with `endorsed_for_aba` status.
- Verify source identities and preserve review attribution.
- Digest the canonical payload and make building idempotent by gate.
- Publication is transport to ABA, never execution or business approval.
