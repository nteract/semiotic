import { expect, test } from "@playwright/test"

test("a Date-bearing shared URL restores chart marks and useful hover after resizing", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto("/portable-config/")
  await expect(page.getByRole("status")).toHaveText("3 Dates restored")
  for (const resized of [false, true]) {
    if (resized)
      await page.getByRole("button", { name: "Resize chart" }).click()
    const chart = page.getByTestId("chart")
    const canvas = chart.locator("canvas").first()
    await expect(canvas).toHaveCSS("width", resized ? "360px" : "600px")
    const box = (await canvas.boundingBox())!
    await page.mouse.move(box.x + 40 + (box.width - 60) / 2, box.y + 130)
    const tooltip = chart.locator(".stream-frame-tooltip")
    await expect(tooltip).toContainText("2026-11-15: 20")
    await expect(tooltip).toHaveAttribute("data-placement", "placed")
    const bounds = (await tooltip.boundingBox())!
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(
      page.viewportSize()!.width
    )
    expect(bounds.y).toBeGreaterThanOrEqual(0)
    await page.mouse.move(0, 0)
    await expect(tooltip).toHaveCount(0)
  }
  expect(errors).toEqual([])
})
