/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// Same shape as production: the app calls /api on its own origin and the dev
// server forwards it to the API (nginx does this in Docker).
const apiProxy = {
  "/api": {
    target: process.env.API_PROXY_TARGET ?? "http://localhost:8787",
    rewrite: (path: string) => path.replace(/^\/api/, ""),
  },
};

export default defineConfig({
  plugins: [vue()],
  server: { port: 5173, proxy: apiProxy },
  preview: { proxy: apiProxy },
  build: { sourcemap: false },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
