import { PlaywrightTestConfig } from "@playwright/test"

export default {
  testDir: "integration-tests/",
  testMatch: "**/*.spec.ts",
  // The docs source route gate starts its own Vite server on :3000 and has an
  // explicit Chromium-only config. Do not run it through the three-browser
  // package integration suite on :1234 as well.
  testIgnore: [
    // Docs examples have their own Vite application and Chromium-only config.
    "**/docs-examples-*.spec.ts",
  ],
  // Visual baselines are reviewed contracts, so ordinary local and CI runs
  // must never create them as a side effect. The explicit visual bootstrap
  // and update commands override this setting when a maintainer intends to
  // write proposed baselines.
  updateSnapshots: "none",
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
