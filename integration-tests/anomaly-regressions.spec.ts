import { expect, test } from "@playwright/test"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

for (const accessors of ["field", "callback"]) {
  for (const [chartType, input] of [["line", "flat"], ["line", "nested"], ["area", "nested"]]) {
    test(`${chartType} ${input} ${accessors} anomaly dots match tooltips after resize`, async ({ page }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(`/statistical-regressions/?family=anomaly&chart=${chartType}&input=${input}&accessors=${accessors}`)
      await waitForChartReady(page, "anomaly")
      const chart = page.getByTestId("anomaly")
      const dot = chart.locator('circle[fill="#ef4444"]')
      await expect(dot).toHaveCount(1)
      for (const width of [500, 380]) {
        if (width === 380) await page.getByRole("button", { name: "Resize charts" }).click()
        const canvas = chart.locator("canvas").first()
        await expect(canvas).toHaveCSS("width", `${width}px`)
        await expect(dot).toHaveAttribute("cx", String((width - 40) * 4 / 5))
        await expect(dot).toHaveAttribute("cy", "150")
        for (const [x, y, text] of [
          [4, 0, "Measurements: 0; anomaly: true"],
          [2, 10, "Measurements: 10; anomaly: false"],
        ] as const) {
          await canvas.hover({ position: { x: 20 + (width - 40) * x / 5, y: 40 + (15 - y) * 10 } })
          await expect(chart.locator(".stream-frame-tooltip")).toHaveText(text)
          await expectTooltipWithinPlot(chart, { left: 20, right: 20, top: 40, bottom: 20 })
          await page.keyboard.press("Escape")
          await expect(chart.locator(".stream-frame-tooltip")).toBeHidden()
          await page.mouse.move(0, 0)
          await expect(chart.locator(".stream-frame-tooltip")).toBeHidden()
        }
      }
      expect(errors).toEqual([])
    })
  }
}
