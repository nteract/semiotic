import { expect, test, type Locator, type Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { waitForRafs } from "./helpers"

async function center(locator: Locator) {
  const box = (await locator.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function drag(page: Page, from: { x: number; y: number }, dx: number) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(from.x + dx, from.y, { steps: 8 })
  await page.mouse.up()
}

test.describe("LinearBrush", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/xy-examples/?linear-brush")
  })

  test("resizes an end, moves the range, and ends once per release", async ({ page }) => {
    const brush = page.getByTestId("linear-brush-standalone")
    const part = (name: string) => brush.locator(`[data-semiotic-brush-part="${name}"]`)
    // 400px track over [0, 100]: 4px per unit.
    await drag(page, await center(part("end")), 80)
    await expect(brush).toHaveAttribute("data-value", "20,80")
    await expect(brush).toHaveAttribute("data-ends", "1")

    await drag(page, await center(part("selection")), -40)
    await expect(brush).toHaveAttribute("data-value", "10,70")
    await expect(brush).toHaveAttribute("data-ends", "2")
  })

  test("steps with the keyboard and resets on double-click", async ({ page }) => {
    const brush = page.getByTestId("linear-brush-standalone")
    const end = brush.getByRole("slider", { name: "Percent range end" })
    // A grabbed end shows no focus ring; keyboard focus does.
    await drag(page, await center(end), 0)
    await expect(end).toBeFocused()
    await expect(end).toHaveCSS("outline-style", "none")
    await page.keyboard.press("ArrowLeft")
    await expect(brush).toHaveAttribute("data-value", "20,55")
    await page.keyboard.press("Tab")
    await page.keyboard.press("Shift+Tab")
    await expect(end).toBeFocused()
    await expect(end).toHaveCSS("outline-style", "solid")
    await page.keyboard.press("Shift+ArrowRight")
    await expect(brush).toHaveAttribute("data-value", "20,75")
    await brush.getByRole("slider", { name: "Percent range (move both ends)" }).focus()
    await page.keyboard.press("End")
    await expect(brush).toHaveAttribute("data-value", "45,100")

    await brush.locator('[data-semiotic-brush-part="selection"]').dblclick()
    await expect(brush).toHaveAttribute("data-value", "0,100")
    // At the domain ends the extent labels flip inward and the domain labels drop out.
    await expect(brush.locator("[data-semiotic-brush-label]")).toHaveCount(2)
    await expect(brush.locator('[data-semiotic-brush-label="start"]')).toHaveAttribute("data-placement", "after")
    await expect(brush.locator('[data-semiotic-brush-label="end"]')).toHaveAttribute("data-placement", "before")
  })

  test("commits an overlay brush on release from its full-extent state", async ({ page }) => {
    const overlay = page.getByTestId("linear-brush-overlay")
    const part = (name: string) => overlay.locator(`[data-semiotic-brush-part="${name}"]`)
    await expect(part("start")).toHaveAttribute("aria-valuetext", "Jan 1 2024")
    // 440px plot over 59 days.
    await drag(page, await center(part("start")), 110)
    await expect(overlay).not.toHaveAttribute("data-committed", "")
    const [start, end] = (await overlay.getAttribute("data-committed"))!.split(",").map(Number)
    expect(Math.round((start - Date.UTC(2024, 0, 1)) / 86400000)).toBe(15)
    expect(end).toBe(Date.UTC(2024, 0, 1) + 59 * 86400000)
    await expect(part("start")).toHaveAttribute("aria-valuetext", /^Jan 1[56] 2024$/)
  })

  test("matches the built-in and custom looks", async ({ page }) => {
    await waitForRafs(page, 2)
    await expect(page.getByTestId("linear-brush-standalone")).toHaveScreenshot("linear-brush-standalone.png", {
      maxDiffPixels: 100,
    })
    const overlay = page.getByTestId("linear-brush-overlay")
    await overlay.getByRole("slider", { name: "Time window start" }).focus()
    await page.keyboard.press("PageUp")
    await page.keyboard.press("PageUp")
    await overlay.getByRole("slider", { name: "Time window end" }).focus()
    await page.keyboard.press("PageDown")
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await waitForRafs(page, 2)
    await expect(overlay).toHaveScreenshot("linear-brush-overlay.png", { maxDiffPixels: 200 })
  })

  test("has no accessibility violations", async ({ page }) => {
    await waitForRafs(page, 2)
    const results = await new AxeBuilder({ page })
      .exclude("canvas")
      .disableRules(["landmark-one-main", "region", "nested-interactive"])
      .analyze()
    expect(results.violations).toEqual([])
  })
})
