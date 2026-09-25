import { expect, test } from "@playwright/test"

for (const chart of ["PieChart", "DonutChart", "GaugeChart"]) {
  test(`${chart} canvas exposes values during pointer and keyboard interaction`, async ({
    page
  }) => {
    await page.goto(`/accessibility-examples/?radial=${chart}`)
    const frame = page.locator(".stream-ordinal-frame")
    const live = frame.locator('[aria-live="polite"]')
    const tooltip = frame.locator(".stream-ordinal-tooltip")

    const checkHover = async () => {
      const bounds = (await frame.boundingBox())!
      // Right-hand radial surface, near the outer edge and away from seams.
      await frame.hover({
        position: {
          x: bounds.width / 2 + Math.min(bounds.width, 300) / 2 - 15,
          y: 150
        }
      })
      await expect(live).toContainText(
        chart === "GaugeChart" ? "value: 65" : "value: 30"
      )
      await expect(tooltip).toContainText(chart === "GaugeChart" ? "65" : "30")
      const tip = (await tooltip.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
      expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
      expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
      await page.mouse.move(0, 0)
      await expect(live).toBeEmpty()
      await expect(tooltip).toHaveCount(0)
    }

    await checkHover()
    await page.getByRole("button", { name: "Narrow chart" }).click()
    await checkHover()
    await frame.focus()
    await page.keyboard.press("Home")
    await expect(live).toContainText("category:")
    await expect(live).toContainText(
      chart === "GaugeChart" ? "value: 65" : "value:"
    )
    await page.keyboard.press("Escape")
    await expect(live).toBeEmpty()

    const trigger = frame.getByRole("button", {
      name: "View data summary (2 elements)"
    })
    await trigger.focus()
    await page.keyboard.press("Enter")
    await expect(frame.locator("tbody tr")).toHaveCount(2)
    await expect(
      frame.getByRole("columnheader", { name: "value", exact: true })
    ).toHaveText("value")
    await expect(frame.locator("tbody")).toContainText(
      chart === "GaugeChart" ? "65" : "30"
    )
    await expect(frame.locator("tbody")).toContainText(
      chart === "GaugeChart" ? "100" : "70"
    )
  })
}
