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

Production uses a single DynamoDB table with `pk` and `sk` keys. Briefs, users, credentials, invites, authentication flows, and sessions are separate entities. S3 objects are private and served through immutable API asset URLs; uploads use short-lived signed PUT URLs.

DynamoDB has no appropriate Drizzle adapter. The repository boundary therefore uses the AWS SDK directly rather than introducing an ORM that cannot model the datastore faithfully.

## Lambda packaging

The API builds to `apps/api/dist/aws/server.js`. SST's `@buildwithharbor/pier-sst` provider owns the Lambda/Function URL and development build watcher; Hono owns request routing and the AWS event adapter.

ScriptC is used for the dependency-free `brief-inspect` CLI. It is intentionally not used for the Hono Lambda: the Hono AWS adapter currently requires ScriptC's dynamic tier, so using it there would add runtime risk without improving the product boundary.
