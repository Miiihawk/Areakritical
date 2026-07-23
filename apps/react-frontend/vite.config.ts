import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Honor a harness-assigned PORT when present; otherwise fall back to Vite's default.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
    proxy: {
      // Forward API calls to the GameRetro.Api backend (its http dev URL, per launchSettings.json)
      "/api": {
        target: "http://localhost:5121",
        changeOrigin: true,
      },
    },
  },
});
