import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@db": path.resolve(__dirname, "src/db"),
      "@worker": path.resolve(__dirname, "worker"),
    },
  },
  server: {
    port: 8787,
  },
  build: {
    outDir: "dist",
  },
});
