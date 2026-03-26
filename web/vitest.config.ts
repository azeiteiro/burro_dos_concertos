import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    // Increase timeout for tests with animations
    testTimeout: 10000,
    // Don't fail on unhandled errors from async UI library timers
    dangerouslyIgnoreUnhandledErrors: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json", "lcov"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.config.*",
        "**/dist/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
