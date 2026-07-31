import { z } from "zod";

import { apiErrors, procedure } from "../../../procedure";
import { requireUser } from "../../auth-middleware";

const uploadInput = z.object({
  contentType: z.string().min(1).max(120),
  filename: z.string().min(1).max(200),
});
const keyInput = z.object({
  filename: z.string().min(1),
  ownerId: z.string().min(1),
  uploadId: z.string().min(1),
});

const keyFrom = (input: z.infer<typeof keyInput>) =>
  `${input.ownerId}/${input.uploadId}/${input.filename}`;

export const createUpload = procedure
  .use(requireUser)
  .POST("/v1/storage/uploads")
  .input(uploadInput)
  .output({
    201: z.object({
      data: z.object({
        headers: z.record(z.string(), z.string()),
        key: z.string(),
        method: z.literal("PUT"),
        uploadUrl: z.string(),
        url: z.string(),
      }),
    }),
  })
  .openapi({ summary: "Create an asset upload", tags: ["Storage"] })
  .handler(async ({ ctx, input, req, res }) => {
    const target = await ctx.services.storage.createUpload(
      { ...input, ownerId: ctx.user.id },
      req.url.origin,
    );
    const path = target.key.split("/").map(encodeURIComponent).join("/");
    return res.created({
      data: { ...target, url: `${req.url.origin}/v1/storage/assets/${path}` },
    });
  });

export const readAsset = procedure
  .GET("/v1/storage/assets/:ownerId/:uploadId/:filename")
  .input(keyInput)
  .output({ 200: z.unknown() })
  .openapi({ summary: "Read a stored asset", tags: ["Storage"] })
  .handler(async ({ ctx, input }) => {
    const asset = await ctx.services.storage.get(keyFrom(input));
    if (!asset) throw apiErrors.NOT_FOUND({ detail: "Asset not found" });
    return new Response(asset.body, {
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": asset.contentType,
      },
    });
  });

export const putLocalAsset = procedure
  .use(requireUser)
  .PUT("/v1/storage/local/:ownerId/:uploadId/:filename")
  .body("bytes")
  .input(keyInput)
  .output({ 204: null })
  .openapi({ hidden: true })
  .handler(async ({ ctx, input, req, res }) => {
    if (!ctx.services.storage.putLocal) {
      throw apiErrors.NOT_FOUND({ detail: "Local uploads are disabled" });
    }
    const key = keyFrom(input);
    if (input.ownerId !== ctx.user.id) {
      throw apiErrors.FORBIDDEN({ detail: "Invalid storage key" });
    }
    await ctx.services.storage.putLocal(
      key,
      new Uint8Array(await req.arrayBuffer()),
      req.header("content-type") ?? "application/octet-stream",
    );
    return res.noContent();
  });
