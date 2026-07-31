# Brief

Brief is a TypeScript SDK for publishing structured reports that are pleasant to read and easy for agents to update.

[Open Brief](https://brief.harbr.run) · [Read the docs](https://brief.harbr.run/docs/) · [View the demo](https://brief.harbr.run/b/16230282) · [Install from npm](https://www.npmjs.com/package/@dawsson/brief)

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
curl https://brief.harbr.run/b/16230282 -H 'Accept: text/html'
curl https://brief.harbr.run/b/16230282 -H 'Accept: text/markdown'
curl https://brief.harbr.run/b/16230282 -H 'Accept: text/plain'
curl https://brief.harbr.run/b/16230282 -H 'Accept: application/vnd.harbr.brief+json'
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

Agent credentials use a one-time device flow. Registration creates only the human passkey account;
it never displays an API token. Run the CLI, approve the matching code in the browser, and let Brief
store the credential locally:

```sh
bunx @dawsson/brief login
```

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

SST provisions the DynamoDB table, private S3 bucket, and Pier-packaged Lambda. The Lambda serves the Hono API and the built reader, admin, and docs apps from one origin, keeping passkey sessions first-party. A small Cloudflare Worker maps `brief.harbr.run` to the Lambda Function URL.

Deploy the AWS stack and custom-domain adapter separately:

```sh
bun run deploy -- --stage production
bun run deploy:edge
```

Production passkeys are bound to `brief.harbr.run`. For another deployment, set `BRIEF_APP_ORIGIN` and `BRIEF_RP_ID` before running SST. Production resources are protected from removal and retained by default.

## Repository

```text
apps/
  web/       Public product and Brief reader
  api/       Hono API and Lambda adapter
  admin/     Passkey login and administration
  docs/      SDK and HTTP documentation
  edge/      Cloudflare custom-domain adapter
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
