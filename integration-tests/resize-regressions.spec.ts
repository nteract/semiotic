import { expect, test, type Locator } from "@playwright/test"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

const margin = { left: 40, right: 20, top: 40, bottom: 20 }

async function expectGreenMark(canvas: Locator, x: number, y: number) {
  await expect
    .poll(() =>
      canvas.evaluate(
        (element, point) => {
          const c = element as HTMLCanvasElement
          const box = c.getBoundingClientRect()
          const ctx = c.getContext("2d")!
          const [r, g, b, a] = ctx.getImageData(
            Math.round((point.x * c.width) / box.width),
            Math.round((point.y * c.height) / box.height),
            1,
            1
          ).data
          return g > r * 1.5 && g > b * 1.2 && a > 100
        },
        { x, y }
      )
    )
    .toBe(true)
}

for (const kind of ["scatter", "symbols", "line"]) {
  for (const input of ["bounded", "push"]) {
    test(`${kind} ${input} marks and hover survive interrupted resize`, async ({
      page
    }) => {
      const errors: string[] = []
      page.on("pageerror", (error) => errors.push(error.message))
      await page.goto(`/resize-regressions/?kind=${kind}&input=${input}`)
      await waitForChartReady(page, "chart")
      const chart = page.getByTestId("chart")
      const canvas = chart.locator("canvas").first()
      const tooltip = chart.locator(".stream-frame-tooltip")
      await page.getByRole("button", { name: "Update and resize" }).click()
      await expect(page.getByTestId("phase")).toHaveText("resized")
      for (const width of [380, 500]) {
        if (width === 500)
          await page.getByRole("button", { name: "Restore width" }).click()
        await expect(canvas).toHaveCSS("width", `${width}px`)
        const x = margin.left + ((width - 60) * 9) / 99
        const y = margin.top + 200 * 0.4
        await expectGreenMark(canvas, x, y)
        await canvas.hover({ position: { x, y } })
        await expect(tooltip).toContainText("Alpha: 10, 6")
        await expectTooltipWithinPlot(chart, margin)
        await page.mouse.move(0, 0)
        await expect(tooltip).toBeHidden()
      }
      expect(errors).toEqual([])
    })
  }
}

test("streaming log scales retain reversed direction through resize", async ({
  page
}) => {
  await page.goto("/resize-regressions/?input=push&scale=log&direction=left")
  await waitForChartReady(page, "chart")
  await page.getByRole("button", { name: "Update and resize" }).click()
  await expect(page.getByTestId("phase")).toHaveText("resized")
  const chart = page.getByTestId("chart")
  const canvas = chart.locator("canvas").first()
  await expectGreenMark(canvas, 200, 120)
  await canvas.hover({ position: { x: 200, y: 120 } })
  await expect(chart.locator(".stream-frame-tooltip")).toContainText(
    "Alpha: 10, 6"
  )
  await expectTooltipWithinPlot(chart, margin)
  await page.mouse.move(0, 0)
  await expect(chart.locator(".stream-frame-tooltip")).toBeHidden()
})

test("fixed-size chart remains painted when the viewport changes its DPR cap", async ({
  browser
}) => {
  const context = await browser.newContext({
    deviceScaleFactor: 4,
    viewport: { width: 1000, height: 900 }
  })
  const page = await context.newPage()
  try {
    await page.goto("/resize-regressions/?kind=symbols")
    await waitForChartReady(page, "chart")
    const chart = page.getByTestId("chart")
    const canvas = chart.locator("canvas").first()
    await expect(canvas).toHaveAttribute("width", "1500")
    await page.setViewportSize({ width: 700, height: 900 })
    await expect(canvas).toHaveAttribute("width", "1000")
    const x = margin.left + (440 * 3) / 99
    const y = margin.top + 140
    await expectGreenMark(canvas, x, y)
    await canvas.hover({ position: { x, y } })
    await expect(chart.locator(".stream-frame-tooltip")).toContainText(
      "Alpha: 4, 3"
    )
    await expectTooltipWithinPlot(chart, margin)
    await page.mouse.move(0, 0)
    await expect(chart.locator(".stream-frame-tooltip")).toBeHidden()
  } finally {
    await context.close()
  }
})
