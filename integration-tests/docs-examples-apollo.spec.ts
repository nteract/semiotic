import { expect, test, type Page } from "@playwright/test"

const ROUTE = "/examples/apollo-lunar-choreography"
const PAGE_TITLE = "The Third Seat: Apollo’s Lunar Choreography"

function collectBrowserErrors(page: Page) {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))
  return errors
}

async function canvasHasPaint(page: Page) {
  return page.locator(".apollo-example__chart-shell canvas").evaluate((canvas) => {
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
  await expect(page.getByRole("heading", { level: 3, name: "Where the crew sits, by hour after launch" })).toBeVisible()
  await expect.poll(() => canvasHasPaint(page), { timeout: 15_000 }).toBe(true)
}

test.describe("Apollo lunar choreography", () => {
  test("turns NASA mission chronology into an explorable conserved process", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    await expect(page.getByText("27", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("24", { exact: true }).first()).toBeVisible()
    const packedLabelY = await page.locator(".apollo-example__chart-shell svg text").evaluateAll((labels) =>
      Object.fromEntries(labels
        .filter((label) => label.getAttribute("font-weight") === "600")
        .map((label) => [label.textContent, label.getBoundingClientRect().y])),
    ) as Record<string, number>
    // The underlying lanes align; their nearby left-edge labels may use one
    // 15px collision-avoidance stagger so the two names remain readable.
    expect(Math.abs(packedLabelY.Launch - packedLabelY["Lunar orbit"])).toBeLessThanOrEqual(16)
    expect(Math.abs(packedLabelY["LM lifeboat"] - packedLabelY.Recovery)).toBeLessThan(1)
    expect(Math.abs(packedLabelY["Low pass"] - packedLabelY["Lunar surface"])).toBeGreaterThanOrEqual(18)
    const skipToTable = page.getByRole("link", { name: "Skip to data table" })
    await skipToTable.focus()
    await skipToTable.press("Enter")
    await expect(page.locator(".apollo-example__chart-shell table")).toHaveCount(1)

    const storyLenses = page.getByRole("group", { name: "Story lens" })
    await storyLenses.getByRole("button", { name: /Apollo 13 The choreography breaks/ }).click()
    await expect(storyLenses.getByRole("button", { name: /Apollo 13 The choreography breaks/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(page.getByRole("heading", { level: 3, name: "Apollo 13" })).toBeVisible()
    await expect(page.locator(".apollo-example__chart-heading")).toContainText("never enters lunar orbit")
    await expect(page.locator(".apollo-example__chart-shell svg").last()).toContainText(/LM lifeboat/i)

    await page.getByRole("button", { name: "Reveal layout telemetry" }).click()
    await expect(page.locator(".apollo-example__chart-shell svg").first()).toContainText("crossings:")

    const missionPicker = page.getByRole("group", { name: "Select one Apollo mission" })
    await missionPicker.getByRole("button", { name: /A17 landed/ }).click()
    await expect(page.getByRole("heading", { level: 3, name: "Apollo 17" })).toBeVisible()
    await expect(page.locator(".apollo-example__dossier-note")).toContainText("3.1 days")

    await page.getByRole("button", { name: "Back to all missions" }).click()
    await expect(storyLenses.getByRole("button", { name: /All nine The whole choreography/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(page.getByRole("button", { name: "Back to all missions" })).toHaveCount(0)

    await page.getByRole("group", { name: "Lane placement" }).getByRole("button", { name: "Full stack" }).click()
    await expect(page.getByRole("button", { name: "Full stack" })).toHaveAttribute("aria-pressed", "true")
    await expect.poll(() => canvasHasPaint(page)).toBe(true)
    expect(browserErrors).toEqual([])
  })

  test("fits the story and chart into a narrow reading viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    const chartSizing = await page.locator(".apollo-example__chart-shell").evaluate((host) => {
      const svg = host.querySelector("svg")
      return {
        hostWidth: host.getBoundingClientRect().width,
        svgWidth: svg?.getBoundingClientRect().width ?? 0,
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      }
    })
    expect(chartSizing.svgWidth).toBeGreaterThan(280)
    expect(chartSizing.svgWidth).toBeLessThanOrEqual(chartSizing.hostWidth + 2)
    expect(chartSizing.documentWidth).toBeLessThanOrEqual(chartSizing.viewportWidth + 1)
    expect(browserErrors).toEqual([])
  })

  test("honors reduced motion without hiding the process", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    const browserErrors = collectBrowserErrors(page)
    await openExample(page)

    const motionControl = page.getByRole("button", { name: "Motion preference respected" })
    await expect(motionControl).toBeDisabled()
    await expect.poll(() => canvasHasPaint(page)).toBe(true)
    expect(browserErrors).toEqual([])
  })
})
