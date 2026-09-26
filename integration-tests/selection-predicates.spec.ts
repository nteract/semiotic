import { expect, test, type Locator, type Page } from "@playwright/test"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

const margin = { left: 20, right: 20, top: 20, bottom: 20 }

async function dimmedAlpha(page: Page): Promise<number> {
  // Native canvas quantizes 0.1 alpha to 25 in WebKit and 26 in Chromium/Firefox.
  // Compare chart pixels with the browser's own rendering of the requested alpha.
  return page.evaluate(() => {
    const canvas = document.createElement("canvas")
    canvas.width = canvas.height = 1
    const context = canvas.getContext("2d")!
    context.globalAlpha = 0.1
    context.fillRect(0, 0, 1, 1)
    return context.getImageData(0, 0, 1, 1).data[3]
  })
}

async function pointAlphas(chart: Locator, xs: number[]) {
  return chart
    .locator("canvas")
    .first()
    .evaluate((canvas: HTMLCanvasElement, values) => {
      const box = canvas.getBoundingClientRect()
      const context = canvas.getContext("2d")!
      const ratio = canvas.width / box.width
      return values.map(
        (x) =>
          context.getImageData(
            Math.round((20 + (x / 5) * (box.width - 40)) * ratio),
            Math.round((box.height / 2) * ratio),
            1,
            1
          ).data[3]
      )
    }, xs)
}

test("crossfilter intersects two filters in the rendered third chart", async ({
  page
}) => {
  await page.goto("/selection-predicates-examples/")
  const dimmed = await dimmedAlpha(page)
  const chart = page.getByTestId("crossfilter-target")
  await waitForChartReady(page, "crossfilter-target")
  await expect
    .poll(() => pointAlphas(chart, [1, 2, 3, 4]))
    .toEqual([255, 255, 255, 255])

  await page.getByRole("button", { name: "Brush around zero" }).click()
  await page
    .getByRole("button", { name: "Select category A", exact: true })
    .click()
  await expect(page.getByTestId("filtered-rows")).toHaveText("both")
  await expect
    .poll(() => pointAlphas(chart, [1, 2, 3, 4]))
    .toEqual([255, dimmed, dimmed, dimmed])

  await page
    .getByRole("button", { name: "Clear category", exact: true })
    .click()
  await expect(page.getByTestId("filtered-rows")).toHaveText("both,range-only")
  await expect
    .poll(() => pointAlphas(chart, [1, 2, 3, 4]))
    .toEqual([255, 255, dimmed, dimmed])
  await page.getByRole("button", { name: "Clear brush", exact: true }).click()
  await expect
    .poll(() => pointAlphas(chart, [1, 2, 3, 4]))
    .toEqual([255, 255, 255, 255])
})

test("Date hover selects bounded and pushed marks through resize and dismisses", async ({
  page
}) => {
  await page.goto("/selection-predicates-examples/")
  const dimmed = await dimmedAlpha(page)
  const source = page.getByTestId("date-source")
  const targets = [
    page.getByTestId("date-bounded"),
    page.getByTestId("date-pushed")
  ]
  await waitForChartReady(page, "date-source")
  for (const target of targets) {
    await expect(target.locator("canvas").first()).toBeVisible()
    await expect.poll(() => pointAlphas(target, [1, 4])).toEqual([255, 255])
  }

  for (const resized of [false, true]) {
    if (resized)
      await page.getByRole("button", { name: "Resize Date charts" }).click()
    const canvas = source.locator("canvas").first()
    await expect(canvas).toHaveCSS("width", resized ? "220px" : "280px")
    const box = (await canvas.boundingBox())!
    await page.mouse.move(
      box.x + 20 + (box.width - 40) / 5,
      box.y + box.height / 2
    )
    await expect(source.locator(".stream-frame-tooltip")).toContainText(
      "first: 2026-01-01T00:00:00.000Z"
    )
    await expectTooltipWithinPlot(source, margin)
    for (const target of targets) {
      await expect.poll(() => pointAlphas(target, [1, 4])).toEqual([255, dimmed])
    }
    await page.mouse.move(1, 1)
    await expect(source.locator(".stream-frame-tooltip")).toBeHidden()
    for (const target of targets) {
      await expect.poll(() => pointAlphas(target, [1, 4])).toEqual([255, 255])
    }
  }
})
