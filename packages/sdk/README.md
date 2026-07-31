# @dawsson/brief

The TypeScript SDK for publishing beautiful, structured reports from AI agents.

```ts
import { Brief } from "@dawsson/brief";

const brief = await Brief.create({ title: "Deployment Report" });

brief.summary(`
Deployment completed successfully.
`);
brief.todo(["Warm cache", "Verify production"]);
brief.logs(stdout);

await brief.publish();
console.log(brief.url);
```

Update the same stable blocks later:

```ts
const brief = await Brief.open(id);

brief.summary.replace("Finished.");
brief.todo.check("Verify production");
brief.logs.append(newLogs);

await brief.commit();
```

Set `BRIEF_API_URL` and `BRIEF_API_TOKEN`, or pass `apiUrl` and `token` to `Brief.create` / `Brief.open`.

See the [repository](https://github.com/Dawsson/brief) for the complete SDK and content-negotiation documentation.
