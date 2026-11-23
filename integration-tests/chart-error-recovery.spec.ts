import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { expectTooltipWithinPlot } from "./helpers"

for (const theme of ["light", "dark"]) {
  test(`chart states expose translated status, readable errors and reduced motion in ${theme} mode`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto(`/chart-features-examples/?chart-states=${theme}`)
    const fixture = page.getByTestId("chart-states")
    const loading = fixture.getByRole("status", { name: "Chargement du graphique" })
    await expect(loading).toHaveAttribute("aria-busy", "true")
    await expect(loading.locator(".semiotic-loading-bar")).toHaveCSS("height", "8px")
    await expect(fixture.getByRole("status").filter({ hasText: "Aucune donnée" })).toHaveText("Aucune donnée")
    const container = fixture.getByRole("status", { name: "Chargement du tableau" })
    await expect(container).toHaveCSS("animation-name", "none")
    await expect(fixture.getByRole("alert")).toContainText("Invalid region in chart data")
    const audit = await new AxeBuilder({ page }).include('[data-testid="chart-states"]').withTags(["wcag2a", "wcag2aa"]).analyze()
    expect(audit.violations).toEqual([])
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await expect(container).toHaveCSS("animation-name", "semiotic-skeleton-pulse")
  })
}

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
  await expect(chart.getByRole("alert")).toHaveCSS("height", "400px")
  await expect(chart.getByRole("alert")).toHaveCSS("width", "600px")

  for (const width of [600, 360]) {
    await page.getByRole("button", { name: "Repair data" }).click()
    await expect(chart.getByRole("alert")).toHaveCount(0)
    if (width === 360)
      await page.getByRole("button", { name: "Resize chart" }).click()
    const canvas = chart.locator("canvas").first()
    await expect
      .poll(async () => (await canvas.boundingBox())?.width)
      .toBe(width)
    await expect(canvas).toHaveCSS("height", "400px")
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

for (const initial of ["loading", "empty"]) {
  test(`ChainReactionChart measures after initial ${initial} and delivers an in-flight dependency after loading`, async ({ page }) => {
    await page.goto(`/chart-features-examples/?chain-loading=${initial}`)
    const chart = page.getByTestId("chain-recovery")
    if (initial === "loading") await expect(chart.getByRole("status", {name: "Loading tasks"})).toBeVisible()
    else await expect(chart.getByText("No data available")).toBeVisible()
    await chart.getByRole("button", {name: "Show tasks"}).click()
    const canvas = chart.locator("canvas").first()
    await expect(canvas).toHaveCSS("width", "420px")
    await chart.getByRole("button", {name: "Resize chart"}).click()
    await expect(canvas).toHaveCSS("width", "320px")
    await canvas.evaluate(node => { node.dataset.retained = "yes" })
    await chart.getByRole("button", {name: "Complete and load"}).click()
    await expect(chart.getByRole("status", {name: "Loading tasks"})).toBeVisible()
    await expect(canvas).toBeHidden()
    await chart.getByRole("button", {name: "Show tasks"}).click()
    await expect(canvas).toHaveAttribute("data-retained", "yes")
    await expect(chart.getByRole("status", {name: "Armed task"})).toHaveText("b", {timeout: 15000})
  })
}
