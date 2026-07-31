# Architecture

Brief is a report system, not a general-purpose document editor. Its boundaries exist to preserve that constraint.

## Data flow

```text
@dawsson/brief SDK
        ↓
typed operations
        ↓
canonical Brief document
        ↓
renderer traversal
   ↙    ↓     ↓    ↘
HTML Markdown text JSON
```

The SDK owns agent ergonomics. `packages/core` owns ids, state, and operation semantics. `packages/renderer` is the only package that understands presentation formats. The API validates ownership and versions, applies operations, and persists the resulting document.

## Invariants

1. Every Brief, page, section, block, and checklist item has a stable id.
2. Replacement operations preserve the target block id.
3. Updates are applied atomically against an expected document version.
4. Renderers are pure functions of canonical document state.
5. Format selection is an HTTP concern and never changes the Brief URL.
6. The public npm package exposes SDK concepts, not storage or renderer internals.

## Persistence

Every running API stage uses its own DynamoDB table with `pk` and `sk` keys. Briefs, users, credentials, invites, authentication flows, and sessions are separate entities. S3 objects are private; uploads use short-lived signed PUT URLs and reads redirect through short-lived signed GET URLs. SST links both resources into the API as `Resource.Database` and `Resource.Storage`. Tests replace those adapters with in-memory implementations.

DynamoDB has no appropriate Drizzle adapter. The repository boundary therefore uses the AWS SDK directly rather than introducing an ORM that cannot model the datastore faithfully.

## Lambda packaging

The Pier Vite plugin discovers `*.endpoints.ts` modules and ordered middleware, generates the API contract and OpenAPI document, and builds `apps/api/dist/aws/server.mjs`. SST's `@buildwithharbor/pier-sst` provider owns the Lambda, Function URL, resource links, and development build watcher. The built reader, admin, and docs assets are copied into the same Lambda package and served from `/`, `/admin/`, and `/docs/`. Keeping the browser apps and API on one origin preserves first-party passkey sessions without an extra proxy layer.

The `apps/edge` Cloudflare Worker maps `brief.harbr.run` to the generated Function URL. It changes only the upstream hostname and preserves paths, methods, bodies, headers, status codes, and content negotiation. This narrow adapter exists because the AWS account cannot currently provision CloudFront distributions.

Pier owns API routing, middleware, response validation, OpenAPI generation, and the AWS Function URL adapter. Application code owns authentication and the DynamoDB/S3 adapters. `env.ts` declares application configuration; infrastructure identity always comes from linked SST resources.

ScriptC is used only for the dependency-free `brief-inspect` CLI.
