import { expect, test } from "@playwright/test"

for (const [family, mode] of [
  ["xy", "bounded"],
  ["xy", "pushed"],
  ["ordinal", "bounded"],
  ["ordinal", "pushed"],
  ["network", "bounded"],
  ["geo", "bounded"],
  ["physics", "bounded"]
]) {
  test(`${family} ${mode}: keyboard-only announcements and table paging focus`, async ({
    page
  }) => {
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    await page.goto(
      `/accessibility-regression-examples/?family=${family}&mode=${mode}`
    )
    const chart = page.getByTestId("chart")
    const frame = chart.locator('[role="group"][tabindex="0"]').first()
    const live = chart.locator('[aria-live="polite"]')
    const tooltip = chart.locator(
      ".stream-frame-tooltip, .stream-ordinal-tooltip, .stream-network-tooltip, .stream-geo-tooltip, .stream-physics-tooltip"
    )
    const checkMark = async () => {
      await frame.focus()
      await page.keyboard.press("Home")
      await expect(live).toContainText("Mark")
      const ring = chart
        .locator('svg[aria-hidden="true"] [stroke-dasharray]')
        .first()
      await expect(ring).toBeVisible()
      const box = (await ring.boundingBox())!
      // Switching input modality on the same mark must also silence the region.
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await expect(tooltip).toContainText("Mark")
      await expect(live).toBeEmpty()
      await page.keyboard.press("Home")
      await expect(live).toContainText("Mark")
      await page.keyboard.press("Escape")
      await expect(live).toBeEmpty()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await expect(tooltip).toContainText("Mark")
      await expect(live).toBeEmpty()
      const tip = (await tooltip.boundingBox())!
      const plot = (await chart.locator("canvas").first().boundingBox())!
      expect(tip.x).toBeGreaterThanOrEqual(plot.x + 19)
      expect(tip.y).toBeGreaterThanOrEqual(plot.y + 19)
      expect(tip.x + tip.width).toBeLessThanOrEqual(plot.x + plot.width - 19)
      expect(tip.y + tip.height).toBeLessThanOrEqual(plot.y + plot.height - 19)
      await page.getByRole("button", { name: "After chart" }).hover()
      await expect(tooltip).toHaveCount(0)
    }
    await checkMark()
    await page.getByRole("button", { name: "Resize chart" }).click()
    await expect(chart.locator("canvas").first()).toHaveCSS("width", "360px")
    await checkMark()

    if (family === "network") {
      await frame.focus()
      await page.keyboard.press("Home")
      const ring = chart
        .locator('svg[aria-hidden="true"] [stroke-dasharray]')
        .first()
      await expect(ring).toBeVisible()
      const firstNode = (await ring.boundingBox())!
      // The title can increase the effective top margin. Locate the painted
      // endpoint before moving to the midpoint of its 75px horizontal edge.
      await page.mouse.move(
        firstNode.x + firstNode.width / 2 + 37.5,
        firstNode.y + firstNode.height / 2
      )
      await expect(tooltip).toContainText("Mark 0 → Mark 1: 1")
      await expect(live).toBeEmpty()
      await page.getByRole("button", { name: "After chart" }).hover()
      await expect(tooltip).toHaveCount(0)
    }

    const trigger = chart.getByRole("button", { name: /View data summary/ })
    await trigger.focus()
    await page.keyboard.press("Enter")
    const region = chart.getByRole("region", { name: /Data summary/ })
    await expect(region).toBeFocused()
    for (const kind of family === "network" ? ["nodes", "edges"] : ["rows"]) {
      const more = region.getByRole("button", {
        name: new RegExp(`more ${kind}`)
      })
      await more.focus()
      await page.keyboard.press("Enter")
      await expect(region.locator("tbody tr:focus")).toHaveCount(1)
      await expect(region.getByRole("status")).toContainText(`7 of 7 ${kind}`)
    }
    await region.getByRole("button", { name: "Close data summary" }).click()
    await expect(trigger).toBeFocused()
    expect(errors).toEqual([])
  })
}

test("clipboard denials and success are reported by public and documentation buttons", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("Denied")
        }
      }
    })
    document.execCommand = () => false
  })
  await page.goto("/accessibility-regression-examples/")
  await page.getByTestId("intent").locator("summary").click()
  for (const id of ["intent", "code", "toolbar"]) {
    const component = page.getByTestId(id)
    await component.getByRole("button", { name: /Copy/ }).click()
    await expect(component.getByRole("status")).toContainText("Copy failed")
    await expect(
      component.getByRole("button", { name: "Copy failed" })
    ).toBeVisible()
    await page.evaluate(() => {
      navigator.clipboard.writeText = async () => {}
    })
    await component.getByRole("button", { name: "Copy failed" }).click()
    await expect(component.getByRole("status")).toHaveText("Copied")
    await page.evaluate(() => {
      navigator.clipboard.writeText = async () => {
        throw new Error("Denied")
      }
    })
  }
  expect(errors).toEqual([])
})
