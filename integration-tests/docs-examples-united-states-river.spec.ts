import { expect, test, type Page } from "@playwright/test"

const ROUTE = "/examples/united-states-drawn-together"
const PAGE_TITLE = "The United States, Drawn Together"

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
  return page.locator(".usa-becoming .germany-becoming__chart-shell canvas").evaluate((canvas) => {
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
  await expect(page.getByRole("heading", { level: 3, name: "Three institutions, 262 years of movement" })).toBeVisible()
  await expect.poll(() => canvasHasPaint(page), { timeout: 30_000 }).toBe(true)
}

test.describe("United States institutional history river", () => {
  test("reads downward through persistent stock, transfers, rupture, and lifecycle exits", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const problems = collectBrowserProblems(page)
    await openExample(page)

    await expect(page.getByText("Time falls. Institutions persist. Jurisdictions move.")).toBeVisible()
    await expect(page.getByLabel("Persistent institution color key").getByText("United States", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Persistent institution color key").getByText("U.S. Territories", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Persistent institution color key").getByText("U.S. Colonies", { exact: true })).toBeVisible()
    await expect(page.getByText(/three blue institutions are intentionally not bonded/i)).toBeVisible()

    const canvasSize = await page.locator(".usa-becoming .germany-becoming__chart-shell canvas").evaluate((canvas) => ({
      width: (canvas as HTMLCanvasElement).width,
      height: (canvas as HTMLCanvasElement).height,
    }))
    expect(canvasSize.height).toBeGreaterThan(canvasSize.width)

    const chartLabels = page.locator(".usa-becoming .germany-becoming__chart-shell svg text")
    await expect(chartLabels.filter({ hasText: "United States" })).toHaveCount(1)
    await expect(chartLabels.filter({ hasText: "U.S. Territories" })).toHaveCount(1)
    await expect(chartLabels.filter({ hasText: "U.S. Colonies" })).toHaveCount(1)

    await page.getByLabel("Inspect an event").selectOption("CIVIL_WAR")
    await expect(page.locator(".usa-becoming .germany-becoming__reader").getByText("1860–1861", { exact: true })).toBeVisible()
    await expect(page.locator(".usa-becoming .germany-becoming__reader").getByRole("heading", { name: "The state band tears from within" })).toBeVisible()

    await expect(page.getByText(/Cuba appears twice because occupation ended in 1902/i)).toBeVisible()
    await expect(page.getByText(/Philippine rule is shown as one long route/i)).toBeVisible()

    const skipToTable = page.getByRole("link", { name: "Skip to data table" })
    await skipToTable.focus()
    await skipToTable.press("Enter")
    await expect(page.locator(".usa-becoming .germany-becoming__chart-shell table")).toHaveCount(1)

    await expect(page.getByRole("link", { name: /Territorial Acquisitions of the United States/ })).toHaveAttribute("href", /census\.gov/)
    await expect(page.getByRole("link", { name: /Philippine chronology/ })).toHaveAttribute("href", /doi\.gov/)
    expect(problems.errors).toEqual([])
    expect(problems.duplicateSceneWarnings).toEqual([])
  })

  test("contains the long river and status key in a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const problems = collectBrowserProblems(page)
    await openExample(page)

    const sizing = await page.locator(".usa-becoming").evaluate((host) => ({
      hostWidth: host.getBoundingClientRect().width,
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }))
    expect(sizing.hostWidth).toBeLessThanOrEqual(sizing.viewportWidth + 1)
    expect(sizing.documentWidth).toBeLessThanOrEqual(sizing.viewportWidth + 1)
    await expect(page.getByLabel("Persistent institution color key")).toBeVisible()
    await expect(page.getByText(/Width counts one status-bearing jurisdiction or polity thread/i)).toBeVisible()
    expect(problems.errors).toEqual([])
    expect(problems.duplicateSceneWarnings).toEqual([])
  })
})
