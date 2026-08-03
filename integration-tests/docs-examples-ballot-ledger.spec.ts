import { expect, test, type Page } from "@playwright/test"

const ROUTE = "/examples/ballot-transfer-ledger"
const PAGE_TITLE = "The 7,197-Vote Corridor"

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
  return page.locator(".ballot-ledger__chart-shell canvas").evaluate((canvas) => {
    const element = canvas as HTMLCanvasElement
    const context = element.getContext("2d")
    if (!context || element.width === 0 || element.height === 0) return false
    const pixels = context.getImageData(0, 0, element.width, element.height).data
    for (let index = 0; index < pixels.length; index += 16) {
      if (pixels[index + 3] > 10) return true
    }
    return false
  })
}

async function openExample(page: Page) {
  await page.goto(ROUTE, { waitUntil: "domcontentloaded" })
  await expect(page.getByRole("heading", { level: 1, name: PAGE_TITLE })).toBeVisible({
    timeout: 60_000,
  })
  await expect(page.getByRole("heading", { level: 3, name: "942,031 ballots through the final three eliminations" })).toBeVisible()
  await expect.poll(() => canvasHasPaint(page), { timeout: 15_000 }).toBe(true)
}

test.describe("NYC ballot transfer ledger", () => {
  test("audits the certified transfer sequence and conserves its evidence", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const problems = collectBrowserProblems(page)
    await openExample(page)

    await expect(page.getByLabel("Final margin: 7,197 votes")).toBeVisible()
    await expect(page.locator(".ballot-ledger__chart-shell svg").last()).toContainText("Eric Adams")
    await expect(page.locator(".ballot-ledger__chart-shell svg").last()).toContainText("Kathryn Garcia")

    const poolSelector = page.getByRole("group", { name: "Inspect a transfer pool" })
    const wiley = poolSelector.getByRole("button", { name: /Round 7 → Final Wiley 254,728 ballots/ })
    await expect(wiley).toHaveAttribute("aria-pressed", "true")
    await expect(page.locator(".ballot-ledger__gap-readout")).toContainText("87,725 → 7,197")
    await expect(page.locator(".ballot-ledger__transfer-bars")).toContainText("130,384")

    const yang = poolSelector.getByRole("button", { name: /Round 6 → Round 7 Yang 135,686 ballots/ })
    await yang.click()
    await expect(yang).toHaveAttribute("aria-pressed", "true")
    await expect(page.getByRole("heading", { level: 3, name: "Andrew Yang eliminated" })).toBeVisible()
    await expect(page.locator(".ballot-ledger__gap-readout")).toContainText("93,458 → 87,725")

    const skipToTable = page.getByRole("link", { name: "Skip to data table" })
    await skipToTable.focus()
    await skipToTable.press("Enter")
    await expect(page.locator(".ballot-ledger__chart-shell table")).toHaveCount(1)

    const source = page.getByRole("link", { name: /NYC Board of Elections/ })
    await expect(source).toHaveAttribute("href", /vote\.nyc/)
    expect(problems.errors).toEqual([])
    expect(problems.duplicateSceneWarnings).toEqual([])
  })

  test("keeps the ledger legible in a narrow analyst viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const problems = collectBrowserProblems(page)
    await openExample(page)

    const sizing = await page.locator(".ballot-ledger").evaluate((host) => ({
      hostWidth: host.getBoundingClientRect().width,
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }))
    expect(sizing.hostWidth).toBeLessThanOrEqual(sizing.viewportWidth + 1)
    expect(sizing.documentWidth).toBeLessThanOrEqual(sizing.viewportWidth + 1)

    const poolSelector = page.getByRole("group", { name: "Inspect a transfer pool" })
    await poolSelector.getByRole("button", { name: /Round 5 → Round 6 Field of three/ }).click()
    await expect(page.getByRole("heading", { level: 3, name: "Joint elimination" })).toBeVisible()
    await expect(page.locator(".ballot-ledger__transfer-bars")).toContainText("31,758")
    expect(problems.errors).toEqual([])
    expect(problems.duplicateSceneWarnings).toEqual([])
  })
})
