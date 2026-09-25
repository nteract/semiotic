import { expect, test } from "@playwright/test"

for (const vertical of [false, true]) {
  test(`Sankey ${vertical ? "vertical" : "horizontal"} canvas exposes real node and circular-flow values`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(
      `/network-examples/?sankey-values${vertical ? "&vertical" : ""}`
    )
    const frame = page.locator(".stream-network-frame")
    const tooltip = frame.locator(".stream-network-tooltip")
    const checkHover = async (moved = false) => {
      for (const [key, text] of [
        ["B", "Total: 100"],
        ["C-A", "Value: 25"]
      ]) {
        await expect
          .poll(() => page.evaluate((key) => window.sankeyTargets[key], key))
          .toBeTruthy()
        const target = await page.evaluate(
          (key) => window.sankeyTargets[key],
          key
        )
        await frame.hover({
          position: {
            x: 20 + target.x * (moved ? 0.9 : 1) + (moved ? 5 : 0),
            y: 20 + target.y * (moved ? 0.9 : 1) + (moved ? 5 : 0)
          }
        })
        await expect(tooltip).toContainText(text)
        const bounds = (await frame.boundingBox())!
        const tip = (await tooltip.boundingBox())!
        expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
        expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
        expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
        expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
        await page.mouse.move(0, 0)
        await expect(tooltip).toHaveCount(0)
      }
    }
    await checkHover()
    await page.getByRole("button", { name: "Resize Sankey" }).click()
    await checkHover()
    await page.getByRole("button", { name: "Zoom and pan Sankey" }).click()
    await checkHover(true)
    expect(errors).toEqual([])
  })
}
