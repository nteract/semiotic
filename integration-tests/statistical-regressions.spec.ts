import { expect, test } from "@playwright/test"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

const margin = { left: 20, right: 20, top: 40, bottom: 20 }
for (const orientation of ["vertical", "horizontal"]) {
  for (const input of ["bounded", "push"]) {
    for (const accessors of ["field", "callback"]) {
      test(`ordinal ${orientation} ${input} ${accessors} trends follow bars through resize and replacement`, async ({
        page
      }) => {
        const errors: string[] = []
        page.on("pageerror", (error) => errors.push(error.message))
        await page.goto(
          `/statistical-regressions/?family=ordinal&orientation=${orientation}&input=${input}&accessors=${accessors}`
        )
        await waitForChartReady(page, "ordinal-trend")
        const chart = page.getByTestId("ordinal-trend")
        const line = chart.locator('polyline[stroke="#d000a0"]')
        await expect(line).toHaveCount(1)
        const points = async () =>
          (await line.getAttribute("points"))!
            .split(" ")
            .map((point) => point.split(",").map(Number))
        const horizontal = orientation === "horizontal"
        for (const [width, offset] of [
          [500, 0],
          [380, 0],
          [380, 10]
        ]) {
          if (offset)
            await page.getByRole("button", { name: "Replace data" }).click()
          else if (width === 380)
            await page.getByRole("button", { name: "Resize charts" }).click()
          const plotWidth = width - 40
          const expected = [30, 20, 10].map((amount, i) =>
            horizontal
              ? [(plotWidth * (amount + offset)) / 100, (200 * (i + 0.5)) / 3]
              : [
                  (plotWidth * (i + 0.5)) / 3,
                  200 * (1 - (amount + offset) / 100)
                ]
          )
          await expect
            .poll(async () =>
              (await points()).map((p) => p.map((v) => Math.round(v * 1e5)))
            )
            .toEqual(expected.map((p) => p.map((v) => Math.round(v * 1e5))))
          const canvas = chart.locator("canvas").first()
          await expect(canvas).toHaveCSS("width", `${width}px`)
          for (const [i, region] of ["C", "A", "B"].entries()) {
            const amount = 30 - 10 * i + offset
            // Hover inside the painted bar, away from its trend-line endpoint.
            await canvas.hover({
              position: {
                x:
                  20 +
                  (horizontal ? (plotWidth * amount) / 200 : expected[i][0]),
                y: 40 + (horizontal ? expected[i][1] : 200 * (1 - amount / 200))
              }
            })
            await expect(chart.locator(".stream-ordinal-tooltip")).toHaveText(
              `${region}: ${amount}`
            )
            await expectTooltipWithinPlot(chart, margin)
            await page.mouse.move(0, 0)
            await expect(chart.locator(".stream-ordinal-tooltip")).toBeHidden()
          }
        }
        expect(errors).toEqual([])
      })
    }
  }
}
for (const input of ["bounded", "push"]) {
  for (const accessors of ["field", "callback"]) {
    test(`${input} ${accessors} trends and grouped forecasts retain correct geometry and hover`, async ({
      page
    }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(
        `/statistical-regressions/?input=${input}&accessors=${accessors}`
      )
      await waitForChartReady(page, "trend")
      await waitForChartReady(page, "forecast")
      const trend = page.getByTestId("trend")
      const forecast = page.getByTestId("forecast")
      const polyline = trend.locator('polyline[stroke="#d000a0"]')
      await expect(polyline).toHaveCount(1)
      const readTrend = async () =>
        (await polyline.getAttribute("points"))!
          .split(" ")
          .map((p) => p.split(",").map(Number))
      const points = await readTrend()
      expect(points).toHaveLength(5)
      expect(points[0][1]).toBeCloseTo(180, 5)
      expect(points[4][1]).toBeCloseTo(140, 5)
      await expect(forecast.getByText("Forecast", { exact: true })).toHaveCount(
        2
      )
      await page.getByRole("button", { name: "Rerender parent" }).click()
      await expect(forecast.getByText("Forecast", { exact: true })).toHaveCount(
        2
      )
      for (const width of [500, 380]) {
        if (width === 380)
          await page.getByRole("button", { name: "Resize charts" }).click()
        for (const [chart, index, amount, text] of [
          [trend, 2, 20, "Day 2: 20"],
          [forecast, 5, 35, "Up: 35"],
          [forecast, 5, 65, "Down: 65"]
        ] as const) {
          const canvas = chart.locator("canvas").first()
          await expect(canvas).toHaveCSS("width", `${width}px`)
          await canvas.hover({
            position: {
              x: 20 + ((width - 40) * index) / 6,
              y: 40 + 200 * (1 - amount / 100)
            }
          })
          await expect(chart.locator(".stream-frame-tooltip")).toHaveText(text)
          await expectTooltipWithinPlot(chart, margin)
          await page.mouse.move(0, 0)
          await expect(chart.locator(".stream-frame-tooltip")).toBeHidden()
        }
      }
      await page.getByRole("button", { name: "Replace data" }).click()
      await expect
        .poll(async () => (await readTrend())[0][1])
        .toBeCloseTo(160, 5)
      const canvas = trend.locator("canvas").first()
      await canvas.hover({
        position: { x: 20 + (340 * 2) / 6, y: 40 + 200 * 0.7 }
      })
      await expect(trend.locator(".stream-frame-tooltip")).toHaveText(
        "Day 2: 30"
      )
      await expectTooltipWithinPlot(trend, margin)
      await page.mouse.move(0, 0)
      await expect(trend.locator(".stream-frame-tooltip")).toBeHidden()
      await expect(forecast.getByText("Forecast", { exact: true })).toHaveCount(
        2
      )
      for (const [amount, text] of [
        [45, "Up: 45"],
        [75, "Down: 75"]
      ] as const) {
        await forecast
          .locator("canvas")
          .first()
          .hover({
            position: {
              x: 20 + (340 * 5) / 6,
              y: 40 + 200 * (1 - amount / 100)
            }
          })
        await expect(forecast.locator(".stream-frame-tooltip")).toHaveText(text)
        await expectTooltipWithinPlot(forecast, margin)
        await page.mouse.move(0, 0)
        await expect(forecast.locator(".stream-frame-tooltip")).toBeHidden()
      }
      expect(errors).toEqual([])
    })
  }
}
