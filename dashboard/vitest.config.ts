import { defineConfig } from "vitest/config";
import path from "node:path";

// Unit tests run in Node (the MQL parser/router is pure TS with no DOM deps).
// The build (`tsc && vite build`) excludes test files, so they live outside the
// production typecheck and only run under `npm test`.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
