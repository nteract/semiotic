import { expect, test } from "@playwright/test"

for (const mode of ["bounded", "push", "uncontrolled"]) {
  test(`${mode} centered bins coordinate hover and locks with tables`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(
      `/chart-features-examples/?linked-crosshair-control&${mode}`
    )
    const histogram = page.getByTestId("linked-histogram")
    const line = page.getByTestId("linked-line")
    const state = page.getByTestId("crosshair-state")
    const tooltip = histogram.locator(".stream-frame-tooltip")
    const bounds = (await histogram.boundingBox())!
    // Plot 660x180 over [-5,25] x [0,10]: first timestamp at x 110,
    // bar spans y 108..180. Hover its actual painted middle.
    await page.mouse.move(bounds.x + 150, bounds.y + 155)
    await expect(state).toHaveText("0:false")
    await expect(tooltip).toHaveText("Total 4")
    await expect(tooltip).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
    await expect(histogram.getByTestId("owned-surface")).toHaveCSS(
      "background-color",
      "rgb(0, 0, 128)"
    )
    await expect(histogram.locator(".semiotic-tooltip")).toHaveCSS(
      "padding",
      "0px"
    )
    await expect(line.locator('[data-semiotic-crosshair="hover"]')).toHaveCount(
      1
    )
    await expect(
      line.locator('[data-semiotic-crosshair="hover"]')
    ).toHaveAttribute("x1", "110")
    await page.mouse.click(bounds.x + 150, bounds.y + 155)
    await expect(state).toHaveText("0:true")
    await page.mouse.move(0, 0)
    await expect(tooltip).toHaveCount(0)
    await expect(
      histogram.locator('[data-semiotic-crosshair="locked"]')
    ).toHaveCount(1)
    await expect(
      line.locator('[data-semiotic-crosshair="locked"]')
    ).toHaveCount(1)
    await expect(line.locator('[data-semiotic-crosshair="locked"]')).toHaveCSS(
      "stroke",
      "rgb(51, 51, 51)"
    )
    // A sibling hover cannot move the lock; clicking the sibling releases it.
    const lineBounds = (await line.boundingBox())!
    await page.mouse.move(lineBounds.x + 370, lineBounds.y + 104)
    await expect(state).toHaveText("0:true")
    await page.mouse.click(lineBounds.x + 370, lineBounds.y + 104)
    await expect(state).toHaveText("none")
    await page.getByRole("button", { name: "Lock last timestamp" }).click()
    await expect(state).toHaveText("20:true")
    await page.getByRole("button", { name: "Resize linked charts" }).click()
    await expect(
      histogram.locator('[data-semiotic-crosshair="locked"]')
    ).toHaveAttribute("x1", "300")
    await expect(
      line.locator('[data-semiotic-crosshair="locked"]')
    ).toHaveAttribute("x1", "300")
    // The last centered bar is complete and still hovers after resizing.
    const resized = (await histogram.boundingBox())!
    await page.mouse.move(resized.x + 340, resized.y + 155)
    await expect(tooltip).toHaveText("Total 4")
    const tip = (await tooltip.boundingBox())!
    expect(tip.x).toBeGreaterThanOrEqual(resized.x)
    expect(tip.x + tip.width).toBeLessThanOrEqual(resized.x + resized.width)
    await page.mouse.move(0, 0)
    await page.keyboard.press("Escape")
    await expect(state).toHaveText("none")
    await expect(histogram.locator("[data-semiotic-crosshair]")).toHaveCount(0)
    await expect(line.locator("[data-semiotic-crosshair]")).toHaveCount(0)
    await page.getByRole("button", { name: "Lock last timestamp" }).click()
    await expect(state).toHaveText("20:true")
    await page.getByRole("button", { name: "Clear crosshair" }).click()
    await expect(state).toHaveText("none")
    expect(errors).toEqual([])
  })
}
