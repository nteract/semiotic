import { expect, test } from "@playwright/test"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

const margin = { left: 20, right: 20, top: 40, bottom: 20 }

for (const input of ["bounded", "push"]) {
  test(`${input} recipes disclose omitted data and retain hover after resize (#1505)`, async ({
    page
  }) => {
    await page.goto(`/recipe-regressions/?case=bounds&input=${input}`)
    for (const id of ["bullet-bounds", "lane-bounds", "waffle-bounds"])
      await waitForChartReady(page, id)
    for (const width of [500, 380]) {
      if (width === 380)
        await page.getByRole("button", { name: "Resize charts" }).click()
      const invalidNotice = page
        .getByTestId("empty-waffle-0")
        .getByRole("img", {
          name: "0 of 0 rows shown. The grid needs positive integer dimensions and enough space for its gutters.",
          exact: true
        })
      await expect(invalidNotice).toBeVisible()
      await expect(invalidNotice).toContainText("0 of 0 rows shown")
      await expect(
        page
          .getByTestId("empty-waffle-2")
          .getByRole("img", { name: /rows shown/ })
      ).toHaveCount(0)
      await expect(
        page
          .getByTestId("bullet-bounds")
          .getByRole("img", { name: /3 of 4 rows shown/ })
      ).toBeVisible()
      await expect(
        page
          .getByTestId("waffle-bounds")
          .getByRole("img", { name: /1 of 2 categories shown/ })
      ).toBeVisible()
      await expect(
        page
          .getByTestId("lane-bounds")
          .locator("text")
          .filter({ hasNotText: "Short lanes" })
      ).toHaveText(["0", "0.2", "0.4", "0.6", "0.8", "1"])
      for (const [id, x, y, content] of [
        ["bullet-bounds", 140 + (width - 160) * 0.2, 54, "Revenue range: 50"],
        ["lane-bounds", 20 + (width - 40) * 0.35, 44.25, "Lane 0: 0.1 to 0.6"],
        ["waffle-bounds", 20 + (width - 42) / 4, 147, "Large: 100"]
      ] as const) {
        const chart = page.getByTestId(id)
        const canvas = chart.locator("canvas").first()
        await expect(canvas).toHaveCSS("width", `${width}px`)
        await canvas.hover({ position: { x, y } })
        await expect(
          chart.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
        ).toHaveText(content)
        await expectTooltipWithinPlot(chart, margin)
        await page.mouse.move(0, 0)
        await expect(
          chart.locator(".stream-frame-tooltip, .stream-ordinal-tooltip")
        ).toBeHidden()
      }
    }
  })
}
