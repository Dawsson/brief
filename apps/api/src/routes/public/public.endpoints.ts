import { briefContentTypes, negotiateContentType, renderBrief } from "@brief/renderer";
import { z } from "zod";

import { apiErrors, procedure } from "../../../procedure";
import type { Repository } from "../../data/repository";

const publicInput = z.object({ id: z.string().min(1) });
const secretInput = z.object({ id: z.string().min(1), secret: z.string().min(1) });

export const publicBrief = procedure
  .GET("/b/:id")
  .input(publicInput)
  .output({ 200: z.unknown() })
  .openapi({ summary: "Render a public Brief", tags: ["Public"] })
  .handler(({ ctx, input, req }) =>
    renderPublicBrief(ctx.services.repository, input.id, undefined, req.header("accept")),
  );

export const secretBrief = procedure
  .GET("/b/:id/:secret")
  .input(secretInput)
  .output({ 200: z.unknown() })
  .openapi({ summary: "Render a secret Brief", tags: ["Public"] })
  .handler(({ ctx, input, req }) =>
    renderPublicBrief(ctx.services.repository, input.id, input.secret, req.header("accept")),
  );

async function renderPublicBrief(
  repository: Repository,
  id: string,
  secret: string | undefined,
  accept: string | null,
) {
  const document = await repository.getBrief(id);
  if (!document) throw apiErrors.NOT_FOUND({ detail: "Brief not found" });
  if (document.expiresAt && document.expiresAt <= new Date().toISOString()) {
    throw apiErrors.GONE({ detail: "This share has expired" });
  }
  if (document.visibility === "private") {
    throw apiErrors.NOT_FOUND({ detail: "Brief not found" });
  }
  if (document.visibility === "secret" && secret !== document.secret) {
    throw apiErrors.NOT_FOUND({ detail: "Brief not found" });
  }
  const contentType = negotiateContentType(accept);
  if (!contentType) {
    throw apiErrors.NOT_ACCEPTABLE({
      detail: `Supported types: ${briefContentTypes.join(", ")}`,
    });
  }
  const rendered = renderBrief(document, contentType);
  return new Response(rendered.body, {
    headers: {
      "cache-control":
        document.visibility === "public"
          ? "public, max-age=60, stale-while-revalidate=300"
          : "private, no-store",
      "content-type": `${rendered.contentType}; charset=utf-8`,
      etag: `"${document.id}:${document.version}:${rendered.contentType}"`,
      vary: "Accept",
    },
  });
}
