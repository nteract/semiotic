import { test, expect, type Locator } from "@playwright/test"
import { expectTooltipWithinPlot } from "./helpers"

async function paintedCircle(chart: Locator) {
  return chart
    .locator("canvas[aria-label]")
    .evaluate((canvas: HTMLCanvasElement) => {
      const { width, height } = canvas
      const pixels = canvas
        .getContext("2d")!
        .getImageData(0, 0, width, height).data
      let left = width,
        right = 0,
        top = height,
        bottom = 0
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (pixels[(y * width + x) * 4 + 3] < 200) continue
          left = Math.min(left, x)
          right = Math.max(right, x)
          top = Math.min(top, y)
          bottom = Math.max(bottom, y)
        }
      }
      const box = canvas.getBoundingClientRect()
      const sx = box.width / width,
        sy = box.height / height
      return {
        x: box.x + ((left + right) * sx) / 2,
        y: box.y + ((top + bottom) * sy) / 2,
        width: (right - left) * sx,
        height: (bottom - top) * sy,
        centerY: ((top + bottom) * sy) / 2,
        canvasHeight: box.height
      }
    })
}

for (const [route, categories, values] of [
  [
    "pie-chart",
    /Electronics|Clothing|Grocery|Furniture|Books/,
    /340|210|450|180|120/
  ],
  ["donut-chart", /Complete|In Progress|Not Started/, /72|18|10/]
] as const) {
  test(`${route} keeps axis-free geometry and hover after resize`, async ({
    page
  }) => {
    await page.goto(`/charts/${route}`)
    const chart = page.locator(".live-example .stream-ordinal-frame").first()
    const tooltip = chart.locator(".stream-ordinal-tooltip")

    for (const width of [1280, 820]) {
      await page.setViewportSize({ width, height: 900 })
      await chart.scrollIntoViewIfNeeded()
      await expect(
        chart.locator("svg[data-semiotic-overlay] > g").first()
      ).toHaveAttribute("transform", "translate(10,10)")
      await expect
        .poll(async () => (await paintedCircle(chart)).width)
        .toBeGreaterThan(100)
      await expect
        .poll(async () => {
          const circle = await paintedCircle(chart)
          return Math.abs(circle.width - circle.height)
        })
        .toBeLessThan(3)
      const circle = await paintedCircle(chart)
      expect(Math.abs(circle.centerY - circle.canvasHeight / 2)).toBeLessThan(2)

      // This point is inside a real wedge and outside the donut hole.
      await page.mouse.move(
        circle.x + circle.width * 0.32,
        circle.y + circle.height * 0.12
      )
      await expect(tooltip).toContainText(categories)
      await expect(tooltip).toContainText(values)
      await expect(tooltip).toHaveAttribute("data-placement", "placed")
      const canvas = (await chart.locator("canvas[aria-label]").boundingBox())!
      // A full circle is centered in the plot, including when a measured
      // category legend takes some of its right-hand space.
      const right = Math.round(canvas.width - 2 * (circle.x - canvas.x) + 10)
      await expectTooltipWithinPlot(chart, {
        top: 10,
        bottom: 10,
        left: 10,
        right
      })
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)
    }
  })
}
