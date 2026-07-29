# Connector Security

Store only credential references in ABA-17.

Do not store:
- API secrets
- access tokens
- passwords
- private keys
- refresh tokens

A secure server-side secret manager or connector runtime must resolve credential references during controlled execution.
