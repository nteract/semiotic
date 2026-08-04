import { expect, test, type Page } from "@playwright/test"

const ROUTE = "/examples/germany-still-becoming"
const PAGE_TITLE = "Germany, Still Becoming"

function collectBrowserProblems(page: Page) {
  const errors: string[] = []
  const duplicateSceneWarnings: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
    if (message.text().includes("performed scene rebuild with unchanged scene revisions")) {
      duplicateSceneWarnings.push(message.text())
    }
  })
  page.on("pageerror", (error) => errors.push(error.message))
  return { errors, duplicateSceneWarnings }
}

async function canvasHasPaint(page: Page) {
  return page.locator(".process-river__chart-shell canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement
    const context = element.getContext("2d")
    if (!context || element.width === 0 || element.height === 0) return false
    const pixels = context.getImageData(0, 0, element.width, element.height).data
    for (let index = 0; index < pixels.length; index += 32) {
      if (pixels[index + 3] > 10) return true
    }
    return false
  })
}

async function openExample(page: Page) {
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { level: 1, name: PAGE_TITLE })).toBeVisible({ timeout: 60_000 })
  await expect(page.getByRole("heading", { level: 3, name: "Twelve openings, one changing river" })).toBeVisible()
  await expect.poll(() => canvasHasPaint(page), { timeout: 20_000 }).toBe(true)
}

test.describe("Germany history river", () => {
  test("reads top-to-bottom and lets the reader change the conserved endpoint measure", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const problems = collectBrowserProblems(page)
    await openExample(page)

    await expect(page.getByText("Time falls. Width is conserved. Names change.")).toBeVisible()
    await expect(page.getByText(/They are not estimates of that node's historical population/i)).toBeVisible()

    const widthControl = page.getByRole("group", { name: "Choose what controls river width" })
    await expect(widthControl.getByRole("button", { name: "Balanced" })).toHaveAttribute("aria-pressed", "true")
    const gdrLabel = page.locator(".process-river__chart-shell svg text").filter({ hasText: /^GDR$/ })
    const labelX = async () => Number(await gdrLabel.getAttribute("x"))
    const balancedLabelX = await labelX()
    await widthControl.getByRole("button", { name: "Land" }).click()
    await expect(widthControl.getByRole("button", { name: "Land" })).toHaveAttribute("aria-pressed", "true")
    await expect.poll(labelX).not.toBe(balancedLabelX)

    const landLabelX = await labelX()
    await widthControl.getByRole("button", { name: "People" }).click()
    await expect.poll(labelX).not.toBe(landLabelX)

    const peopleLabelX = await labelX()
    await widthControl.getByRole("button", { name: "Economy" }).click()
    await expect.poll(labelX).not.toBe(peopleLabelX)

    const canvasSize = await page.locator(".process-river__chart-shell canvas").evaluate((canvas) => ({
      width: (canvas as HTMLCanvasElement).width,
      height: (canvas as HTMLCanvasElement).height,
    }))
    expect(canvasSize.height).toBeGreaterThan(canvasSize.width)

    await expect(page.locator(".process-river__chart-shell svg text").filter({ hasText: "Germany" }).last()).toHaveAttribute("text-anchor", "middle")

    await page.getByLabel("Inspect a stage").selectOption("S05")
    await expect(page.locator(".process-river__reader").getByText("1867", { exact: true })).toBeVisible()
    await expect(page.locator(".process-river__reader").getByRole("heading", { name: /North German Confederation and southern states/ })).toBeVisible()

    const skipToTable = page.getByRole("link", { name: "Skip to data table" })
    await skipToTable.focus()
    await skipToTable.press("Enter")
    await expect(page.locator(".process-river__chart-shell table")).toHaveCount(1)

    await expect(page.getByRole("link", { name: /Forging an Empire, Bismarckian Germany/ })).toHaveAttribute("href", /germanhistorydocs\.org/)
    expect(problems.errors).toEqual([])
    expect(problems.duplicateSceneWarnings).toEqual([])
  })

  test("keeps the long vertical river contained in a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const problems = collectBrowserProblems(page)
    await openExample(page)

    const sizing = await page.locator(".germany-becoming").evaluate((host) => ({
      hostWidth: host.getBoundingClientRect().width,
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }))
    expect(sizing.hostWidth).toBeLessThanOrEqual(sizing.viewportWidth + 1)
    expect(sizing.documentWidth).toBeLessThanOrEqual(sizing.viewportWidth + 1)

    const widthControl = page.getByRole("group", { name: "Choose what controls river width" })
    await widthControl.getByRole("button", { name: "Economy" }).click()
    await expect(widthControl.getByRole("button", { name: "Economy" })).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByText(/Width currently follows the share of Germany’s 2022 nominal GDP/)).toBeVisible()
    expect(problems.errors).toEqual([])
    expect(problems.duplicateSceneWarnings).toEqual([])
  })
})
