import { defineConfig } from "@playwright/test"

/**
 * Docs examples intentionally run against Vite's source aliases. This is a
 * separate server from the package integration harness so the route smoke
 * test proves that the authored docs stories themselves can mount, while the
 * pack smoke test exercises the published artifact.
 */
export default defineConfig({
  testDir: "./integration-tests",
  testMatch: "docs-examples-source.spec.ts",
  // Eight cold lazy docs routes per serial batch. A few stories pull large
  // topology/sprite modules on their first transform, so leave constrained CI
  // runners room to finish a legitimate cold compile without turning a hung
  // route into an unbounded whole-suite wait.
  timeout: 180_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    browserName: "chromium",
    headless: true,
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    // The test captures browser console errors itself. Keep Vite's mirrored
    // development warnings out of CI logs so intentional legacy-layout
    // diagnostics do not bury an actionable route failure.
    command: "npm run docs:dev -- --logLevel error --strictPort",
    url: "http://127.0.0.1:3000",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
})
