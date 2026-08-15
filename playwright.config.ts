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
  // CI's default dot reporter hides the active test and makes a slow tail look
  // hung. Keep a named completion log plus GitHub failure annotations instead.
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  // Keep the existing resource-safe worker ceiling while allowing independent
  // tests from a large spec to fill an idle worker. Specs with shared output
  // opt into serial mode themselves.
  fullyParallel: true,
  // A healthy per-browser visual run takes under six minutes. This preserves
  // ample cold-start headroom but turns a wedged suite into an actionable
  // failure with artifacts rather than consuming the job's six-hour default.
  globalTimeout: process.env.CI ? 20 * 60 * 1000 : undefined,
  reportSlowTests: {
    max: 10,
    threshold: 15_000
  },
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
