import { expect, test } from "@playwright/test"
import type { Locator, Page } from "@playwright/test"

async function hoverCenter(page: Page, mark: Locator) {
  await mark.scrollIntoViewIfNeeded()
  const box = await mark.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
}

async function expectPlacedTooltip(page: Page, tooltip: Locator, text: string) {
  await expect(tooltip).toContainText(text)
  await expect(tooltip).toHaveAttribute("data-placement", "placed")
  const box = await tooltip.boundingBox()
  expect(box).not.toBeNull()
  const viewport = page.viewportSize()!
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.y).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width)
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height)
}

test("HTML card hover changes selection, keeps geometry, and survives resize", async ({
  page
}, testInfo) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/custom-charts/custom-layouts")
  const demo = page.getByTestId("selection-html-marks")
  const orders = demo.locator('[data-service-card="orders"]')
  const payments = demo.locator('[data-service-card="payments"]')
  const tooltip = demo.locator(".stream-network-tooltip")
  await orders.scrollIntoViewIfNeeded()
  const cardGeometry = () =>
    orders.evaluate((card) => {
      const box = card.getBoundingClientRect()
      const frame = card
        .closest(".stream-network-frame")!
        .getBoundingClientRect()
      return {
        x: box.x - frame.x,
        y: box.y - frame.y,
        width: box.width,
        height: box.height
      }
    })
  const original = await cardGeometry()
  await hoverCenter(page, orders)
  await expectPlacedTooltip(page, tooltip, "REST · 1.2k rps")
  await expect(payments).toHaveCSS("opacity", "0.25")
  await expect(orders).toHaveCSS("opacity", "1")
  expect(await cardGeometry()).toEqual(original)
  await demo.screenshot({ path: testInfo.outputPath("html-selection.png") })
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
  await expect(payments).toHaveCSS("opacity", "1")
  await page.setViewportSize({ width: 1000, height: 800 })
  await hoverCenter(page, payments)
  await expectPlacedTooltip(page, tooltip, "gRPC · 480 rps")
  await expect(orders).toHaveCSS("opacity", "0.25")
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
  await expect(orders).toHaveCSS("opacity", "1")
  // Hover a visible edge in the gap between cards, after the responsive resize.
  const inventory = await demo
    .locator('[data-service-card="inventory"]')
    .boundingBox()
  const shipping = await demo
    .locator('[data-service-card="shipping"]')
    .boundingBox()
  await page.mouse.move(
    (inventory!.x + inventory!.width + shipping!.x) / 2,
    shipping!.y + shipping!.height / 2
  )
  await expectPlacedTooltip(page, tooltip, "Service connection")
  await expect(tooltip).toContainText(/(payments|inventory) → shipping/)
  await page.keyboard.press("Escape")
  await expect(tooltip).toHaveCount(0)
  expect(errors).toEqual([])
})

test("parallel-coordinate hover dims other vehicles without moving axes", async ({
  page
}, testInfo) => {
  await page.goto("/custom-charts/custom-layouts")
  const demo = page.getByTestId("selection-parallel-coordinates")
  const tooltip = demo.locator(".stream-ordinal-tooltip")
  await demo.scrollIntoViewIfNeeded()
  const axes = () =>
    demo.locator("svg[data-semiotic-overlay] line").evaluateAll((lines) =>
      lines
        .filter(
          (line) =>
            line.getAttribute("x1") === line.getAttribute("x2") &&
            Number(line.getAttribute("y2")) > Number(line.getAttribute("y1"))
        )
        .map((line) => {
          const box = line.getBoundingClientRect()
          return { x: box.x, y: box.y, height: box.height }
        })
    )
  // Sample the EV's dot at the top of the mpg axis, away from the SVG axis.
  const evAlpha = async () => {
    const [mpg] = await axes()
    return demo
      .locator("canvas")
      .evaluate((canvas: HTMLCanvasElement, point) => {
        const box = canvas.getBoundingClientRect()
        return canvas
          .getContext("2d")!
          .getImageData(
            Math.round(((point.x + 1 - box.x) * canvas.width) / box.width),
            Math.round(((point.y - box.y) * canvas.height) / box.height),
            1,
            1
          ).data[3]
      }, mpg)
  }
  for (const width of [1280, 1000]) {
    await page.setViewportSize({ width, height: 900 })
    await demo.scrollIntoViewIfNeeded()
    await expect.poll(evAlpha).toBeGreaterThan(200)
    const original = await axes()
    expect(original).toHaveLength(5)
    // Compact is the unique minimum (95 hp) on the second axis.
    await page.mouse.move(original[1].x, original[1].y + original[1].height)
    await expectPlacedTooltip(page, tooltip, "32 mpg · 95 hp")
    await expect(tooltip).toContainText("compact")
    await expect.poll(evAlpha).toBeLessThan(50)
    expect(await axes()).toEqual(original)
    await demo.screenshot({
      path: testInfo.outputPath(`parallel-selection-${width}.png`)
    })
    await page.mouse.move(0, 0)
    await expect(tooltip).toHaveCount(0)
    await expect.poll(evAlpha).toBeGreaterThan(200)
  }
})

test("the compact text row stays inside the chart and below its plot after resize", async ({
  page
}, testInfo) => {
  await page.goto("/annotations/overview")
  const chart = page.getByTestId("compact-caption-chart")
  for (const width of [1280, 1000]) {
    await page.setViewportSize({ width, height: 900 })
    await chart.scrollIntoViewIfNeeded()
    const labels = ["Direct: 34", "Partner: 21", "Week 4 · 55 orders"]
    for (const label of labels) {
      const text = chart.locator("svg text").filter({ hasText: label })
      await expect(text).toBeVisible()
      await expect
        .poll(async () =>
          text.evaluate((element) => {
            const row = element.getBoundingClientRect()
            const svg = element.closest("svg")!.getBoundingClientRect()
            return (
              row.left >= svg.left &&
              row.right <= svg.right &&
              row.top > svg.bottom - 68 &&
              row.bottom <= svg.bottom
            )
          })
        )
        .toBe(true)
    }
    await chart.screenshot({
      path: testInfo.outputPath(`caption-${width}.png`)
    })
  }
  await expect(chart.getByRole("img")).toHaveAccessibleName(
    "Direct and partner orders over four weeks. Week 4 has 34 direct and 21 partner orders, totaling 55."
  )
  await expect(
    chart.getByText("Weekly orders by channel", { exact: true })
  ).toBeVisible()
})
