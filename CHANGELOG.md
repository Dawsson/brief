# Changelog

## Unreleased

- Migrated the API fully to source-driven Pier procedures and middleware with SST-linked DynamoDB
  and S3 resources in every running stage.
- Split passkeys, registration policy, sessions, API keys, principal resolution, and CLI device
  authorization into focused auth services.
- Added server-side browser-session and CLI-token revocation, including sign-out controls in the
  admin and CLI.
- Added DynamoDB TTL metadata for expiring auth records and complete pagination for DynamoDB and
  S3 administrative reads.
- Removed the legacy API token stored on user records.

## 0.1.2 - 2026-07-31

- Added `brief login`, a browser-approved device flow that saves agent credentials privately and loads them automatically in the SDK.
- Removed agent-token delivery from passkey registration so plaintext tokens never appear in the browser.
- Added explicit passkey account creation and fixed invite URLs for the hosted admin.
- Fixed credentialed CORS preflights across local Brief apps.
- Refined the Brief reader shell, page navigation state, footer metadata, and code presentation.

## 0.1.1 - 2026-07-31

- Hosted Brief at `brief.harbr.run` through a minimal Cloudflare-to-Lambda domain adapter.
- Show the initial agent API token once after passkey registration so it can be saved securely.
- Added an idempotent public demo seed for validating every negotiated representation.
- Refined the reader with Inter typography, a quieter page rail, and server-rendered syntax highlighting.
- Changed generated Brief URLs and page anchors to opaque eight-digit IDs.

## 0.1.0 - 2026-07-31

- Added the `@dawsson/brief` TypeScript SDK for creating and incrementally updating reports.
- Added stable document operations and a canonical Brief model with pages, sections, and eleven block types.
- Added HTML, Markdown, plain-text, and canonical-JSON rendering through HTTP content negotiation.
- Added a Pier and Hono API backed by DynamoDB and private S3 storage on AWS Lambda.
- Added invite-only passkey authentication, agent tokens, and public, private, or expiring secret-link sharing.
- Added the public reader, focused admin, SDK documentation, and ScriptC document inspector.
