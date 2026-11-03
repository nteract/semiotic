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

test("automatic children repaint and retain tooltips after imperative parent updates", async ({
  page
}) => {
  await page.emulateMedia({ colorScheme: "light" })
  await page.goto("/theme-updates/")
  const chart = page.getByTestId("automatic-chart")
  const values = page.getByTestId("automatic-live-values")
  for (const [updated, color, label] of [
    [false, "rgb(255, 0, 0)", "red"],
    [true, "rgb(0, 0, 255)", "blue"]
  ] as const) {
    if (updated)
      await page
        .getByRole("button", { name: "Update automatic parent" })
        .click()
    await expect.poll(() => pointColor(chart, 260)).toBe(color)
    await expect(values).toHaveCSS("color", color)
    await expect(values).toHaveText(`${label}:22`)
    if (updated) await expect(values).toHaveCSS("font-family", "serif")
    await chart.hover({ position: { x: 260, y: 140 } })
    const tooltip = chart.locator(".stream-frame-tooltip")
    await expect(tooltip).toHaveText("Point Alpha: 5, 5")
    const bounds = (await chart.boundingBox())!
    const tip = (await tooltip.boundingBox())!
    expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
    expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
    await page.mouse.move(0, 0)
    await expect(tooltip).toBeHidden()
  }
  await page.emulateMedia({ colorScheme: "dark" })
  await expect.poll(() => pointColor(chart, 260)).toBe("rgb(255, 0, 0)")
  await expect(values).toHaveCSS("color", "rgb(255, 0, 0)")
})

test("CSS-variable hatch fills repaint after theme changes and resize with working mark tooltips", async ({ page }) => {
  await page.goto("/theme-updates/")
  for (const [action, width, background, stroke] of [
    [undefined, 500, [255, 209, 102], [146, 64, 14]],
    ["Light parent", 500, [170, 187, 204], [18, 52, 86]],
    ["Resize charts", 380, [170, 187, 204], [18, 52, 86]],
  ] as const) {
    if (action) await page.getByRole("button", { name: action, exact: true }).click()
    for (const kind of ["bar", "funnel"] as const) {
      const chart = page.getByTestId(`hatched-${kind}`)
      const x = 40 + (width - 60) * (kind === "bar" ? 0.5 : 0.75)
      const y = kind === "bar" ? 140 : 80
      await expect(chart).toHaveCSS("width", `${width}px`)
      // Sample an interior patch containing several complete hatch periods.
      // A solid fallback and a black tile both fail these independent color
      // checks; antialiased boundary pixels are allowed between the colors.
      const pixels = () => chart.locator("canvas").first().evaluate((canvas: HTMLCanvasElement, sample) => {
        const rx = canvas.width / canvas.clientWidth
        const ry = canvas.height / canvas.clientHeight
        const data = canvas.getContext("2d")!.getImageData(
          Math.round((sample.x - 16) * rx), Math.round((sample.y - 16) * ry),
          Math.round(32 * rx), Math.round(32 * ry),
        ).data
        let backgroundCount = 0
        let inkCount = 0
        for (let index = 0; index < data.length; index += 4) {
          if (data[index + 3] < 240) continue
          const rgb = [data[index], data[index + 1], data[index + 2]]
          if (rgb.every((value, channel) => Math.abs(value - sample.background[channel]) < 8)) backgroundCount++
          if (sample.stroke
            ? rgb.every((value, channel) => Math.abs(value - sample.stroke![channel]) < 12)
            : rgb.every((value, channel) => value >= sample.background[channel] - 8) &&
              rgb.some((value, channel) => value > sample.background[channel] + 12)) inkCount++
        }
        const count = data.length / 4
        return { background: backgroundCount / count, ink: inkCount / count }
      }, { x, y, background, stroke: kind === "bar" ? stroke : null })
      await expect.poll(async () => (await pixels()).background).toBeGreaterThan(0.25)
      await expect.poll(async () => (await pixels()).ink).toBeGreaterThan(0.02)

      await chart.hover({ position: { x, y } })
      const tooltip = chart.locator(".stream-ordinal-tooltip")
      if (kind === "bar") await expect(tooltip).toHaveText("Capacity: 80 units")
      else {
        await expect(tooltip).toContainText("Signup")
        await expect(tooltip).toContainText("Dropoff")
        await expect(tooltip).toContainText("50 (50%)")
      }
      const bounds = (await chart.boundingBox())!
      const tip = (await tooltip.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
      expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
      expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
      await page.mouse.move(0, 0)
      await expect(tooltip).toBeHidden()
    }
  }
})
