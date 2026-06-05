import { defineConfig, devices } from "@playwright/test";

// Mobile-first: Standard-Projekt emuliert ein Smartphone.
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
  },
  projects: [
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
