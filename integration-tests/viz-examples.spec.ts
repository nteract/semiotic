import { test, expect } from "@playwright/test"

test("legacy viz examples render", async ({ page }) => {
  await page.goto("/viz-examples/")

  // Wait for page to load
  await page.waitForTimeout(2000)

  // Check that at least one SVG visualization rendered
  const svgs = page.locator("svg.visualization-layer")
  const count = await svgs.count()
  expect(count).toBeGreaterThan(0)

  // Check that first SVG is visible
  await expect(svgs.first()).toBeVisible({ timeout: 10000 })
})
