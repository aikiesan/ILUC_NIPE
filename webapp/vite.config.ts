/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// GitHub Pages project site is served from /ILUC_NIPE/.
// Build output goes to the repository-root /docs folder (Pages source = /docs).
export default defineConfig({
  base: "/ILUC_NIPE/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../docs",
    emptyOutDir: true,
    chunkSizeWarningLimit: 4000,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
