import { defineConfig } from "@playwright/test";

const localURL = "http://127.0.0.1:3000";
const baseURL = process.env.APP_TEST_URL ?? localURL;

export default defineConfig({
  webServer: baseURL === localURL ? {
    command: "npm run start -- --hostname 127.0.0.1",
    url: `${localURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: { APP_URL: localURL, AUTH_SECRET: "local-test-only-not-a-production-secret", AUTH_TRUST_HOST: "true" },
  } : undefined,
  testDir: "./e2e",
  timeout: 30_000,
  use: {
    baseURL,
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
