import { z } from "zod";

import { procedure } from "../../../procedure";
import { serveStaticPath } from "../../static-files";

export const root = procedure
  .GET("/")
  .output({ 200: z.object({ name: z.string(), status: z.literal("ok"), version: z.string() }) })
  .openapi({ summary: "Read API status", tags: ["System"] })
  .handler(
    async () =>
      (await serveStaticPath("/")) ?? { name: "Brief API", status: "ok" as const, version: "v1" },
  );

export const health = procedure
  .GET("/healthz")
  .output({ 200: z.object({ status: z.literal("ok") }) })
  .openapi({ summary: "Read API health", tags: ["System"] })
  .handler(() => ({ status: "ok" as const }));
