import { expect, test } from "@playwright/test"
import { expectCanvasPainted, expectTooltipWithinPlot } from "./helpers"

test("real hover updates memoized observers across entries and preserves captured snapshots", async ({
  page
}) => {
  await page.goto("/observation-lifecycle/")
  const chart = page.getByTestId("observed-chart")
  const canvas = chart.locator("canvas").first()
  const tooltip = chart.locator(".stream-frame-tooltip")
  await expectCanvasPainted(canvas)
  await canvas.hover({ position: { x: 76, y: 132 } })
  await expect(tooltip).toContainText("Observed A")
  await expect(page.getByTestId("hovered")).toHaveText("A")
  await expectTooltipWithinPlot(chart, {
    left: 20,
    right: 20,
    top: 20,
    bottom: 20
  })
  await page
    .getByRole("button", { name: "Capture observations" })
    .evaluate((button: HTMLButtonElement) => button.click())
  await page
    .getByRole("button", { name: "Resize chart" })
    .evaluate((button: HTMLButtonElement) => button.click())
  await expect(canvas).toHaveCSS("width", "400px")
  await canvas.hover({ position: { x: 308, y: 68 } })
  await expect(tooltip).toContainText("Observed B")
  await expect(page.getByTestId("hovered")).toContainText("A,B")
  await expect(page.getByTestId("saved")).toHaveText("A")
  await expectTooltipWithinPlot(chart, {
    left: 20,
    right: 20,
    top: 20,
    bottom: 20
  })
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
  await expect
    .poll(async () => {
      const [root, ai] = (await page.getByTestId("counts").innerText()).split(
        ":"
      )
      return Number(root) > 1 && root === ai
    })
    .toBe(true)
  await page.getByRole("button", { name: "Clear observations" }).click()
  await expect(page.getByTestId("counts")).toHaveText("0:0")
  await expect(page.getByTestId("hovered")).toBeEmpty()
  await expect(page.getByTestId("saved")).toHaveText("A")
})

test("out-of-order queries stay paired and reset discards old answers", async ({
  page
}) => {
  await page.goto("/observation-lifecycle/")
  const button = (name: string) =>
    page.getByRole("button", { name, exact: true })
  await button("Ask first").click()
  await button("Ask second").click()
  await button("Resolve second").click()
  await expect(page.getByTestId("loading")).toHaveText("true")
  await button("Resolve first").click()
  await expect(page.getByTestId("loading")).toHaveText("false")
  await expect(page.getByTestId("transcript")).toHaveText(
    "first|first answer|second|second answer"
  )
  await expect(page.getByTestId("annotations")).toHaveText("second")

  await button("Ask first").click()
  await button("Reset conversation").click()
  await expect(page.getByTestId("loading")).toHaveText("false")
  await expect(page.getByTestId("transcript")).toBeEmpty()
  await button("Ask second").click()
  await button("Resolve first").click()
  await expect(page.getByTestId("transcript")).toHaveText("second")
  await expect(page.getByTestId("annotations")).toBeEmpty()
  await expect(page.getByTestId("loading")).toHaveText("true")
  await button("Resolve second").click()
  await expect(page.getByTestId("transcript")).toHaveText(
    "second|second answer"
  )
  await expect(page.getByTestId("loading")).toHaveText("false")
})
