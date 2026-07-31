import { resolve } from "node:path";
import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, "src/lambda.ts"),
      formats: ["es"],
      fileName: () => "server.js",
    },
    outDir: "dist/aws",
    target: "node24",
  },
});
