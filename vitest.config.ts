import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      lines: 70,
      functions: 70,
      branches: 55,
      statements: 70,
    },
  },
});
