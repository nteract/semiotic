import { expect, test } from "@playwright/test"

for (const chart of ["BoxPlot", "ViolinPlot", "RidgelinePlot", "CandlestickChart", "FunnelChart", "FlowMap"]) {
    test(`${chart} canvas keyboard targets expose the same content as pointer targets`, async ({ page }) => {
      await page.goto(`/accessibility-examples/?keyboard-marks=${chart}`)
      const frame = page.locator('.stream-ordinal-frame, .stream-xy-frame, .stream-geo-frame')
      const live = frame.locator('[aria-live="polite"]')
      const tooltip = frame.locator('.stream-ordinal-tooltip, .stream-frame-tooltip, .stream-geo-tooltip')
      const pathTarget = chart === "FlowMap" || chart === "FunnelChart"
      const ring = frame.locator(`svg[aria-hidden="true"] ${pathTarget ? "path" : "rect"}[stroke-dasharray]`)
      const expected = chart === "CandlestickChart" ? /Open.*20/
        : chart === "FlowMap" ? /75/
          : chart === "FunnelChart" ? /Awareness|Purchase/
            : /Median: 30/
      const expectedLive = chart === "CandlestickChart" ? "close: 30"
        : chart === "FlowMap" ? "value: 75"
          : chart === "FunnelChart" ? /Awareness|Purchase/
            : "median: 30"

      const check = async () => {
        await frame.focus()
        await page.keyboard.press("Home")
        if (pathTarget) {
          for (let index = 0; index < 5 && await ring.count() === 0; index++) {
            await page.keyboard.press(chart === "FlowMap" ? "ArrowRight" : "PageDown")
          }
        }
        await expect(tooltip).toContainText(expected)
        await expect(live).toContainText(expectedLive)
        const bounds = (await frame.boundingBox())!
        if (chart === "BoxPlot" || chart === "CandlestickChart") {
          // Resize commits before the retained scene's next paint. Keyboard
          // focus must follow that paint to the fixture's single column center.
          await expect.poll(async () => {
            const box = (await ring.boundingBox())!
            return Math.abs(box.x + box.width / 2 - (bounds.x + 60 + (bounds.width - 80) / 2))
          }).toBeLessThan(1)
        }
        const focus = (await ring.boundingBox())!
        expect(focus.width).toBeGreaterThan(0)
        // Remember a real focused mark location, then exercise the pointer path.
        const point = { x: focus.x + focus.width / 2 - bounds.x, y: focus.y + focus.height / 2 - bounds.y }
        await page.keyboard.press("Escape")
        await expect(live).toBeEmpty()
        await expect(tooltip).toHaveCount(0)
        await frame.hover({ position: point })
        await expect(tooltip).toContainText(expected)
        const tip = (await tooltip.boundingBox())!
        expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
        expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
        expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
        expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
        await page.mouse.move(0, 0)
        await expect(tooltip).toHaveCount(0)
        await expect(live).toBeEmpty()
      }
      await check()
      await page.getByRole("button", { name: "Narrow marks" }).click()
      await check()
    })
}
