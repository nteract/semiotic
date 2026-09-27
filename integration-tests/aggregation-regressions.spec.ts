import { expect, test } from "@playwright/test"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

const margin = { left: 40, right: 20, top: 40, bottom: 20 }
for (const adapter of ["vega", "flint"]) {
  for (const input of ["bounded", "push"]) {
    test(`${adapter} ${input} preserves aggregate series, positions, counts, and hover`, async ({
      page
    }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(
        `/aggregation-regressions/?adapter=${adapter}&input=${input}`
      )
      for (const id of ["bars", "lines", "histogram"])
        await waitForChartReady(page, id)
      for (const width of [500, 380]) {
        if (width === 380)
          await page.getByRole("button", { name: "Resize charts" }).click()
        for (const [id, x, y, expected] of [
          ["bars", (width - 60) / 2, 200 * (1 - 1.5 / 12), "First: 3"],
          ["bars", (width - 60) / 2, 200 * (1 - 6 / 12), "Second: 6"],
          ["lines", ((width - 60) * 2) / 12, 200 * (1 - 3 / 12), "First: 3"],
          ["lines", ((width - 60) * 10) / 12, 200 * (1 - 6 / 12), "Second: 6"],
          ["histogram", (width - 60) * 0.25, 170, "Count: 5"],
          ["histogram", (width - 60) * 0.75, 170, "Count: 1"]
        ] as const) {
          const chart = page.getByTestId(id)
          const canvas = chart.locator("canvas").first()
          await expect(canvas).toHaveCSS("width", `${width}px`)
          await canvas.hover({
            position: { x: margin.left + x, y: margin.top + y }
          })
          await expect(
            chart.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
          ).toContainText(expected)
          await expectTooltipWithinPlot(chart, margin)
          await page.mouse.move(0, 0)
          await expect(
            chart.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
          ).toBeHidden()
        }
      }
      await page.getByRole("button", { name: "Replace data" }).click()
      const chart = page.getByTestId("lines")
      await chart
        .locator("canvas")
        .first()
        .hover({
          position: { x: 40 + (320 * 2) / 12, y: 40 + 200 * (1 - 4 / 12) }
        })
      await expect(chart.locator(".stream-frame-tooltip")).toHaveText(
        "First: 4"
      )
      await expectTooltipWithinPlot(chart, margin)
      await page.mouse.move(0, 0)
      await expect(chart.locator(".stream-frame-tooltip")).toBeHidden()
      expect(errors).toEqual([])
    })
  }
}
