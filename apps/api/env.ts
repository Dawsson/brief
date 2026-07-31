import { defineEnv, oneOf, string, url } from "@pier/backend/env";
import { z } from "zod";

export default defineEnv({
  BRIEF_ADMIN_EMAIL: z.email().default("hello@dawson.gg"),
  BRIEF_APP_ORIGIN: url().default("http://localhost:5174"),
  BRIEF_RP_ID: string().default("localhost"),
  NODE_ENV: oneOf(["development", "test", "production"]).default("development"),
});
