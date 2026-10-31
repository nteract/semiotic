import { expect, test } from "@playwright/test"
import { hoverCanvasMark } from "./helpers/hoverCanvasMark"
import { collectBrowserErrors } from "./helpers/browser"

test.beforeEach(async ({ page }) => {
  await page.goto("/chart-features-examples/?size-encoding")
})

for (const chart of ["swarm", "quadrant", "map"]) {
  test(`${chart} scales and hovers a pushed size encoding after resize`, async ({
    page
  }, info) => {
    const errors = collectBrowserErrors(page)
    await page
      .getByRole("button", { name: "Push observation", exact: true })
      .click()
    const host = page.getByTestId(`size-${chart}`)
    const canvas = host.locator("canvas").first()
    for (const width of [360, 260, 260]) {
      if (width === 260)
        await page
          .getByRole("button", { name: "Resize encoded charts" })
          .click()
      await expect
        .poll(async () => (await canvas.boundingBox())?.width)
        .toBe(width)
      await hoverCanvasMark(canvas, [18, 84, 171])
      const tooltip = host
        .locator('[class*="tooltip"]')
        .filter({ hasText: "Observation 50000" })
        .first()
      await expect(tooltip).toBeVisible()
      const tip = (await tooltip.boundingBox())!
      const bounds = (await host.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(bounds.x - 1)
      expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1)
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)
      if (width === 260)
        await page.getByRole("button", { name: "Toggle chart theme" }).click()
    }
    const frame = host.locator('[tabindex="0"]').first()
    await frame.focus()
    await frame.press("Home")
    await expect(
      host
        .locator('[class*="tooltip"]')
        .filter({ hasText: "Observation 50000" })
        .first()
    ).toBeVisible()
    await frame.press("Escape")
    await expect(
      host
        .locator('[class*="tooltip"]')
        .filter({ hasText: "Observation 50000" })
    ).toHaveCount(0)
    if (chart === "quadrant")
      await page.screenshot({
        path: info.outputPath("size-encoding.png"),
        fullPage: true
      })
    expect(errors).toEqual([])
  })
}

test("a zero-hole donut paints and hovers at its center", async ({ page }) => {
  const host = page.getByTestId("zero-hole-donut")
  const canvas = host.locator("canvas").first()
  await canvas.scrollIntoViewIfNeeded()
  await expect
    .poll(() =>
      canvas.evaluate((element: HTMLCanvasElement) => {
        const [r, g, b, a] = element
          .getContext("2d")!
          .getImageData(element.width / 2, element.height / 2, 1, 1).data
        return [r, g, b, a]
      })
    )
    .toEqual([18, 84, 171, 255])
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  const tooltip = host
    .locator('[class*="tooltip"]')
    .filter({ hasText: "Filled donut observation" })
    .first()
  await expect(tooltip).toBeVisible()
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
})
