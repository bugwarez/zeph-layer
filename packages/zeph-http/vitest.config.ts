import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/__tests__/**/*.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov"],
      exclude: ["**/test-utils/**"],
    },
  },
});
