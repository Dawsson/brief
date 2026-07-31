import { appendBlock, createDocument, createId } from "@brief/core";
import { createApp } from "./app";
import { MemoryRepository } from "./repository";

const repository = new MemoryRepository();
const demo = createDocument({
  id: "brf_demo",
  title: "Production Deployment",
  description: "A sample Brief rendered from canonical document state.",
  visibility: "public",
});
demo.version = 1;
appendBlock(demo, {
  id: createId("blk"),
  type: "hero",
  eyebrow: "Deployment · July 31, 2026",
  title: "Production is healthy.",
  subtitle: "All systems are operating normally after a four-minute release.",
});
appendBlock(demo, {
  id: createId("blk"),
  type: "markdown",
  content:
    "## Summary\nThe release completed without interruption. **API latency is stable** and every routed health check is passing.",
});
appendBlock(demo, {
  id: createId("blk"),
  type: "metric",
  label: "Availability",
  value: "99.99%",
  detail: "Last 30 days",
  trend: "up",
});
appendBlock(demo, {
  id: createId("blk"),
  type: "checklist",
  items: [
    { id: createId("itm"), text: "Run database migrations", checked: true },
    { id: createId("itm"), text: "Warm edge cache", checked: true },
    { id: createId("itm"), text: "Verify production", checked: false },
  ],
});
appendBlock(demo, {
  id: createId("blk"),
  type: "logs",
  content: "12:41:02  api /readyz 200\n12:41:03  web / 200\n12:41:04  cache warmed\n",
});
await repository.putBrief(demo);

const app = createApp({ repository });
const server = Bun.serve({ port: 4000, fetch: app.fetch });
console.log(`Brief API listening on ${server.url} · sample ${server.url}b/brf_demo`);
