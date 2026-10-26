import { expect, test, type Locator } from "@playwright/test"

async function pointColor(chart: Locator, x: number) {
  return chart
    .locator("canvas")
    .first()
    .evaluate((canvas: HTMLCanvasElement, pointX) => {
      const ratio = canvas.width / canvas.clientWidth
      const [r, g, b] = canvas
        .getContext("2d")!
        .getImageData(
          Math.round(pointX * ratio),
          Math.round(140 * ratio),
          1,
          1
        ).data
      return `rgb(${r}, ${g}, ${b})`
    }, x)
}

test("nested theme updates repaint the chart and retain working tooltips", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/theme-updates/")
  for (const [action, expected, width] of [
    [undefined, "rgb(194, 24, 91)", 500],
    ["Remove inner overrides", "rgb(79, 195, 247)", 500],
    ["Light parent", "rgb(31, 119, 180)", 500],
    ["Resize charts", "rgb(31, 119, 180)", 380],
    ["High contrast parent", "rgb(0, 114, 178)", 380]
  ] as const) {
    if (action)
      await page.getByRole("button", { name: action, exact: true }).click()
    const x = 40 + (width - 60) / 2
    const chart = page.getByTestId("canvas-chart")
    await expect.poll(() => pointColor(chart, x)).toBe(expected)
    await chart.hover({ position: { x, y: 140 } })
    const tooltip = chart.locator(".stream-frame-tooltip")
    await expect(tooltip).toHaveText("Point Alpha: 5, 5")
    const bounds = (await chart.boundingBox())!
    const tip = (await tooltip.boundingBox())!
    expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
    expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
    expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
    expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
    await page.mouse.move(0, 0)
    await expect(tooltip).toBeHidden()
  }
  await page
    .getByRole("button", { name: "Render again 0", exact: true })
    .click()
  await expect(page.getByTestId("theme-values")).toContainText(
    '"background":"#ffffff"'
  )
  expect(errors).toEqual([])
})

test("nested automatic themes follow OS colors before hydration", async ({
  page
}) => {
  await page.emulateMedia({ colorScheme: "dark" })
  await page.goto("/theme-updates/")
  const colors = page.getByTestId("automatic-colors")
  await expect(colors).toHaveCSS("background-color", "rgb(26, 26, 46)")
  await expect(colors).toHaveCSS("color", "rgb(224, 224, 224)")
  await page.emulateMedia({ colorScheme: "light" })
  await expect(colors).toHaveCSS("background-color", "rgb(255, 255, 255)")
  await expect(colors).toHaveCSS("color", "rgb(51, 51, 51)")
})
