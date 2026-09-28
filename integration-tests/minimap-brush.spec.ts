import { expect, test, type Locator, type Page } from "@playwright/test"
import { waitForRafs } from "./helpers"

// The overview plot of MinimapControlledExample: 440x60 at (40, 0) inside
// the overview wrapper, over x [0, 100] and y [0, 100].
async function overviewPlot(chart: Locator) {
  const overview = chart.locator(".minimap-chart > div").nth(1)
  await expect(overview.locator('[data-semiotic-control="linear-brush"]')).toBeAttached()
  await overview.scrollIntoViewIfNeeded()
  const box = (await overview.boundingBox())!
  return { x: box.x + 40, y: box.y, width: 440, height: 60 }
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 10 })
  // WebKit can drop a coalesced last move when mouseup lands in the same frame.
  await waitForRafs(page, 2)
  await page.mouse.up()
}

const extentOf = async (chart: Locator) =>
  (await chart.getAttribute("data-extent"))!.split(",").map(Number)

// Mouse positions snap to whole pixels; one overview pixel is 100/60 on y.
const expectNear = (value: number, expected: number) => expect(Math.abs(value - expected)).toBeLessThan(2)

test.describe("MinimapChart controlled brush", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/?minimap-controlled")
  })

  test("keeps reporting a drag while the parent re-renders", async ({ page }) => {
    const chart = page.getByTestId("minimap-controlled-x")
    const plot = await overviewPlot(chart)
    await drag(
      page,
      { x: plot.x + plot.width * 0.2, y: plot.y + plot.height / 2 },
      { x: plot.x + plot.width * 0.6, y: plot.y + plot.height / 2 }
    )

    await expect.poll(async () => Number(await chart.getAttribute("data-calls"))).toBeGreaterThan(2)
    const [start, end] = await extentOf(chart)
    expectNear(start, 20)
    expectNear(end, 60)
    const ticks = await chart.locator(".minimap-chart > div").first()
      .locator(".semiotic-axis-bottom .semiotic-axis-tick").allTextContents()
    expect(ticks.length).toBeGreaterThan(1)
    for (const tick of ticks.map(Number)) {
      expect(tick).toBeGreaterThanOrEqual(start - 1e-6)
      expect(tick).toBeLessThanOrEqual(end + 1e-6)
    }
  })

  test("draws the selection in the theme's selection color", async ({ page }) => {
    const selectionFill = async (testId: string) => {
      const chart = page.getByTestId(testId)
      const plot = await overviewPlot(chart)
      await drag(
        page,
        { x: plot.x + plot.width * 0.2, y: plot.y + plot.height / 2 },
        { x: plot.x + plot.width * 0.6, y: plot.y + plot.height / 2 }
      )
      await expect.poll(async () => Number(await chart.getAttribute("data-calls"))).toBeGreaterThan(0)
      return chart.locator("[data-semiotic-brush-selection]").evaluate((node) => getComputedStyle(node).borderTopColor)
    }
    // LIGHT_THEME and DARK_THEME colors.selection: #00a2ce and #4fc3f7.
    expect(await selectionFill("minimap-controlled-x")).toBe("rgb(0, 162, 206)")
    expect(await selectionFill("minimap-controlled-dark")).toBe("rgb(79, 195, 247)")
  })

  test("brushes the detail's y domain in ascending order for brushDirection y", async ({ page }) => {
    const chart = page.getByTestId("minimap-controlled-y")
    const plot = await overviewPlot(chart)
    await drag(
      page,
      { x: plot.x + plot.width / 2, y: plot.y + plot.height * 0.2 },
      { x: plot.x + plot.width / 2, y: plot.y + plot.height * 0.7 }
    )

    await expect.poll(async () => Number(await chart.getAttribute("data-calls"))).toBeGreaterThan(2)
    const [low, high] = await extentOf(chart)
    expectNear(low, 30)
    expectNear(high, 80)
    const ticks = await chart.locator(".minimap-chart > div").first()
      .locator(".semiotic-axis-left .semiotic-axis-tick").allTextContents()
    expect(ticks.length).toBeGreaterThan(1)
    for (const tick of ticks.map(Number)) {
      expect(tick).toBeGreaterThanOrEqual(low - 1e-6)
      expect(tick).toBeLessThanOrEqual(high + 1e-6)
    }
  })

  test("commits a handle drag once on release, with labels and keyboard access", async ({ page }) => {
    const chart = page.getByTestId("minimap-styled")
    const brush = chart.locator('[data-semiotic-control="linear-brush"]')
    await expect(brush).toHaveAttribute("aria-label", "Detail window brush")
    await brush.scrollIntoViewIfNeeded()
    await expect(chart.locator('[data-semiotic-brush-label="start"]')).toHaveText("Day 20\nof 100")

    const end = brush.locator('[data-semiotic-brush-part="end"]')
    const box = (await end.boundingBox())!
    // 440px plot over [0, 100]: +88px is +20.
    await drag(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, { x: box.x + box.width / 2 + 88, y: box.y + box.height / 2 })
    await expect(chart).toHaveAttribute("data-ends", "1")
    const [start, stop] = await extentOf(chart)
    expectNear(start, 20)
    expectNear(stop, 80)
    await expect(chart.locator('[data-semiotic-brush-label="end"]')).toHaveText(/^Day (79|80|81)\nof 100$/)

    await brush.getByRole("slider", { name: "Detail window (move both ends)" }).focus()
    await page.keyboard.press("Home")
    await expect(chart).toHaveAttribute("data-ends", "2")
    expectNear((await extentOf(chart))[0], 0)
  })

  test("matches the styled overview snapshot", async ({ page }) => {
    const chart = page.getByTestId("minimap-styled")
    await expect(chart.locator('[data-semiotic-brush-part="move"]')).toBeAttached()
    await chart.scrollIntoViewIfNeeded()
    await waitForRafs(page, 2)
    await expect(chart).toHaveScreenshot("minimap-styled.png", { maxDiffPixels: 250 })
  })
})
