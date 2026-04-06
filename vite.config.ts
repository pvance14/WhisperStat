import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    port: 5173,
    // Keep local URL stable so Supabase auth redirects (5173 in supabase/config.toml + .env) match.
    strictPort: true
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "icon.svg", "apple-touch-icon.svg"],
      devOptions: {
        enabled: true,
        suppressWarnings: true
      },
      manifest: {
        name: "WhisperStat",
        short_name: "WhisperStat",
        description: "Voice-first volleyball stat tracking for fast, eyes-up coaching.",
        theme_color: "#102033",
        background_color: "#f4f7f8",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/apple-touch-icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src")
    }
  }
});
