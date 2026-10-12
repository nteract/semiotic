import { expect, test } from "@playwright/test"

test.use({ timezoneId: "Asia/Tokyo" })
test("distinguishes a local January 1 zero from a missing January 2 after resize", async ({
  page
}) => {
  await page.goto("/calendar-examples/")
  const frame = page.locator(".stream-xy-frame")
  const tooltip = frame.locator(".stream-frame-tooltip")
  for (const width of [640, 740]) {
    if (width === 740)
      await page.getByRole("button", { name: "Resize calendar" }).click()
    await expect(frame).toHaveCSS("width", `${width}px`)
    const bounds = (await frame.boundingBox())!
    const side = (width - 40 - 2 * 53) / 54
    for (const day of [1, 2, 3]) {
      await page.mouse.move(
        bounds.x + 20 + side / 2,
        bounds.y + 20 + (day + 2) * (side + 2) + side / 2
      )
      await expect(tooltip).toHaveText(
        `Jan ${day}: ${day === 2 ? "No measurement" : day === 1 ? "0" : "10"}`
      )
      const tip = (await tooltip.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
      expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
    }
    await page.mouse.move(850, 500)
    await expect(tooltip).toHaveCount(0)
  }
})
