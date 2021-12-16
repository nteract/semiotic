import { test, expect } from "@playwright/test"

test("my test", async ({ page }) => {
  await page.goto("/")

  await expect(page.locator("svg.visualization-layer").first()).toBeVisible()
})
