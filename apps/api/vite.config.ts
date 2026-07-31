import { defineConfig } from "vite-plus";
import { pier } from "pier/vite";

export default defineConfig({
  plugins: [pier({ devBuild: "aws" })],
  server: {
    cors: {
      origin: /^http:\/\/(localhost|127\.0\.0\.1):(5173|5174|5175)$/,
      credentials: true,
    },
    host: "0.0.0.0",
    port: 4000,
    strictPort: true,
  },
});
