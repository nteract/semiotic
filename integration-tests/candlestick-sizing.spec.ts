import { expect, test, type Locator } from "@playwright/test"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

async function expectCenteredMessage(
  slot: Locator,
  kind: "empty" | "loading",
  width: number,
  height: number
) {
  const message = slot.getByTestId(`${kind}-message`)
  await expect(message).toBeVisible()
  await expect
    .poll(async () => {
      const box = await message.locator("..").boundingBox()
      const text = await message.boundingBox()
      if (!box || !text) return false
      return (
        Math.abs(box.width - width) < 0.001 &&
        Math.abs(box.height - height) < 0.001 &&
        Math.abs(text.x + text.width / 2 - box.x - width / 2) < 0.5 &&
        Math.abs(text.y + text.height / 2 - box.y - height / 2) < 0.5
      )
    })
    .toBe(true)
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1300, height: 800 })
  await page.goto("/chart-features-examples/?candlestick-sizing")
})

test("default range, empty, loading, and OHLC keep the same chart slot", async ({
  page
}) => {
  await waitForChartReady(page, "candlestick-slot")
  await waitForChartReady(page, "line-slot")
  const candle = page.getByTestId("candlestick-slot")
  const bounds = (await candle.locator("canvas[aria-label]").boundingBox())!
  expect(bounds.width).toBeCloseTo(600, 4)
  expect(bounds.height).toBeCloseTo(400, 4)
  // Hover the actual middle range wick, then check the default raw-datum
  // tooltip before testing placeholders. This catches broken shared wiring.
  await page.mouse.move(bounds.x + 315, bounds.y + 195)
  const tooltip = candle.locator(".stream-frame-tooltip")
  await expect(tooltip).toContainText("High: 10")
  await expect(tooltip).toContainText("Low: 4")
  await expectTooltipWithinPlot(candle, {
    left: 70,
    right: 40,
    top: 50,
    bottom: 60
  })
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)

  await page.getByRole("button", { name: "Show empty", exact: true }).click()
  for (const id of ["candlestick-slot", "line-slot"]) {
    await expectCenteredMessage(page.getByTestId(id), "empty", 600, 400)
  }
  await expect(page.getByTestId("sizing-comparison")).toHaveScreenshot(
    "default-centered-empty.png"
  )

  await page.getByRole("button", { name: "Show loading", exact: true }).click()
  for (const id of ["candlestick-slot", "line-slot"]) {
    await expectCenteredMessage(page.getByTestId(id), "loading", 600, 400)
  }
  await page.getByRole("button", { name: "Show ohlc", exact: true }).click()
  await waitForChartReady(page, "candlestick-slot")
  const ohlc = (await candle.locator("canvas[aria-label]").boundingBox())!
  expect(ohlc.width).toBeCloseTo(600, 4)
  expect(ohlc.height).toBeCloseTo(400, 4)
})

test("context empty and loading states use compact dimensions", async ({
  page
}) => {
  await page.getByRole("button", { name: "Context mode", exact: true }).click()
  await waitForChartReady(page, "candlestick-slot")
  await page.getByRole("button", { name: "Show empty", exact: true }).click()
  for (const id of ["candlestick-slot", "line-slot"]) {
    await expectCenteredMessage(page.getByTestId(id), "empty", 400, 250)
  }
  await expect(page.getByTestId("sizing-comparison")).toHaveScreenshot(
    "context-centered-empty.png"
  )
  await page.getByRole("button", { name: "Show loading", exact: true }).click()
  for (const id of ["candlestick-slot", "line-slot"]) {
    await expectCenteredMessage(page.getByTestId(id), "loading", 400, 250)
  }
})

test("responsive empty frames follow the public size resolver and retain full-size content", async ({
  page
}) => {
  await page
    .getByRole("button", { name: "Responsive width", exact: true })
    .click()
  await waitForChartReady(page, "candlestick-slot")
  await expect(page.getByTestId("resolved-size")).toHaveText("480×400")
  await page.getByRole("button", { name: "Show empty", exact: true }).click()
  for (const id of ["candlestick-slot", "line-slot"])
    await expectCenteredMessage(page.getByTestId(id), "empty", 480, 400)
  await page
    .getByRole("button", { name: "Narrow container", exact: true })
    .click()
  await expect(page.getByTestId("resolved-size")).toHaveText("320×400")
  for (const id of ["candlestick-slot", "line-slot"])
    await expectCenteredMessage(page.getByTestId(id), "empty", 320, 400)
  await page
    .getByRole("button", { name: "Full-size content", exact: true })
    .click()
  for (const id of ["candlestick-slot", "line-slot"]) {
    const content = page.getByTestId(id).getByTestId("full-content")
    const bounds = (await content.boundingBox())!
    // The shared placeholder's border consumes one pixel on each side.
    expect(bounds.width).toBeCloseTo(318, 4)
    expect(bounds.height).toBeCloseTo(398, 4)
  }
  await expect(page.getByTestId("sizing-comparison")).toHaveScreenshot(
    "responsive-full-size-empty.png"
  )
  await page.getByRole("button", { name: "Show loading", exact: true }).click()
  for (const id of ["candlestick-slot", "line-slot"])
    await expectCenteredMessage(page.getByTestId(id), "loading", 320, 400)
  await page.getByRole("button", { name: "Show range", exact: true }).click()
  await waitForChartReady(page, "candlestick-slot")
  const canvas = (await page
    .getByTestId("candlestick-slot")
    .locator("canvas[aria-label]")
    .boundingBox())!
  expect(canvas.width).toBeCloseTo(320, 4)
  expect(canvas.height).toBeCloseTo(400, 4)
})

test("default loading skeleton stays centered when both responsive axes resize", async ({
  page
}) => {
  await page.goto("/chart-features-examples/?candlestick-sizing&skeleton")
  const host = page.getByTestId("skeleton-host")
  const bars = host.locator(".semiotic-loading-bar")
  for (const [width, height] of [
    [480, 240],
    [320, 96]
  ]) {
    await expect(bars).toHaveCount(5)
    const box = (await host.locator(":scope > div").boundingBox())!
    const first = (await bars.first().boundingBox())!
    const last = (await bars.last().boundingBox())!
    expect(box.width).toBeCloseTo(width, 4)
    expect(box.height).toBeCloseTo(height, 4)
    expect(first.height).toBeGreaterThan(0)
    expect(first.y).toBeGreaterThan(box.y)
    expect(last.y + last.height).toBeLessThan(box.y + box.height)
    expect(
      Math.abs((first.y + last.y + last.height) / 2 - box.y - height / 2)
    ).toBeLessThan(1)
    if (width === 480)
      await page.getByRole("button", { name: "Resize skeleton" }).click()
  }
})
