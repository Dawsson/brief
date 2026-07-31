import { middleware } from "@pier/backend/builders";

import { apiErrors, type BriefContext } from "../../procedure";

export default middleware(
  async ({ ctx, next }) => {
    const origin = (ctx.request as Request).headers.get("origin");
    if (origin) {
      const { services } = ctx as typeof ctx & BriefContext;
      const allowedOrigins = new Set([
        services.authOrigin,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
      ]);
      if (!allowedOrigins.has(origin)) {
        throw apiErrors.FORBIDDEN({ detail: "Origin is not allowed" });
      }
    }
    await next();
  },
  { name: "brief.security.allowed-origin" },
);
