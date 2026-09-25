import { test, expect, type Locator, type Page } from "@playwright/test"
import { expectTooltipWithinPlot } from "./helpers"

const margin = { top: 48, right: 20, bottom: 80, left: 52 }

async function pixels(chart: Locator) {
  return chart
    .locator("canvas[aria-label]")
    .evaluate((canvas: HTMLCanvasElement) => {
      const box = canvas.getBoundingClientRect()
      const context = canvas.getContext("2d")!
      return [
        [3, 7],
        [4, 10],
        [3.5, 8.5],
        [5, 12]
      ].map((values, column) =>
        values.map((value) =>
          Array.from(
            context.getImageData(
              Math.floor(
                ((52 + ((box.width - 72) * (column + 0.5)) / 4) *
                  canvas.width) /
                  box.width
              ),
              Math.floor(
                ((48 + (340 - 128) * (1 - value / 16)) * canvas.height) /
                  box.height
              ),
              1,
              1
            ).data
          )
        )
      )
    })
}

async function hoverSegment(page: Page, chart: Locator, value: number) {
  const box = (await chart.locator("canvas").first().boundingBox())!
  await page.mouse.move(
    box.x + 52 + (box.width - 72) / 8,
    box.y + 48 + (340 - 128) * (1 - value / 16)
  )
}

test("histogram docs combine horizontal grids with whole-column hover", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/charts/realtime-histogram#grid-and-hover")
  const demo = page.getByRole("region", {
    name: "Histogram grid and hover example"
  })
  const chart = demo.locator(".stream-xy-frame")
  const tooltip = chart.locator(".stream-frame-tooltip")
  await chart.scrollIntoViewIfNeeded()
  await expect
    .poll(async () => (await pixels(chart))[0])
    .toEqual([
      [37, 99, 235, 255],
      [217, 119, 6, 255]
    ])
  const baseline = await pixels(chart)
  const lines = chart.locator(".stream-grid line")
  expect(await lines.count()).toBeGreaterThan(0)
  expect(
    await lines.evaluateAll((nodes) =>
      nodes.every(
        (line) =>
          line.getAttribute("y1") === line.getAttribute("y2") &&
          line.getAttribute("x1") !== line.getAttribute("x2")
      )
    )
  ).toBe(true)
  await expect(demo.locator("pre")).toContainText('from "semiotic/realtime"')
  await expect(demo.locator("pre")).toContainText("showGrid")
  await expect(demo.locator("pre")).toContainText("hoverHighlight")
  await expect(demo.locator("pre")).toContainText(
    'orient: "bottom", label: "Time", grid: false'
  )

  const expectColumnHighlight = async () => {
    await expect.poll(async () => (await pixels(chart))[0]).toEqual(baseline[0])
    await expect
      .poll(async () => {
        const current = await pixels(chart)
        return current
          .slice(1)
          .every((segments, index) =>
            segments.every(
              (pixel, segment) =>
                JSON.stringify(pixel) !==
                JSON.stringify(baseline[index + 1][segment])
            )
          )
      })
      .toBe(true)
    await expect(tooltip).toContainText("range:0–10")
    await expect(tooltip).toContainText("count:8")
    await expectTooltipWithinPlot(chart, margin)
  }
  await hoverSegment(page, chart, 3)
  await expectColumnHighlight()
  await expect(tooltip).toContainText("category:Completed")
  await hoverSegment(page, chart, 7)
  await expectColumnHighlight()
  await expect(tooltip).toContainText("category:Retried")
  await chart.screenshot({
    path: test.info().outputPath("histogram-grid-and-hover.png")
  })
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
  await expect.poll(() => pixels(chart)).toEqual(baseline)

  const width = (await chart.boundingBox())!.width
  await page.setViewportSize({ width: 900, height: 900 })
  await expect
    .poll(async () => (await chart.boundingBox())!.width)
    .toBeLessThan(width)
  await chart.scrollIntoViewIfNeeded()
  await hoverSegment(page, chart, 7)
  await expectColumnHighlight()
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
  await expect.poll(() => pixels(chart)).toEqual(baseline)
  expect(errors).toEqual([])
})
