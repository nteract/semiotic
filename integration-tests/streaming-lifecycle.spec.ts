import { expect, test } from "@playwright/test"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

for (const family of ["xy", "ordinal"]) {
  test(`${family} streaming hover, keyboard focus, resize and clear stay coherent`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })
    await page.goto(`/streaming-lifecycle/?family=${family}`)
    await waitForChartReady(page, "chart")
    const chart = page.getByTestId("chart")
    const tooltip = chart.locator(
      ".stream-frame-tooltip, .stream-ordinal-tooltip"
    )
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
        .hover({ position: { x: width / 2, y: family === "xy" ? 150 : 205 } })
      await expect(tooltip).toHaveText("Beta: 50")
      await expectTooltipWithinPlot(chart, {
        left: 40,
        right: 40,
        top: 40,
        bottom: 40
      })
      await page.mouse.move(0, 0)
      await expect(tooltip).toBeHidden()
    }
    const frame = chart.locator(`.stream-${family}-frame`)
    await frame.focus()
    await page.keyboard.press("End")
    await expect(tooltip).toHaveText("Gamma: 75")
    await page.getByRole("button", { name: "Inspect", exact: true }).focus()
    await expect(tooltip).toBeHidden()
    await expect(page.getByTestId("hover")).toHaveText("none")
    await chart
      .locator("canvas")
      .first()
      .hover({ position: { x: 200, y: family === "xy" ? 150 : 205 } })
    await expect(tooltip).toHaveText("Beta: 50")
    // Invoke without moving focus/pointer so dismissal must come from the mutation.
    await page
      .getByRole("button", { name: "Update Beta" })
      .evaluate((button: HTMLButtonElement) => button.click())
    await expect(tooltip).toBeHidden()
    await expect(page.getByTestId("hover")).toHaveText("none")
    await page.mouse.move(0, 0)
    await chart
      .locator("canvas")
      .first()
      .hover({ position: { x: 200, y: family === "xy" ? 128 : 205 } })
    await expect(tooltip).toHaveText("Beta: 60")
    await page
      .getByRole("button", { name: "Clear", exact: true })
      .evaluate((button: HTMLButtonElement) => button.click())
    await expect(tooltip).toBeHidden()
    await expect(page.getByTestId("hover")).toHaveText("none")
    await expect(page.getByTestId("retained")).toHaveText("")
    await expect(
      chart.getByRole("button", { name: /data summary/i })
    ).toHaveCount(0)
    expect(errors).toEqual([])
  })

  for (const mode of ["sliding", "growing"])
    test(`${family} ${mode} transitions from history to live retention`, async ({
      page
    }) => {
      await page.goto(`/streaming-lifecycle/?family=${family}&mode=${mode}`)
      await waitForChartReady(page, "chart")
      await page.getByRole("button", { name: "Inspect", exact: true }).click()
      await expect(page.getByTestId("retained")).toHaveText("a,b,c")
      await page.getByRole("button", { name: "Push Delta" }).click()
      await expect(page.getByTestId("retained")).toHaveText(
        mode === "growing" ? "a,b,c,d" : "c,d"
      )
      if (mode === "sliding") {
        await page.getByRole("button", { name: "Shrink", exact: true }).click()
        await page.getByRole("button", { name: "Inspect", exact: true }).click()
        await expect(page.getByTestId("retained")).toHaveText("d")
      }
      await page.getByRole("button", { name: "Replace", exact: true }).click()
      await page.getByRole("button", { name: "Inspect", exact: true }).click()
      await expect(page.getByTestId("retained")).toHaveText("a,b,c")
    })
}
