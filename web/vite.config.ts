import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Use VITE_BASE_PATH env var, default to root for local dev
  base: process.env.VITE_BASE_PATH || "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true, // Allow external access (needed for ngrok)
    hmr: {
      clientPort: 443, // Use HTTPS port for HMR through ngrok
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
