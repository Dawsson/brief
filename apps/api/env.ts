import { defineEnv, string, url } from "@pier/backend/env";

export default defineEnv({
  BRIEF_ADMIN_EMAIL: string().default("hello@dawson.gg"),
  BRIEF_APP_ORIGIN: url().default("http://localhost:5174"),
  BRIEF_BUCKET: string().optional(),
  BRIEF_RP_ID: string().default("localhost"),
  BRIEF_TABLE: string().optional(),
  NODE_ENV: string().default("development"),
});
