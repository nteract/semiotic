import { defineConfig } from "@playwright/test"

// Production React (optional profiling), one worker, and CDP CPU throttling. Keep
// these measurements separate from the development/three-browser suite.
const mode =
  process.env.NETWORK_CAMERA_PROFILE === "1" ? "profiling" : "production"
export default defineConfig({
  testDir: "integration-tests",
  testMatch: [
    "network-camera-scale.spec.ts",
    "network-edge-hit-bounds.spec.ts",
    "network-edge-performance.spec.ts"
  ],
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  timeout: 120_000,
  globalTimeout: 15 * 60 * 1000,
  outputDir: `test-results/network-camera/${mode}`,
  reporter: [
    ["list"],
    ["json", { outputFile: `test-results/network-camera/${mode}.json` }]
  ],
  use: {
    browserName: "chromium",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    baseURL: "http://127.0.0.1:1243",
    screenshot: "only-on-failure"
  },
  webServer: {
    command:
      "npx vite build --config vite.network-camera.config.mjs && npx vite preview --config vite.network-camera.config.mjs",
    port: 1243,
    timeout: 120_000,
    reuseExistingServer: false
  }
})
