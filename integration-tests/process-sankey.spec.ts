import { test, expect } from "@playwright/test"

// ProcessSankey is hand-rolled SVG (no canvas), so the canvas-based
// `waitForChartReady` helper doesn't apply. We assert against the
// `<svg>` the component paints + the band/ribbon paths inside.

const PAGE = "/process-sankey-examples/"

const SVG = "svg[aria-labelledby='process-sankey-title process-sankey-desc']"

test.describe("ProcessSankey - Static", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
  })

  test("renders categorical-colored bands and a legend", async ({ page }) => {
    const tc = page.locator('[data-testid="static-basic"]')
    await expect(tc).toBeVisible()
    const svg = tc.locator(SVG)
    await expect(svg).toBeVisible()
    // At least one band per node + one ribbon per edge → many <path>s.
    const paths = svg.locator("path")
    expect(await paths.count()).toBeGreaterThan(3)
    // Legend group is rendered with aria-label="Legend".
    await expect(svg.locator("g[aria-label='Legend']")).toBeVisible()
    // Each distinct category becomes a swatch row.
    const swatches = svg.locator("g[aria-label='Legend'] > g")
    expect(await swatches.count()).toBeGreaterThanOrEqual(3)
  })

  test("particles render when showParticles is on", async ({ page }) => {
    const tc = page.locator('[data-testid="static-particles"]')
    await expect(tc).toBeVisible()
    const svg = tc.locator(SVG)
    // Particles are <circle> elements (one per ribbon × N per edge).
    // After mount + a couple frames, there should be at least one.
    await page.waitForTimeout(150)
    const circles = svg.locator("circle")
    expect(await circles.count()).toBeGreaterThan(0)
  })
})

test.describe("ProcessSankey - Push API", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
  })

  test("seeding via ref grows the chart", async ({ page }) => {
    const tc = page.locator('[data-testid="push-demo"]')
    await expect(tc).toBeVisible()
    const svg = tc.locator(SVG)
    // Empty initial state → SVG is present but draws no bands/ribbons.
    expect(await svg.locator("path").count()).toBe(0)

    await tc.locator('[data-testid="push-seed"]').click()
    // After seed, paths populate.
    await expect.poll(async () => await svg.locator("path").count(), { timeout: 5_000 }).toBeGreaterThan(2)
    // Counter reflects the queued items.
    await expect(tc.locator('[data-testid="push-count"]')).toHaveText(/pushed \d+/)
  })

  test("clear() empties the chart back out", async ({ page }) => {
    const tc = page.locator('[data-testid="push-demo"]')
    await tc.locator('[data-testid="push-seed"]').click()
    await expect.poll(async () => await tc.locator(SVG).locator("path").count()).toBeGreaterThan(0)
    await tc.locator('[data-testid="push-clear"]').click()
    await expect.poll(async () => await tc.locator(SVG).locator("path").count()).toBe(0)
    await expect(tc.locator('[data-testid="push-count"]')).toHaveText("pushed 0")
  })
})

test.describe("ProcessSankey - Validation", () => {
  test("backward-in-time edges render an inline error block", async ({ page }) => {
    await page.goto(PAGE)
    const tc = page.locator('[data-testid="validation-failure"]')
    await expect(tc).toBeVisible()
    // Chart renders an error <svg> with the failure message text.
    await expect(tc.locator("svg")).toContainText(/data invalid/i)
    await expect(tc.locator("svg")).toContainText(/backward-edge|ends before/i)
  })
})

test.describe("ProcessSankey - Rendering Integrity", () => {
  test("loads without JS errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))
    await page.goto(PAGE)
    // Allow first paint + a couple frames for particle rAF.
    await page.waitForTimeout(300)
    const real = errors.filter((e) => !e.includes("act(") && !e.includes("Warning:"))
    expect(real).toEqual([])
  })
})
