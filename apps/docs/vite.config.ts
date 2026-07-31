import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  base: "/docs/",
  plugins: [react(), tailwindcss()],
  server: { port: 5175, strictPort: true },
});
