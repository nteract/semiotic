import { expect, test } from "@playwright/test"

test("date marks and tooltips survive accessor rerenders and resizing", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.goto("/xy-examples/?temporal-accessors")
  const frame = page.getByTestId("temporal-chart").locator(".stream-xy-frame")
  const tooltip = frame.locator(".stream-frame-tooltip")
  await expect(frame.locator(".semiotic-axis-bottom .semiotic-axis-tick")).toHaveText([
    "Jan 1", "Feb 1", "Mar 1", "Apr 1", "May 1", "Jun 1"
  ])
  const checkHover = async (width: number) => {
    for (const point of [
      { x: 40, y: 216, content: "2024-01-01: 20" },
      { x: width - 40, y: 84, content: "2024-06-01: 80" }
    ]) {
      await frame.hover({ position: { x: point.x, y: point.y } })
      await expect(tooltip).toHaveText(point.content)
      const chart = (await frame.boundingBox())!
      const tip = (await tooltip.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(chart.x)
      expect(tip.x + tip.width).toBeLessThanOrEqual(chart.x + chart.width)
      expect(tip.y).toBeGreaterThanOrEqual(chart.y)
      expect(tip.y + tip.height).toBeLessThanOrEqual(chart.y + chart.height)
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)
    }
  }
  await checkHover(600)
  await page.getByRole("button", { name: "Rerender dates" }).click()
  await checkHover(600)
  await page.getByRole("button", { name: "Narrow dates" }).click()
  await checkHover(360)
  await page.getByRole("button", { name: "Collapse dates" }).click()
  await expect(frame.locator("canvas").first()).toHaveAttribute("width", "30")
  await expect(frame.locator("canvas").first()).toHaveAttribute("height", "20")
  expect(await frame.evaluate(element => element.innerHTML)).not.toMatch(/NaN|Infinity/)
  await page.getByRole("button", { name: "Restore dates" }).click()
  await checkHover(600)
  expect(await frame.locator("canvas").first().evaluate(canvas => {
    const context = (canvas as HTMLCanvasElement).getContext("2d")!
    const pixels = context.getImageData(38, 214, 5, 5).data
    return pixels.some((value, index) => index % 4 === 3 && value > 0)
  })).toBe(true)
  expect(errors).toEqual([])
})
