import { PlaywrightTestConfig } from "@playwright/test"

export default {
  testDir: "integration-tests/",
  testMatch: "**/*.spec.ts",
  // Default to "missing" so a fresh OS×browser combination writes its
  // baseline on first run instead of failing. Existing baselines still
  // gate as regressions — diffs above `maxDiffPixels` fail loudly. The
  // CI workflow uploads `playwright-snapshots/` regardless of pass/fail
  // so maintainers can periodically commit the freshly-written
  // baselines to make the gate denser. Override with
  // `PWTEST_UPDATE_SNAPSHOTS=none` (or `--update-snapshots=none`) for a
  // strict pre-release pass.
  updateSnapshots: "missing",
  use: {
    headless: true, // Always run headless to avoid disrupting work
    screenshot: "on",
    baseURL: "http://localhost:1234"
  },
  // The visual suite is canvas-heavy and served through one Parcel instance.
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
