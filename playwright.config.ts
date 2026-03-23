import { PlaywrightTestConfig } from "@playwright/test"

export default {
  testDir: "integration-tests/",
  testMatch: "**/*.spec.ts",
  // Platform-agnostic snapshots — headless Chromium renders identically on macOS and Linux
  snapshotPathTemplate: "{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}-{projectName}{ext}",
  use: {
    headless: true, // Always run headless to avoid disrupting work
    screenshot: "on",
    baseURL: "http://localhost:1234"
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 900, height: 800 }
      }
    }
  ],
  webServer: {
    command: "npm run serve-examples",
    port: 1234,
    timeout: 60 * 1000,
    reuseExistingServer: !process.env.CI
  }
} as PlaywrightTestConfig
