import { expect, test } from "@playwright/test"
import { expectTooltipWithinPlot } from "./helpers"

test("waterfall carry-in hover survives resize and wall-clock freshness survives pause", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/streaming-aggregation/")
  await page.getByRole("button", { name: "Push changes" }).click()
  await expect(page.getByTestId("retained")).toHaveText(
    "B:id,label,delta;C:id,label,delta;D:id,label,delta"
  )
  const chart = page.getByTestId("chart")
  const tooltip = chart.locator(".stream-frame-tooltip")
  for (const width of [540, 400]) {
    if (width === 400)
      await page.getByRole("button", { name: "Resize chart" }).click()
    await expect(chart.locator("canvas").first()).toHaveCSS(
      "width",
      `${width}px`
    )
    await chart
      .locator("canvas")
      .first()
      .hover({ position: { x: 40 + ((width - 80) * 3) / 4, y: 62 } })
    await expect(tooltip).toHaveText("D: 130 → 140")
    await expectTooltipWithinPlot(chart, {
      top: 40,
      bottom: 40,
      left: 40,
      right: 40
    })
    await page.mouse.move(0, 0)
    await expect(tooltip).toBeHidden()
  }
  await page.getByRole("button", { name: "Pause and advance clock" }).click()
  await expect(chart.getByRole("status")).toHaveText("STALE")
  expect(
    await chart
      .getByRole("status")
      .evaluate((el) => el.closest('[role="img"]') == null)
  ).toBe(true)
  await expect(page.getByTestId("hook-status")).toHaveText("stale")
  await page.getByRole("button", { name: "Clear", exact: true }).click()
  await expect(page.getByTestId("retained")).toBeEmpty()
  await expect(tooltip).toBeHidden()
  expect(errors).toEqual([])
})
