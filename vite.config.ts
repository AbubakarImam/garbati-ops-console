/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// DESIGN.md Section 6 / Garbati.OpsApi/docs/DESIGN.md 2.1b: the dev server proxies /v1/ops/* straight
// to a locally-running OpsApi so the browser sees same-origin requests in dev exactly as it will in
// production (served by OpsApi itself) - no CORS code path is ever needed, in any environment, and the
// SameSite=Strict session cookie behaves identically to production. OpsApi's own docker-compose port
// (garbati-platform T-038, docker-compose.yml) is 5400.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/v1/ops": {
        target: "http://localhost:5400",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
