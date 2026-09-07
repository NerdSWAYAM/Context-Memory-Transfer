import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.js";

export default mergeConfig(viteConfig, defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    envPrefix: ['VITE_', 'OPENROUTER_'],

    include: [
      "tests/**/*.test.ts"
    ],

    setupFiles: [
      "./tests/setup.ts"
    ],

    coverage: {
      provider: "v8",
      reporter: ["text", "html"]
    }
  }
}));