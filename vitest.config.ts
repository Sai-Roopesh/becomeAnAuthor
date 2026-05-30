import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: "./frontend/vitest.setup.ts",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "frontend/test/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
      ],
    },
    exclude: ["node_modules", "e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./frontend"),
      // Stub Tauri runtime plugins that don't exist in the test environment
      "@tauri-apps/plugin-log": path.resolve(
        __dirname,
        "./frontend/test/__mocks__/tauri-plugin-log.ts",
      ),
    },
  },
});
