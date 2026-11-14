import { expect, test, type Page } from "@playwright/test"

async function hoverReading(page: Page) {
  const chart = page.getByTestId("first")
  const canvas = chart.locator("canvas").first()
  await canvas.scrollIntoViewIfNeeded()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + 40 + (box.width - 60) / 2, box.y + 120)
  const tooltip = chart.locator(".stream-frame-tooltip")
  await expect(tooltip).toContainText("Reading 2: 20")
  await expect(tooltip).toHaveAttribute("data-placement", "placed")
  const bounds = (await tooltip.boundingBox())!
  expect(bounds.x).toBeGreaterThanOrEqual(0)
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(
    page.viewportSize()!.width
  )
  expect(bounds.y).toBeGreaterThanOrEqual(0)
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(
    page.viewportSize()!.height
  )
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
}

test("summary toggles retain streaming marks and hover through theme and size changes", async ({
  page
}) => {
  await page.goto("/chart-container-lifecycle/")
  await page.getByRole("button", { name: "Push readings" }).click()
  const canvas = page.getByTestId("first").locator("canvas").first()
  await canvas.evaluate((element) => {
    element.dataset.retainedCanvas = "true"
  })
  await hoverReading(page)
  for (const width of [600, 375]) {
    await page.getByRole("button", { name: "Toggle summary action" }).click()
    await page.getByRole("button", { name: "Count retained rows" }).click()
    await expect(page.getByTestId("rows")).toHaveText("3")
    await expect(canvas).toHaveAttribute("data-retained-canvas", "true")
    await page.getByRole("button", { name: "Toggle theme" }).click()
    await page.setViewportSize({ width, height: 900 })
    await hoverReading(page)
  }
})

test("mobile rules stay scoped, notifications retain focus, and failures are visible", async ({
  page,
  browserName
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.setViewportSize({ width: 600, height: 900 })
  await page.goto("/chart-container-lifecycle/")
  const first = page.getByTestId("first")
  const second = page.getByTestId("second")
  await expect(first.getByText("Narrow summary")).toBeHidden()
  await expect(second.getByText("Wide summary")).toBeVisible()
  await expect(
    page.locator("head style[data-semiotic-container-style]")
  ).toHaveCount(6)
  await expect(page.getByRole("region", { name: "Details at 480" })).toHaveCSS(
    "position",
    "static"
  )
  await expect(page.getByRole("region", { name: "Details at 800" })).toHaveCSS(
    "position",
    "sticky"
  )
  const bell = first.locator(".semiotic-chart-notifications-toggle")
  await bell.click()
  await expect(
    first.getByRole("dialog", { name: "Chart notifications" })
  ).toBeFocused()
  // macOS WebKit reserves plain Tab for text fields; Option-Tab visits buttons.
  await page.keyboard.press(
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab"
  )
  await expect(
    first.getByRole("button", { name: "Dismiss notification: First notice" })
  ).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(
    first.getByRole("button", { name: "Dismiss notification: Second notice" })
  ).toBeFocused()
  await page.keyboard.press("Escape")
  await expect(bell).toBeFocused()
  await bell.click()
  await first
    .getByRole("button", { name: "Dismiss notification: Second notice" })
    .click()
  await expect(first.locator(".semiotic-chart-container")).toBeFocused()
  await second.getByRole("button", { name: "Export chart" }).click()
  await expect(second.getByRole("alert")).toContainText("No SVG element")
  await expect(
    second.getByRole("button", { name: "Retry chart export" })
  ).toBeEnabled()
  expect(errors).toEqual([])
})

test("fullscreen changes only the selected chart", async ({
  page,
  browserName
}) => {
  test.skip(
    browserName !== "chromium",
    "Headless fullscreen support varies; state ownership also has unit coverage"
  )
  await page.goto("/chart-container-lifecycle/")
  const first = page.getByTestId("first")
  const second = page.getByTestId("second")
  await first.getByRole("button", { name: "Enter fullscreen" }).click()
  await expect(
    first.getByRole("button", { name: "Exit fullscreen" })
  ).toBeVisible()
  await expect(
    second.getByRole("button", { name: "Enter fullscreen" })
  ).toHaveCount(1)
  await expect(second.locator(".semiotic-chart-body")).toHaveCSS(
    "height",
    "120px"
  )
  await first.getByRole("button", { name: "Exit fullscreen" }).click()
  await expect(
    first.getByRole("button", { name: "Enter fullscreen" })
  ).toBeVisible()
})
