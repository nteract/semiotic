import { expect, test, type Locator, type Page } from "@playwright/test"
import { expectTooltipWithinPlot } from "./helpers"

async function hoverCup(page: Page, chart: Locator, text: string) {
  // The tea is a real visible overlay mark inside the data-bearing cup hit box.
  const tea = chart.locator('.semiotic-boba path[fill="#D2B799"]')
  const box = await tea.boundingBox()
  if (!box) throw new Error("Missing tea geometry")
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  const tooltip = chart.locator(".stream-ordinal-tooltip")
  await expect(tooltip).toHaveText(text)
  await expectTooltipWithinPlot(chart, {
    left: 20,
    right: 20,
    top: 20,
    bottom: 44
  })
  await page.mouse.move(1, 1)
  await expect(tooltip).toHaveCount(0)
}

for (const mode of ["bounded", "pushed"]) {
  test(`boba ${mode} validates radii, bounds allocation, and retains hover after resize`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(`/boba-validation-examples/?mode=${mode}`)
    const chart = page.getByTestId("boba-chart")
    const pearls = chart.locator(".semiotic-boba circle")
    await expect(pearls).toHaveCount(97)
    await hoverCup(page, chart, "Cup: 97 pearls; 97 shown")

    await page.getByRole("button", { name: "Negative radius" }).click()
    await expect(pearls).toHaveCount(97)
    await hoverCup(page, chart, "Cup: 97 pearls; 97 shown")

    await page.getByRole("button", { name: "Resize", exact: true }).click()
    await expect(chart.locator("canvas").first()).toHaveCSS("width", "340px")
    await hoverCup(page, chart, "Cup: 97 pearls; 97 shown")

    await page.getByRole("button", { name: "Tiny radius" }).click()
    await expect(pearls).toHaveCount(2000)
    await expect(chart.locator(".semiotic-boba")).toContainText("2000 shown")
    const requested = Math.floor(110 / (Math.PI * 1e-6 * 1e-6))
    await hoverCup(page, chart, `Cup: ${requested} pearls; 2000 shown`)

    await page.getByRole("button", { name: "No pearls" }).click()
    await expect(pearls).toHaveCount(0)
    await hoverCup(page, chart, "Cup: 0 pearls; 0 shown")
    expect(await chart.locator(".semiotic-boba").innerHTML()).not.toMatch(
      /NaN|Infinity/
    )
    expect(errors).toEqual([])
  })
}
