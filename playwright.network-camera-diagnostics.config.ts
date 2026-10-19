import { defineConfig } from "@playwright/test"
import camera from "./playwright.network-camera.config"

if (process.env.NETWORK_CAMERA_PROFILE === "1")
  throw new Error("CPU diagnostics replay production React only")

// A separate invocation starts only after the acceptance report is saved.
// Its profiler, source maps and output cannot contaminate acceptance samples.
export default defineConfig({
  ...camera,
  testMatch: "network-camera-diagnostics.spec.ts",
  outputDir: "test-results/network-camera/diagnostics",
  reporter: [["list"]],
  webServer: {
    ...camera.webServer,
    command:
      "npx vite build --config vite.network-camera.config.mjs --sourcemap && npx vite preview --config vite.network-camera.config.mjs"
  }
})
