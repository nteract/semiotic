import { PlaywrightTestConfig } from "@playwright/test"

export default {
  testDir: "integration-tests/",
  use: {
    headless: process.env.CI != null,
    screenshot: "on",
    baseURL: "http://localhost:1234"
  },
  projects: [
    {
      use: {
        browserName: "chromium",
        viewport: { width: 900, height: 800 }
      }
    }
  ],
  webServer: {
    command: "npm run serve-examples",
    port: 1234,
    timeout: 60 * 1000
  }
} as PlaywrightTestConfig
