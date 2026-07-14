import { PlaywrightTestConfig } from "@playwright/test"

export default {
  testDir: "integration-tests/",
  testMatch: "**/*.spec.ts",
  // The docs source route gate starts its own Vite server on :3000 and has an
  // explicit Chromium-only config. Do not run it through the three-browser
  // package integration suite on :1234 as well.
  testIgnore: [
    "**/docs-examples-source.spec.ts",
    // This companion evidence capture needs the docs Vite server on :3000,
    // and is exercised by the docs-specific Playwright configuration.
    "**/docs-examples-contract.spec.ts",
  ],
  // Local bootstrap may write a proposed missing baseline, but CI must never
  // create visual contracts during a test run: a new snapshot has to be
  // reviewed and committed before a pull request passes. An explicit
  // `--update-snapshots=missing` still supports the local bootstrap command.
  updateSnapshots: process.env.CI ? "none" : "missing",
  use: {
    headless: true, // Always run headless to avoid disrupting work
    screenshot: "on",
    baseURL: "http://localhost:1234"
  },
  // The visual suite is canvas-heavy and served through one Vite instance.
  // Higher worker counts can starve first-paint rAF callbacks under Chromium,
  // leaving axes/legends mounted while the data canvas is still blank.
  workers: 3,
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        viewport: { width: 900, height: 800 }
      }
    },
    {
      name: "firefox",
      use: {
        browserName: "firefox",
        viewport: { width: 900, height: 800 }
      }
    },
    {
      name: "webkit",
      use: {
        browserName: "webkit",
        viewport: { width: 900, height: 800 }
      }
    }
  ],
  webServer: {
    command: process.env.CI ? "npm run serve-examples:ci" : "npm run serve-examples",
    port: 1234,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI
  }
} as PlaywrightTestConfig
