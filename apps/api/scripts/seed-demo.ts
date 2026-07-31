import type { BriefDocument } from "@brief/core";
import { Resource } from "sst";
import { DynamoRepository } from "../src/data/dynamo-repository";

const timestamp = "2026-07-31T00:00:00.000Z";

const demo: BriefDocument = {
  schemaVersion: 1,
  id: "16230282",
  ownerId: "system",
  title: "Production Deployment",
  description: "A public Brief rendered from canonical document state.",
  visibility: "public",
  version: 1,
  createdAt: timestamp,
  updatedAt: timestamp,
  pages: [
    {
      id: "pag_demo_overview",
      title: "Overview",
      slug: "48271930",
      sections: [
        {
          id: "sec_demo_summary",
          blocks: [
            {
              id: "blk_demo_hero",
              type: "hero",
              eyebrow: "Deployment · July 31, 2026",
              title: "Production is healthy.",
              subtitle: "All systems are operating normally after a four-minute release.",
            },
            {
              id: "blk_demo_summary",
              type: "markdown",
              content:
                "## Summary\nThe release completed without interruption. **API latency is stable** and every routed health check is passing.",
            },
            {
              id: "blk_demo_metric",
              type: "metric",
              label: "Availability",
              value: "99.99%",
              detail: "Last 30 days",
              trend: "up",
            },
            {
              id: "blk_demo_code",
              type: "code",
              filename: "deploy.ts",
              language: "typescript",
              code: 'const brief = await Brief.open("16230282");\nbrief.logs.append("Deployment verified.");\nawait brief.commit();',
            },
            {
              id: "blk_demo_checklist",
              type: "checklist",
              items: [
                { id: "itm_demo_migrations", text: "Run database migrations", checked: true },
                { id: "itm_demo_cache", text: "Warm edge cache", checked: true },
                { id: "itm_demo_verify", text: "Verify production", checked: true },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "pag_demo_logs",
      title: "Logs",
      slug: "93016482",
      sections: [
        {
          id: "sec_demo_logs",
          title: "Release output",
          blocks: [
            {
              id: "blk_demo_logs",
              type: "logs",
              content: "12:41:02  api /healthz 200\n12:41:03  web / 200\n12:41:04  cache warmed\n",
            },
          ],
        },
      ],
    },
  ],
};

const repository = new DynamoRepository(Resource.Database.name);
await repository.putBrief(demo);
console.log(`Seeded Brief ${demo.id} in ${Resource.Database.name}`);
