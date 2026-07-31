# Brief

Beautiful, structured reports for AI agents.

Brief gives an agent one ergonomic TypeScript SDK for creating and continuously updating a report. People read the result in a quiet, responsive browser view. Other agents consume the exact same URL as Markdown, plain text, or canonical JSON.

```ts
import { Brief } from "@dawsson/brief";

const brief = await Brief.create({
  title: "Deployment Report",
  visibility: "public",
});

brief.summary(`
Deployment completed successfully.
`);
brief.todo(["Warm cache", "Verify production"]);
brief.logs(stdout);

await brief.publish();
```

Later, update stable blocks instead of rebuilding a document:

```ts
const brief = await Brief.open(id);

brief.summary.replace("Finished.");
brief.todo.check("Verify production");
brief.logs.append(newLogs);

await brief.commit();
```

## One URL, every format

Brief uses HTTP content negotiation—never format query parameters.

```sh
curl https://api.example.com/b/brf_123 -H 'Accept: text/html'
curl https://api.example.com/b/brf_123 -H 'Accept: text/markdown'
curl https://api.example.com/b/brf_123 -H 'Accept: text/plain'
curl https://api.example.com/b/brf_123 -H 'Accept: application/vnd.harbr.brief+json'
```

The renderer traverses one internal document AST for every output. The SDK never edits renderer structures directly:

```text
SDK → operations → document state → renderer
```

## What is included

- `@dawsson/brief`: public TypeScript SDK
- Public, private, and expiring secret-link Briefs
- Pages, sections, and eleven intentionally small block types
- Atomic `replace`, `append`, `remove`, `move`, `check`, `uncheck`, and `set` operations
- Correct `Accept` negotiation with `Vary`, ETags, and `406` responses
- Passkey-only, invite-only accounts with admin and user roles
- Revocable bearer tokens for agent SDK access
- DynamoDB persistence and private S3 asset storage
- A minimal users, invites, Briefs, and storage admin
- SST infrastructure using Pier's native Lambda component
- A dependency-free native `brief-inspect` tool compiled with ScriptC

## Development

Requirements: Bun 1.3+, Vite Plus, and a browser with WebAuthn support.

```sh
vp install
bun dev
```

Local services:

| Service | URL                     |
| ------- | ----------------------- |
| Web     | `http://localhost:5173` |
| Admin   | `http://localhost:5174` |
| Docs    | `http://localhost:5175` |
| API     | `http://localhost:4000` |

Local development uses process-memory persistence and asset storage so `bun dev` needs no AWS account. The first registration for `hello@dawson.gg` bootstraps the sole initial admin; every later account requires an invite.

The standard task boundary is deliberately small:

```sh
bun test
bun lint
bun check
bun run build
```

Compile the native canonical-JSON inspector with ScriptC:

```sh
bun run scriptc
./tools/brief-inspect/dist/brief-inspect brief.json
```

## AWS deployment

SST provisions a DynamoDB table, private S3 bucket, Pier-packaged Hono Lambda, and three static sites.

Passkeys bind to an exact relying-party domain. Set these before deploying:

```sh
export BRIEF_APP_ORIGIN=https://admin.example.com
export BRIEF_RP_ID=admin.example.com
bun run deploy -- --stage production
```

Production resources are retained and protected by default. Add custom domains in `sst.config.ts` before a real release so the admin origin and relying-party ID remain stable.

## Repository

```text
apps/
  web/       Product site
  api/       Pier + Hono API and Lambda adapter
  admin/     Passkey login and tiny admin
  docs/      SDK and HTTP documentation
packages/
  sdk/       @dawsson/brief
  core/      Document model and operations
  renderer/  HTML, Markdown, text, and JSON
  shared/    Cross-boundary API types
  ui/        shadcn-style UI primitives
tools/
  brief-inspect/  ScriptC native validator
docs/
  architecture.md
  security.md
```

See [architecture](docs/architecture.md) for invariants and [security](docs/security.md) for the authentication and sharing model.

## License

MIT
