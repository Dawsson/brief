import { BRIEF_SCHEMA_VERSION, type BriefDocument } from "@brief/core";
import { z } from "zod";

import type { InviteRecord, UserRecord } from "./data/model";

export const emptyInputSchema = z.object({}).strict();

export const userSchema = z.object({
  createdAt: z.string(),
  email: z.email(),
  id: z.string(),
  role: z.enum(["admin", "user"]),
}) satisfies z.ZodType<UserRecord>;

export const inviteSchema = z.object({
  acceptedAt: z.string().optional(),
  createdAt: z.string(),
  email: z.email(),
  expiresAt: z.string(),
  id: z.string(),
  role: z.enum(["admin", "user"]),
}) as unknown as z.ZodType<Omit<InviteRecord, "tokenHash">>;

export const briefDocumentSchema = z
  .object({
    createdAt: z.string(),
    description: z.string().optional(),
    expiresAt: z.string().optional(),
    id: z.string(),
    ownerId: z.string().optional(),
    pages: z.array(z.unknown()),
    schemaVersion: z.literal(BRIEF_SCHEMA_VERSION),
    secret: z.string().optional(),
    title: z.string(),
    updatedAt: z.string(),
    version: z.number().int().nonnegative(),
    visibility: z.enum(["private", "public", "secret"]),
  })
  .passthrough() as unknown as z.ZodType<BriefDocument>;

export function publicUser(user: UserRecord): UserRecord {
  return user;
}

export function publicInvite(invite: InviteRecord): Omit<InviteRecord, "tokenHash"> {
  const { tokenHash: _, ...summary } = invite;
  return summary;
}
