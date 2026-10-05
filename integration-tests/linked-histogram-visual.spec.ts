import { expect, test, type Locator } from "@playwright/test"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

const margin = { left: 40, right: 20, top: 20, bottom: 20 }

async function pixelAt(chart: Locator, x: number, y: number) {
  return chart.locator("canvas[aria-label]").evaluate(
    (canvas: HTMLCanvasElement, point) => {
      const box = canvas.getBoundingClientRect()
      return Array.from(
        canvas
          .getContext("2d")!
          .getImageData(
            Math.floor((point.x * canvas.width) / box.width),
            Math.floor((point.y * canvas.height) / box.height),
            1,
            1
          ).data
      )
    },
    { x, y }
  )
}

for (const mode of ["bounded", "push"]) {
  test(`${mode} centered edge bins and consumer tooltip screenshot`, async ({
    page
  }) => {
    await page.goto(
      `/chart-features-examples/?linked-crosshair-control&visual&${mode}`
    )
    await waitForChartReady(page, "linked-histogram")
    await waitForChartReady(page, "linked-line")
    const histogram = page.getByTestId("linked-histogram")
    // Automatic extents must paint complete first and last bars, not just
    // mount an overlay with cropped or empty edge slots.
    for (const x of [42, 698]) {
      await expect
        .poll(() => pixelAt(histogram, x, 190))
        .toEqual([56, 189, 248, 255])
    }
    const bounds = (await histogram.boundingBox())!
    await page.mouse.move(bounds.x + 150, bounds.y + 155)
    await expect(page.getByTestId("crosshair-state")).toHaveText("0:false")
    await expect(histogram.locator(".stream-frame-tooltip")).toHaveText(
      "Total 4"
    )
    await expectTooltipWithinPlot(histogram, margin)
    await expect(
      page
        .getByTestId("linked-line")
        .locator('[data-semiotic-crosshair="hover"]')
    ).toHaveAttribute("x1", "110")
    await expect(
      page.getByTestId("linked-table").locator('tr[aria-selected="true"]')
    ).toHaveText("04")
    await expect(page.getByTestId("linked-dashboard")).toHaveScreenshot(
      `${mode}-centered-edge-bins-hover.png`,
      { animations: "disabled" }
    )
    await page.mouse.move(0, 0)
    await expect(histogram.locator(".stream-frame-tooltip")).toHaveCount(0)
  })
}

test("table crosshair lock and clear screenshots after resize", async ({
  page
}) => {
  await page.goto(
    "/chart-features-examples/?linked-crosshair-control&visual&bounded"
  )
  await waitForChartReady(page, "linked-histogram")
  await waitForChartReady(page, "linked-line")
  await page
    .getByTestId("linked-table")
    .getByRole("button", { name: "20", exact: true })
    .click()
  await expect(page.getByTestId("crosshair-state")).toHaveText("20:true")
  await page.getByRole("button", { name: "Resize linked charts" }).click()
  for (const id of ["linked-histogram", "linked-line"]) {
    await waitForChartReady(page, id)
    await expect(
      page.getByTestId(id).locator('[data-semiotic-crosshair="locked"]')
    ).toHaveAttribute("x1", "300")
  }
  await page.mouse.move(0, 0)
  const dashboard = page.getByTestId("linked-dashboard")
  await expect(dashboard.locator('tr[aria-selected="true"]')).toHaveText("204")
  await expect(dashboard).toHaveScreenshot(
    "table-locked-crosshair-resized.png",
    { animations: "disabled" }
  )
  await page.keyboard.press("Escape")
  await expect(page.getByTestId("crosshair-state")).toHaveText("none")
  await expect(dashboard.locator("[data-semiotic-crosshair]")).toHaveCount(0)
  await expect(dashboard.locator('tr[aria-selected="true"]')).toHaveCount(0)
  await expect(dashboard).toHaveScreenshot(
    "table-cleared-crosshair-resized.png",
    { animations: "disabled" }
  )
})
