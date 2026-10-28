import { expect, test, type Locator, type Page } from "@playwright/test"
import { expectTooltipWithinPlot } from "./helpers"

const ticks = (chart: Locator) =>
  chart.locator(".semiotic-axis-left .semiotic-axis-tick")
async function expectMarkAt(chart: Locator, x: number, y: number) {
  await expect
    .poll(
      () =>
        chart
          .locator("canvas")
          .first()
          .evaluate(
            (element, point) => {
              const canvas = element as HTMLCanvasElement
              const bounds = canvas.getBoundingClientRect()
              const ratio = canvas.width / bounds.width
              const pixels = canvas
                .getContext("2d")!
                .getImageData(
                  Math.round(point.x * ratio) - 2,
                  Math.round(point.y * ratio) - 2,
                  5,
                  5
                ).data
              for (let i = 0; i < pixels.length; i += 4) {
                if (
                  pixels[i + 3] > 25 &&
                  Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) < 245
                )
                  return true
              }
              return false
            },
            { x, y }
          ),
      { message: "Canvas mark must match its rounded-axis position" }
    )
    .toBe(true)
}
async function hover(page: Page, chart: Locator, x: number, y: number) {
  await chart.scrollIntoViewIfNeeded()
  const box = await chart.boundingBox()
  await page.mouse.move(box!.x + x, box!.y + y)
}

test("rounded axes follow final legend layout and preserve hover after resizing", async ({
  page
}) => {
  await page.goto("/chart-features-examples/?rounded-axes")
  const chart = page.getByTestId("rounded-line")
  const server = page.getByTestId("rounded-server")
  await expect(ticks(chart)).toHaveText(["0", "2000", "4000"])
  await expect(server).toHaveAttribute("data-domain", "[0,4000]")
  await expect(server).toHaveAttribute("data-plot-height", "72")
  await expect(server.locator('.semiotic-axis-left text[x="-8"]')).toHaveText([
    "0",
    "2000",
    "4000"
  ])
  await expectMarkAt(chart, 289, 10 + 72 * (1 - 2100 / 4000))
  await hover(page, chart, 289, 10 + 72 * (1 - 2100 / 4000))
  await expect(
    chart.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
  ).toContainText("2100")
  await expectTooltipWithinPlot(chart, {
    left: 40,
    right: 10,
    top: 10,
    bottom: 98
  })
  await page.mouse.move(1, 1)
  await expect(
    chart.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
  ).toHaveCount(0)

  await page.getByRole("button", { name: "Resize rounded charts" }).click()
  await expect(ticks(chart)).toHaveText(["0", "1000", "2000", "3000"])
  await expect(server).toHaveAttribute("data-domain", "[0,3000]")
  await expect(server).toHaveAttribute("data-plot-height", "90")
  await expectMarkAt(chart, 709, 10 + 90 * (1 - 2100 / 3000))
  await hover(page, chart, 709, 10 + 90 * (1 - 2100 / 3000))
  await expect(
    chart.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
  ).toContainText("2100")
  await expectTooltipWithinPlot(chart, {
    left: 40,
    right: 10,
    top: 10,
    bottom: 80
  })
  await page.mouse.move(1, 1)
  await expect(
    chart.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
  ).toHaveCount(0)
})

test("histogram push updates and ordinal marks share their rounded axes", async ({
  page
}) => {
  await page.goto("/chart-features-examples/?rounded-axes")
  const histogram = page.getByTestId("rounded-histogram")
  const bars = page.getByTestId("rounded-bars")
  await expect(ticks(histogram)).toHaveText(["0", "500", "1000", "1500"])
  await expect(ticks(bars)).toHaveText(["0", "500", "1000", "1500"])
  await hover(
    page,
    histogram,
    40 + (250 * 15) / 50,
    10 + 130 * (1 - 670 / 1500)
  )
  await expect(
    histogram.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
  ).toContainText(/1,?340/)
  await expectTooltipWithinPlot(histogram, {
    left: 40,
    right: 10,
    top: 10,
    bottom: 40
  })
  await page.mouse.move(1, 1)
  await expect(
    histogram.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
  ).toHaveCount(0)
  await page.getByRole("button", { name: "Push larger bin" }).click()
  await expect(ticks(histogram)).toHaveText([
    "0",
    "500",
    "1000",
    "1500",
    "2000",
    "2500"
  ])
  await hover(
    page,
    histogram,
    40 + (250 * 45) / 50,
    10 + 130 * (1 - 1050 / 2500)
  )
  await expect(
    histogram.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
  ).toContainText(/2,?100/)
  await page.mouse.move(1, 1)
  await expect(
    histogram.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
  ).toHaveCount(0)
  await hover(page, bars, 105, 60)
  await expect(
    bars.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
  ).toContainText("1340")
  await expectTooltipWithinPlot(bars, {
    left: 40,
    right: 10,
    top: 10,
    bottom: 40
  })
  await page.mouse.move(1, 1)
  await expect(
    bars.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
  ).toHaveCount(0)
})
