import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    // Real network fetches — no mocking. Keep retries low so flakes surface.
    trace: "retain-on-failure",
  },
});
