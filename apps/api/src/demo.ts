import { appendBlock, createDocument, createId, type BriefPage } from "@brief/core";

import type { Repository } from "./repository";

export async function seedLocalDemo(repository: Repository) {
  if (await repository.getBrief("16230282")) return;
  const demo = createDocument({
    id: "16230282",
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
    type: "code",
    filename: "deploy.ts",
    language: "typescript",
    code: 'const brief = await Brief.open("16230282");\nbrief.logs.append("Deployment verified.");\nawait brief.commit();',
  });
  demo.pages.push({
    id: createId("pag"),
    title: "Logs",
    slug: "93016482",
    sections: [
      {
        id: createId("sec"),
        title: "Release output",
        blocks: [
          {
            id: createId("blk"),
            type: "logs",
            content: "12:41:02  api /healthz 200\n12:41:03  web / 200\n12:41:04  cache warmed\n",
          },
        ],
      },
    ],
  } satisfies BriefPage);
  await repository.putBrief(demo);
}
