import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// GitHub Pages serves from /<repo>/. Set BASE_PATH=/Steam-Opportunity-Finder/ in
// the Pages workflow. Vercel serves from root, so BASE_PATH stays "/".
const base = process.env.BASE_PATH ?? "/";
const root = import.meta.dirname;

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(root, "src"),
      "@shared": path.resolve(root, "src/types"),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
