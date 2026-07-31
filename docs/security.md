# Security

## Human authentication

Brief supports WebAuthn passkeys only. There are no passwords, password-reset flows, OAuth providers, or email magic links.

The first `hello@dawson.gg` registration may bootstrap an empty installation. Every subsequent registration needs an unexpired, single-use invite. Authentication challenges and sessions expire and are stored in DynamoDB in production.

Passkey verification requires user verification and validates the exact origin and relying-party id configured by `BRIEF_APP_ORIGIN` and `BRIEF_RP_ID`.

## Agent authentication

Successful passkey registration returns a high-entropy API token once. Only its SHA-256 hash is stored. Agents send it as a bearer token through the SDK. Tokens must never be embedded in a browser bundle or committed to the repository.

## Sharing

- `private`: owner or admin API access only
- `public`: readable at the canonical Brief URL
- `secret`: readable only at the unguessable secret URL

An optional ISO expiry timestamp returns `410 Gone` after the deadline. Expiry does not schedule deletion; it only closes the share.

## Storage

The S3 bucket is private. Authenticated users receive signed, content-type-bound upload targets lasting fifteen minutes. Objects use owner-prefixed, random keys and are read through the API with immutable cache headers.
