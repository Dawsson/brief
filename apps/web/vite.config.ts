import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";

export default defineConfig({
  build: {
    // Pier's Lambda adapter serves text responses; keep font assets inside the CSS bundle.
    assetsInlineLimit: 1_000_000,
  },
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
});
