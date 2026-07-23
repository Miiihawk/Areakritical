// TEMPORARY config for agent-session verification only — proxies /api to the
// verification backend instance on port 5223 instead of the normal dev port 5121.
// Safe to delete; the real config is vite.config.ts.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    proxy: {
      "/api": {
        target: "http://localhost:5223",
        changeOrigin: true,
      },
    },
  },
});
