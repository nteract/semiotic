import { expect, test } from "@playwright/test"

test(`chord contributors survive canvas hover, resize and camera changes`, async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/network-examples/?chord-values")
  const frame = page.locator(".stream-network-frame")
  const tooltip = frame.locator(".stream-network-tooltip")
  const hoverRibbon = async () => {
    const bounds = (await frame.boundingBox())!
    await frame.hover({
      position: { x: bounds.width * 0.55, y: bounds.height * 0.55 }
    })
    await expect(tooltip).toHaveText(
      "Connections: 3A → B: 30A → B: 60B → A: 20"
    )
    const tip = (await tooltip.boundingBox())!
    expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
    expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
    expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
    expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
    await page.mouse.move(0, 0)
    await expect(tooltip).toHaveCount(0)
  }
  await hoverRibbon()
  await page.getByRole("button", { name: "Resize chord" }).click()
  await hoverRibbon()
  await page.getByRole("button", { name: "Zoom and pan chord" }).click()
  await hoverRibbon()
  await page.getByRole("button", { name: "Zero values" }).click()
  await frame.hover({ position: { x: 175, y: 175 } })
  await expect(tooltip).toHaveCount(0)
  expect(errors).toEqual([])
})
