# Changelog

## Unreleased

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
