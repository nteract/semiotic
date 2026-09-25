import { expect, test } from "@playwright/test"

for (const multi of [false, true]) {
  test(`BumpChart ${multi ? "multi" : "single"} renderer ownership survives its adapters`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(
      `/chart-features-examples/?bump-tooltip${multi ? "&multi" : ""}`
    )
    const frame = page.locator(".stream-xy-frame")
    const tooltip = frame.locator(".stream-frame-tooltip")
    const hoverAlpha = async () => {
      // First-column Alpha is rank 1 in the fixed [2.5, 0.5] rank domain.
      await frame.hover({ position: { x: 42, y: 70 } })
      return (await frame.boundingBox())!
    }
    const checkSurface = async (owned: boolean) => {
      const bounds = await hoverAlpha()
      await expect(tooltip).toHaveText("Alpha: 90")
      await expect(frame.locator(".semiotic-tooltip")).toHaveCount(1)
      if (owned) {
        await expect(frame.locator(".semiotic-tooltip")).toHaveCSS(
          "background-color",
          "rgb(0, 0, 128)"
        )
        await expect(tooltip).toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
      } else {
        await expect(frame.locator(".semiotic-tooltip")).not.toHaveCSS(
          "background-color",
          "rgba(0, 0, 0, 0)"
        )
      }
      const tip = (await tooltip.boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(bounds.x)
      expect(tip.y).toBeGreaterThanOrEqual(bounds.y)
      expect(tip.x + tip.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      expect(tip.y + tip.height).toBeLessThanOrEqual(bounds.y + bounds.height)
      await page.mouse.move(0, 0)
      await expect(tooltip).toHaveCount(0)
    }

    await checkSurface(true)
    await page.getByRole("button", { name: "Narrow chart" }).click()
    await checkSurface(true)
    await page.getByLabel("Tooltip renderer").selectOption("plain")
    await checkSurface(false)
    await page.getByLabel("Tooltip renderer").selectOption("empty")
    await hoverAlpha()
    await expect(tooltip).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
