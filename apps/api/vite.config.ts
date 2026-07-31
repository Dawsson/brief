import devServer from "@hono/vite-dev-server";
import { resolve } from "node:path";
import { defineConfig } from "vite-plus";

export default defineConfig(({ command }) => ({
  plugins: [devServer({ entry: "src/dev.ts" })],
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, "src/lambda.ts"),
      formats: ["es"],
      fileName: () => "server.js",
    },
    outDir: "dist/aws",
    rollupOptions: { output: { entryFileNames: "server.js" } },
    ssr: true,
    target: "node24",
  },
  ssr: command === "serve" ? { external: ["highlight.js"] } : { noExternal: true },
}));
