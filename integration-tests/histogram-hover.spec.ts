import { expect, test, type Locator, type Page } from "@playwright/test"
import { expectTooltipWithinPlot } from "./helpers"

const margin = { left: 50, right: 20, top: 20, bottom: 40 }

// Read actual painted segments, including both categories in every column.
async function columnPixels(chart: Locator) {
  return chart
    .locator("canvas[aria-label]")
    .evaluate((canvas: HTMLCanvasElement) => {
      const box = canvas.getBoundingClientRect()
      const context = canvas.getContext("2d")!
      return [0, 1, 2].map((column) =>
        [100, 180].map((y) => {
          const x = 50 + ((box.width - 70) * (column + 0.5)) / 3
          return Array.from(
            context.getImageData(
              Math.floor((x * canvas.width) / box.width),
              Math.floor((y * canvas.height) / box.height),
              1,
              1
            ).data
          )
        })
      )
    })
}

async function hoverColumn(
  page: Page,
  chart: Locator,
  column: number,
  y = 180
) {
  const box = (await chart.locator("canvas").first().boundingBox())!
  await page.mouse.move(
    box.x + 50 + ((box.width - 70) * (column + 0.5)) / 3,
    box.y + y
  )
}

for (const mode of ["bounded", "push", "single"]) {
  test(`${mode} histogram highlights whole bins and keeps tooltips after resize`, async ({
    page
  }) => {
    await page.goto(`/chart-features-examples/?histogram-hover&${mode}`)
    const chart = page.getByTestId("histogram-hover")
    const tooltip = chart.locator(".stream-frame-tooltip")
    await expect
      .poll(async () => (await columnPixels(chart))[0][1])
      .toEqual([200, 50, 50, 255])
    const baseline = await columnPixels(chart)
    const grid = chart.locator(".stream-grid line")
    expect(await grid.count()).toBeGreaterThan(0)
    expect(
      await grid.evaluateAll((lines) =>
        lines.every(
          (line) =>
            line.getAttribute("y1") === line.getAttribute("y2") &&
            line.getAttribute("x1") !== line.getAttribute("x2")
        )
      )
    ).toBe(true)

    const checkHoveredColumn = async (column: number) => {
      await expect
        .poll(async () => {
          const pixels = await columnPixels(chart)
          return pixels.every((segments, index) =>
            segments.every((pixel, segment) =>
              index === column
                ? JSON.stringify(pixel) ===
                  JSON.stringify(baseline[index][segment])
                : JSON.stringify(pixel) !==
                  JSON.stringify(baseline[index][segment])
            )
          )
        })
        .toBe(true)
      await expect(page.getByTestId("hovered-bin")).toHaveText(
        String(column * 10)
      )
      await expect(tooltip).toContainText(
        `range:${column * 10}–${column * 10 + 10}`
      )
      await expect(tooltip).toContainText("count:8")
      await expectTooltipWithinPlot(chart, margin)
    }

    await hoverColumn(page, chart, 0)
    await checkHoveredColumn(0)
    if (mode !== "single") await expect(tooltip).toContainText("category:North")
    await hoverColumn(page, chart, 0, 100)
    await checkHoveredColumn(0)
    if (mode !== "single") await expect(tooltip).toContainText("category:South")
    await hoverColumn(page, chart, 2)
    await checkHoveredColumn(2)
    await page.mouse.move(850, 10)
    await expect(tooltip).toHaveCount(0)
    await expect.poll(() => columnPixels(chart)).toEqual(baseline)

    await page.getByRole("button", { name: "Resize histogram" }).click()
    await expect
      .poll(
        async () => (await chart.locator("canvas").first().boundingBox())!.width
      )
      .toBe(420)
    await hoverColumn(page, chart, 2)
    await checkHoveredColumn(2)
    await page.mouse.move(850, 10)
    await expect(tooltip).toHaveCount(0)
    await expect.poll(() => columnPixels(chart)).toEqual(baseline)
  })
}

test("bin highlighting and hover callbacks remain active with tooltips disabled", async ({
  page
}) => {
  await page.goto("/chart-features-examples/?histogram-hover&no-tooltip")
  const chart = page.getByTestId("histogram-hover")
  await expect
    .poll(async () => (await columnPixels(chart))[0][1])
    .toEqual([200, 50, 50, 255])
  const baseline = await columnPixels(chart)
  await hoverColumn(page, chart, 0)
  await expect(page.getByTestId("hovered-bin")).toHaveText("0")
  await expect
    .poll(async () => (await columnPixels(chart))[0])
    .toEqual(baseline[0])
  await expect
    .poll(async () => (await columnPixels(chart))[1])
    .not.toEqual(baseline[1])
  await expect(chart.locator(".stream-frame-tooltip")).toHaveCount(0)
  await page.mouse.move(850, 10)
  await expect(page.getByTestId("hovered-bin")).toHaveText("none")
  await expect.poll(() => columnPixels(chart)).toEqual(baseline)
})

test.describe("touch bin highlighting", () => {
  test.use({ hasTouch: true })

  for (const component of ["bounded", "push"]) {
    for (const mobile of ["mobile", "narrow"]) {
      test(`${component} ${mobile} taps lock a column and background taps clear it`, async ({ page }) => {
        await page.goto(`/chart-features-examples/?histogram-hover&${component}&${mobile}`)
        const chart = page.getByTestId("histogram-hover")
        const tooltip = chart.locator(".stream-frame-tooltip")
        await expect.poll(async () => (await columnPixels(chart))[0][1]).toEqual([200, 50, 50, 255])
        const baseline = await columnPixels(chart)
        const tap = async (column: number, y: number) => {
          const box = (await chart.locator("canvas").first().boundingBox())!
          await page.touchscreen.tap(box.x + 50 + (box.width - 70) * (column + 0.5) / 3, box.y + y)
        }
        for (const [column, y, category] of [[0, 180, "North"], [2, 100, "South"]] as const) {
          await tap(column, y)
          await expect.poll(async () => (await columnPixels(chart))[column]).toEqual(baseline[column])
          await expect.poll(async () => (await columnPixels(chart))[1]).not.toEqual(baseline[1])
          await expect(tooltip).toContainText(`range:${column * 10}–${column * 10 + 10}`)
          await expect(tooltip).toContainText(`category:${category}`)
          await expect(tooltip).toContainText("count:8")
          await expectTooltipWithinPlot(chart, margin)
          // The top of the plot is outside every bar and its touch hit radius.
          await tap(column, 22)
          await expect.poll(() => columnPixels(chart)).toEqual(baseline)
          await expect(tooltip).toHaveCount(0)
        }
      })
    }
  }
})
