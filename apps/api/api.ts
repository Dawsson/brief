import { defineApi } from "@pier/backend/pier-api";

export default defineApi({
  docs: false,
  openapi: { path: "/openapi.json", title: "Brief API", version: "1.0.0" },
});
