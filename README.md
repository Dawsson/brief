# Brief

Brief is a TypeScript SDK for publishing structured reports that are pleasant to read and easy for agents to update.

```sh
bun add @dawsson/brief
```

```ts
import { Brief } from "@dawsson/brief";

const brief = await Brief.create({
  title: "Deployment Report",
  visibility: "public",
});

brief.summary("Deployment completed successfully.");
brief.todo(["Warm cache", "Verify production"]);
brief.logs(stdout);

await brief.publish();
console.log(brief.url);
```

Open the same Brief later and change only what changed:

```ts
const brief = await Brief.open(id);

brief.summary.replace("Finished.");
brief.todo.check("Verify production");
brief.logs.append(newLogs);

await brief.commit();
```

The SDK produces typed operations. Operations update canonical document state, and one renderer turns that state into every supported format.

```text
SDK → operations → state → renderer
```

No renderer structures leak into the SDK. Every Brief, page, section, block, and checklist item keeps a stable ID.

## One URL, four representations

Brief selects a representation from the HTTP `Accept` header. There are no format query parameters and no parallel documents to keep in sync.

```sh
curl https://api.example.com/b/brf_123 -H 'Accept: text/html'
curl https://api.example.com/b/brf_123 -H 'Accept: text/markdown'
curl https://api.example.com/b/brf_123 -H 'Accept: text/plain'
curl https://api.example.com/b/brf_123 -H 'Accept: application/vnd.harbr.brief+json'
```

Responses include `Vary: Accept` and an ETag. Unsupported representations receive `406 Not Acceptable`.

## Scope

Brief v1 deliberately has a small surface:

- Pages containing sections containing blocks
- Hero, Markdown, checklist, code, logs, table, callout, image, metric, divider, and spacer blocks
- `replace`, `append`, `remove`, `move`, `check`, `uncheck`, and `set` operations
- Public, private, and expiring secret-link sharing
- Invite-only, passkey-only accounts with admin and user roles
- Agent tokens for SDK access
- A focused admin for users, invites, Briefs, and storage

The production stack is Hono on AWS Lambda, DynamoDB, private S3 storage, and SST with Pier. The browser apps use React, Tailwind CSS, and shadcn-style primitives. Everything is TypeScript except the dependency-free ScriptC inspector.

## Development

You need [Bun](https://bun.sh) 1.3 or newer and [Vite Plus](https://viteplus.dev).

```sh
vp install
bun dev
```

| Service | Local URL               |
| ------- | ----------------------- |
| Web     | `http://localhost:5173` |
| Admin   | `http://localhost:5174` |
| Docs    | `http://localhost:5175` |
| API     | `http://localhost:4000` |

Local development uses in-memory persistence and asset storage. The first registration for `hello@dawson.gg` creates the initial admin; all later accounts require an invite.

```sh
bun test
bun lint
bun check
bun run build
```

To build the native canonical-JSON inspector:

```sh
bun run scriptc
./tools/brief-inspect/dist/brief-inspect brief.json
```

## Deployment

SST provisions the DynamoDB table, private S3 bucket, Pier-packaged API Lambda, and three static sites.

Passkeys are bound to the admin site's origin and relying-party ID. Configure both before the first production deployment:

```sh
export BRIEF_APP_ORIGIN=https://admin.example.com
export BRIEF_RP_ID=admin.example.com
bun run deploy -- --stage production
```

Production resources are protected from removal and retained by default.

## Repository

```text
apps/
  web/       Public product and Brief reader
  api/       Hono API and Lambda adapter
  admin/     Passkey login and administration
  docs/      SDK and HTTP documentation
packages/
  sdk/       Published @dawsson/brief package
  core/      Canonical model and operations
  renderer/  HTML, Markdown, text, and JSON
  shared/    Cross-boundary API types
  ui/        Shared interface primitives
tools/
  brief-inspect/  ScriptC canonical-JSON validator
docs/
  architecture.md
  security.md
```

The key boundaries are documented in [Architecture](docs/architecture.md) and [Security](docs/security.md).

## License

MIT
