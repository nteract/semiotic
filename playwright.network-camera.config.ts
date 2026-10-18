import { defineConfig } from "@playwright/test"

// Production React with profiling, one worker, and CDP CPU throttling. Keep
// these measurements separate from the development/three-browser suite.
export default defineConfig({
  testDir: "integration-tests",
  testMatch: ["network-camera-scale.spec.ts", "network-edge-hit-bounds.spec.ts", "network-edge-performance.spec.ts"],
  workers: 1,
  timeout: 120_000,
  reporter: "list",
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
