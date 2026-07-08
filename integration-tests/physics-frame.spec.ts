import { test, expect } from "@playwright/test"
import { waitForChartReady, waitForRafs } from "./helpers"

const PHYSICS_CASES = [
  ["physics-galton-settled", "physics-galton-settled.png"],
  ["physics-eventdrop-settled", "physics-eventdrop-settled.png"],
  ["physics-pile-settled", "physics-pile-settled.png"],
] as const

test.describe("Physics charts - settled-state baselines", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/physics-examples/")
  })

  for (const [testId, snapshotName] of PHYSICS_CASES) {
    test(`renders ${testId}`, async ({ page }) => {
      await waitForChartReady(page, testId, { timeout: 15_000 })
      await waitForRafs(page, 2)
      const testCase = page.locator(`[data-testid="${testId}"]`)
      await expect(testCase).toHaveScreenshot(snapshotName, {
        maxDiffPixels: 200,
        timeout: 15_000,
      })
    })
  }
})
