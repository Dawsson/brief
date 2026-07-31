import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: ["src/index.ts"],
    dts: { eager: true },
    deps: {
      alwaysBundle: ["@brief/core"],
      dts: { alwaysBundle: ["@brief/core"] },
    },
    format: ["esm"],
  },
});
