import { middleware } from "@pier/backend/builders";

import { apiErrors, type BriefContext } from "../../../procedure";
import type { UserRecord } from "../../data/model";

export const requireUser = middleware<unknown, { readonly user: UserRecord }>(
  async ({ ctx, next }) => {
    const { services } = ctx as typeof ctx & BriefContext;
    const user = await services.auth.resolveUser(ctx.request as Request);
    if (!user) throw apiErrors.UNAUTHORIZED({ detail: "Authentication required" });
    await next({ ctx: { user } });
  },
  { name: "brief.auth.require-user" },
);

export const requireAdmin = middleware<unknown, { readonly user: UserRecord }>(
  async ({ ctx, next }) => {
    const { services } = ctx as typeof ctx & BriefContext;
    const user = await services.auth.resolveUser(ctx.request as Request);
    if (!user) throw apiErrors.UNAUTHORIZED({ detail: "Authentication required" });
    if (user.role !== "admin") throw apiErrors.FORBIDDEN({ detail: "Admin access required" });
    await next({ ctx: { user } });
  },
  { name: "brief.auth.require-admin" },
);
