import { z } from "zod";

import { procedure } from "../../../procedure";
import type { InviteRecord } from "../../data/model";
import { hashToken, randomToken } from "../../security/tokens";
import {
  briefDocumentSchema,
  inviteSchema,
  publicInvite,
  publicUser,
  userSchema,
} from "../../schemas";
import { requireAdmin } from "../auth/auth.middleware";

const adminProcedure = procedure.use(requireAdmin);
const inviteInput = z.object({
  email: z.email(),
  role: z.enum(["admin", "user"]).default("user"),
});

export const createInvite = adminProcedure
  .POST("/v1/invites")
  .input(inviteInput)
  .output({ 201: z.object({ data: inviteSchema, token: z.string() }) })
  .openapi({ summary: "Create an invite", tags: ["Administration"] })
  .handler(async ({ ctx, input, res }) => {
    const token = randomToken("invite");
    const now = new Date().toISOString();
    const invite: InviteRecord = {
      id: `inv_${crypto.randomUUID().replaceAll("-", "")}`,
      email: input.email.toLowerCase(),
      role: input.role,
      tokenHash: await hashToken(token),
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await ctx.services.repository.createInvite(invite);
    return res.created({ data: publicInvite(invite), token });
  });

export const overview = adminProcedure
  .GET("/v1/admin/overview")
  .output({
    200: z.object({
      briefs: z.array(briefDocumentSchema),
      invites: z.array(inviteSchema),
      storageBytes: z.number(),
      users: z.array(userSchema),
    }),
  })
  .openapi({ summary: "Read the admin overview", tags: ["Administration"] })
  .handler(async ({ ctx }) => {
    const [users, invites, briefs, storageBytes] = await Promise.all([
      ctx.services.repository.listUsers(),
      ctx.services.repository.listInvites(),
      ctx.services.repository.listBriefs(),
      ctx.services.storage.bytesUsed(),
    ]);
    return {
      briefs,
      invites: invites.map(publicInvite),
      storageBytes,
      users: users.map(publicUser),
    };
  });
