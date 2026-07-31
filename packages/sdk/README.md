# @dawsson/brief

The TypeScript SDK for creating and continuously updating Brief reports.

```sh
bun add @dawsson/brief
```

```ts
import { Brief } from "@dawsson/brief";

const brief = await Brief.create({
  title: "Deployment Report",
  visibility: "public",
});

brief.hero("Production is healthy", "Deployment report · July 31");
brief.summary("All services passed their post-deploy checks.");
brief.todo(["Warm cache", "Verify production"]);
brief.metric("P95 latency", "184 ms", { trend: "down" });
brief.logs(stdout);

await brief.publish();
console.log(brief.url);
```

`Brief.create` builds local document state. `publish` persists it. Every object receives a stable ID so later updates can be expressed as focused operations:

```ts
const brief = await Brief.open(id);

brief.summary.replace("Deployment finished.");
brief.todo.check("Verify production");
brief.logs.append(newLogs);

await brief.commit();
```

Set `BRIEF_API_URL` and `BRIEF_API_TOKEN` in the environment, or pass them explicitly:

```ts
const brief = await Brief.create(
  { title: "Build Report" },
  {
    apiUrl: "https://api.example.com",
    token: process.env.BRIEF_API_TOKEN,
  },
);
```

## Blocks

The SDK includes `hero`, `summary`, `markdown`, `todo`, `code`, `logs`, `table`, `callout`, `image`, `metric`, `divider`, and `spacer`. Use `page` and `section` while composing a new Brief:

```ts
brief.page("Metrics", (page) => {
  page.section("Performance", (section) => {
    section.metric("Success rate", "99.99%", { trend: "up" });
  });
});
```

Brief renders the same canonical document as HTML, Markdown, plain text, or canonical JSON through HTTP content negotiation.

See the [Brief repository](https://github.com/Dawsson/brief) for the API, architecture, deployment guide, and full source.

MIT © Dawson Botsford
