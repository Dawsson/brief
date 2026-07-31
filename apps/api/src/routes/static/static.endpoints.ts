import { z } from "zod";

import { apiErrors, procedure } from "../../../procedure";
import { serveStaticPath } from "./static.service";

const fileInput = z.object({ file: z.string().min(1) });
const routeInput = z.object({ route: z.string().min(1) });

async function staticResponse(path: string) {
  const response = await serveStaticPath(path);
  if (!response) throw apiErrors.NOT_FOUND({ detail: "Static file not found" });
  return response;
}

export const webAsset = procedure
  .GET("/assets/:file")
  .input(fileInput)
  .output({ 200: z.unknown() })
  .openapi({ hidden: true })
  .handler(({ input }) => staticResponse(`/assets/${encodeURIComponent(input.file)}`));

export const adminRoot = procedure
  .GET("/admin")
  .output({ 200: z.unknown() })
  .openapi({ hidden: true })
  .handler(() => staticResponse("/admin"));
export const adminSlash = procedure
  .GET("/admin/")
  .output({ 200: z.unknown() })
  .openapi({ hidden: true })
  .handler(() => staticResponse("/admin/"));
export const adminAsset = procedure
  .GET("/admin/assets/:file")
  .input(fileInput)
  .output({ 200: z.unknown() })
  .openapi({ hidden: true })
  .handler(({ input }) => staticResponse(`/admin/assets/${encodeURIComponent(input.file)}`));
export const adminRoute = procedure
  .GET("/admin/:route")
  .input(routeInput)
  .output({ 200: z.unknown() })
  .openapi({ hidden: true })
  .handler(({ input }) => staticResponse(`/admin/${encodeURIComponent(input.route)}`));

export const docsRoot = procedure
  .GET("/docs")
  .output({ 200: z.unknown() })
  .openapi({ hidden: true })
  .handler(() => staticResponse("/docs"));
export const docsSlash = procedure
  .GET("/docs/")
  .output({ 200: z.unknown() })
  .openapi({ hidden: true })
  .handler(() => staticResponse("/docs/"));
export const docsAsset = procedure
  .GET("/docs/assets/:file")
  .input(fileInput)
  .output({ 200: z.unknown() })
  .openapi({ hidden: true })
  .handler(({ input }) => staticResponse(`/docs/assets/${encodeURIComponent(input.file)}`));
export const docsRoute = procedure
  .GET("/docs/:route")
  .input(routeInput)
  .output({ 200: z.unknown() })
  .openapi({ hidden: true })
  .handler(({ input }) => staticResponse(`/docs/${encodeURIComponent(input.route)}`));
