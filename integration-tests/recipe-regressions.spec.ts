import { expect, test } from "@playwright/test"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

const margin = { left: 20, right: 20, top: 20, bottom: 20 }

for (const input of ["bounded", "push"]) {
  test(`${input} landmark hover keeps geographic cells after reordering and resize`, async ({
    page
  }) => {
    await page.goto(`/recipe-regressions/?input=${input}`)
    const chart = page.getByTestId("landmark-chart")
    await waitForChartReady(page, "landmark-chart")
    for (const width of [500, 380]) {
      if (width === 380) {
        await page.getByRole("button", { name: "Resize charts" }).click()
        await page.getByRole("button", { name: "Reverse landmarks" }).click()
      }
      const canvas = chart.locator("canvas").first()
      await expect(canvas).toHaveCSS("width", `${width}px`)
      const box = (await canvas.boundingBox())!
      // Three 80x40 isometric tiles: the northeast cell is 80px right of center.
      for (const [offset, text] of [
        [80, "Corner City [0,2]"],
        [0, "Middle Monument [1,1]"]
      ] as const) {
        await page.mouse.move(box.x + width / 2 + offset, box.y + 140)
        await expect(chart.locator(".stream-frame-tooltip")).toHaveText(text)
        await expectTooltipWithinPlot(chart, margin)
        await page.mouse.move(0, 0)
        await expect(chart.locator(".stream-frame-tooltip")).toBeHidden()
      }
    }
  })
}

for (const execution of ["sync", "worker"]) {
  test(`region callbacks reach body state and tooltips with ${execution} execution`, async ({
    page
  }) => {
    await page.goto(`/recipe-regressions/?execution=${execution}`)
    const chart = page.getByTestId("region-chart")
    await expect(page.getByTestId("execution")).toHaveText(execution)
    await expect
      .poll(async () =>
        JSON.parse(await page.getByTestId("region-entries").innerText())
      )
      .toEqual({
        "body-a": {
          primitive: "chargeGate",
          parcel: "First parcel",
          region: "gate",
          previousEnergy: 0
        },
        "body-b": {
          primitive: "chargeGate",
          parcel: "Second parcel",
          region: "gate",
          previousEnergy: 0
        }
      })
    await page.getByRole("button", { name: "Push parcel" }).click()
    await expect
      .poll(
        async () =>
          JSON.parse(await page.getByTestId("region-entries").innerText())[
            "body-c"
          ]
      )
      .toEqual({
        primitive: "chargeGate",
        parcel: "Pushed parcel",
        region: "gate",
        previousEnergy: 0
      })
    await waitForChartReady(page, "region-chart")
    for (const width of [500, 380]) {
      if (width === 380)
        await page.getByRole("button", { name: "Resize charts" }).click()
      const canvas = chart.locator("canvas").first()
      await expect(canvas).toHaveCSS("width", `${width}px`)
      for (const [x, label] of [
        [100, "First parcel"],
        [200, "Second parcel"],
        [150, "Pushed parcel"]
      ] as const) {
        await canvas.hover({
          position: { x: x + margin.left, y: 100 + margin.top }
        })
        const tooltip = chart.locator(".stream-physics-tooltip")
        await expect(tooltip).toHaveText(`${label}: chargeGate`)
        const bounds = (await canvas.boundingBox())!
        const tip = (await tooltip.boundingBox())!
        expect(tip.x).toBeGreaterThanOrEqual(bounds.x + margin.left)
        expect(tip.y).toBeGreaterThanOrEqual(bounds.y + margin.top)
        expect(tip.x + tip.width).toBeLessThanOrEqual(
          bounds.x + bounds.width - margin.right
        )
        expect(tip.y + tip.height).toBeLessThanOrEqual(
          bounds.y + bounds.height - margin.bottom
        )
        await page.mouse.move(0, 0)
        await expect(tooltip).toBeHidden()
      }
    }
  })
}
