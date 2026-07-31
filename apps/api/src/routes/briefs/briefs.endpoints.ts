import { applyOperations, type BriefDocument } from "@brief/core";
import { z } from "zod";

import { apiErrors, procedure } from "../../../procedure";
import { requireUser } from "../../auth-middleware";
import { randomToken } from "../../crypto";
import type { UserRecord } from "../../model";
import type { Repository } from "../../repository";
import { briefDocumentSchema, emptyInputSchema } from "../../schemas";

const idInput = z.object({ id: z.string().min(1) });
const createInput = z.object({ document: briefDocumentSchema });
const updateInput = z.object({
  expectedVersion: z.number().int().nonnegative(),
  id: z.string().min(1),
  operations: z.array(z.unknown()).max(100),
});
const briefResponse = z.object({ data: briefDocumentSchema });
const userProcedure = procedure.use(requireUser);

export const list = userProcedure
  .GET("/v1/briefs")
  .input(emptyInputSchema)
  .output({ 200: z.object({ data: z.array(briefDocumentSchema) }) })
  .openapi({ summary: "List Briefs", tags: ["Briefs"] })
  .handler(async ({ ctx }) => ({ data: await ctx.services.repository.listBriefs(ctx.user.id) }));

export const create = userProcedure
  .POST("/v1/briefs")
  .input(createInput)
  .output({ 201: briefResponse })
  .openapi({ summary: "Create a Brief", tags: ["Briefs"] })
  .handler(async ({ ctx, input, res }) => {
    if (await ctx.services.repository.getBrief(input.document.id)) {
      throw apiErrors.ALREADY_EXISTS({ detail: "This Brief already exists" });
    }
    const now = new Date().toISOString();
    const document: BriefDocument = {
      ...structuredClone(input.document),
      ownerId: ctx.user.id,
      createdAt: now,
      updatedAt: now,
      version: 1,
      ...(input.document.visibility === "secret" && !input.document.secret
        ? { secret: randomToken("share") }
        : {}),
    };
    await ctx.services.repository.putBrief(document);
    return res.created({ data: document });
  });

export const read = userProcedure
  .GET("/v1/briefs/:id")
  .input(idInput)
  .output({ 200: briefResponse })
  .openapi({ summary: "Read a Brief", tags: ["Briefs"] })
  .handler(async ({ ctx, input }) => ({
    data: await authorizedBrief(ctx.services.repository, input.id, ctx.user),
  }));

export const update = userProcedure
  .PATCH("/v1/briefs/:id")
  .input(updateInput)
  .output({ 200: briefResponse })
  .openapi({ summary: "Update a Brief", tags: ["Briefs"] })
  .handler(async ({ ctx, input }) => {
    const document = await authorizedBrief(ctx.services.repository, input.id, ctx.user);
    if (document.version !== input.expectedVersion) {
      throw apiErrors.VERSION_CONFLICT({
        detail: `Expected version ${input.expectedVersion}, found ${document.version}`,
      });
    }
    let updated: BriefDocument;
    try {
      updated = applyOperations(
        document,
        input.operations as Parameters<typeof applyOperations>[1],
      );
    } catch (cause) {
      throw apiErrors.REQUEST_FAILED({
        cause,
        detail: cause instanceof Error ? cause.message : "The operations could not be applied",
      });
    }
    if (updated.visibility === "secret" && !updated.secret) updated.secret = randomToken("share");
    await ctx.services.repository.putBrief(updated);
    return { data: updated };
  });

export const remove = userProcedure
  .DELETE("/v1/briefs/:id")
  .input(idInput)
  .output({ 204: null })
  .openapi({ summary: "Delete a Brief", tags: ["Briefs"] })
  .handler(async ({ ctx, input, res }) => {
    const document = await authorizedBrief(ctx.services.repository, input.id, ctx.user);
    await ctx.services.repository.deleteBrief(document.id);
    return res.noContent();
  });

async function authorizedBrief(repository: Repository, id: string, user: UserRecord) {
  const document = await repository.getBrief(id);
  if (!document) throw apiErrors.NOT_FOUND({ detail: "Brief not found" });
  if (document.ownerId !== user.id && user.role !== "admin") {
    throw apiErrors.FORBIDDEN({ detail: "You do not own this Brief" });
  }
  return document;
}
