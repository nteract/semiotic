import { expect, test } from "@playwright/test"
import { expectTooltipWithinPlot } from "./helpers"

test("chart repairs restore painted marks and tooltips, including after resize", async ({
  page
}) => {
  const unexpectedErrors: string[] = []
  const consoleChecks: Promise<void>[] = []
  page.on("pageerror", (error) => unexpectedErrors.push(error.message))
  page.on("console", (message) => {
    if (message.type() !== "error") return
    // Firefox's text representation can contain only an Error's stack. Read
    // its message from the console argument before classifying this fixture's
    // deliberate accessor failure.
    consoleChecks.push(
      (async () => {
        const argumentsText = await Promise.all(
          message
            .args()
            .map((argument) =>
              argument.evaluate((value) =>
                value instanceof Error ? value.message : String(value)
              )
            )
        )
        if (
          !argumentsText.some((value) =>
            value.includes("Invalid region in chart data")
          )
        ) {
          unexpectedErrors.push(message.text())
        }
      })()
    )
  })
  await page.goto("/chart-features-examples/?error-recovery")
  const chart = page.getByTestId("recovering-chart")
  await expect(chart.getByRole("alert")).toContainText(
    "Invalid region in chart data"
  )

  for (const width of [600, 360]) {
    await page.getByRole("button", { name: "Repair data" }).click()
    await expect(chart.getByRole("alert")).toHaveCount(0)
    if (width === 360)
      await page.getByRole("button", { name: "Resize chart" }).click()
    const canvas = chart.locator("canvas").first()
    await expect
      .poll(async () => (await canvas.boundingBox())?.width)
      .toBe(width)
    const point = { x: 50 + (width - 70) / 4, y: 150 }
    await expect
      .poll(async () =>
        canvas.evaluate((element: HTMLCanvasElement, point) => {
          const box = element.getBoundingClientRect()
          return Array.from(
            element
              .getContext("2d")!
              .getImageData(
                Math.floor((point.x * element.width) / box.width),
                Math.floor((point.y * element.height) / box.height),
                1,
                1
              ).data
          )
        }, point)
      )
      .toEqual([200, 50, 50, 255])

    const box = (await canvas.boundingBox())!
    await page.mouse.move(box.x + point.x, box.y + point.y)
    await expect(chart.locator(".stream-ordinal-tooltip")).toHaveText(
      "North: 12 units"
    )
    await expectTooltipWithinPlot(chart, {
      left: 50,
      right: 20,
      top: 20,
      bottom: 40
    })
    await page.mouse.move(850, 10)
    await expect(chart.locator(".stream-ordinal-tooltip")).toHaveCount(0)
    if (width === 600) {
      await page.getByRole("button", { name: "Break data" }).click()
      await expect(chart.getByRole("alert")).toContainText(
        "Invalid region in chart data"
      )
    }
  }
  await Promise.all(consoleChecks)
  expect(unexpectedErrors).toEqual([])
})
