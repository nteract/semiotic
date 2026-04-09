import { test, expect } from "@playwright/test"
import * as fs from "fs"
import * as path from "path"

const galleryPath = path.resolve(__dirname, "../test-results/server-legend-gallery.html")

// Pre-generate the gallery if it doesn't exist
test.beforeAll(async () => {
  if (!fs.existsSync(galleryPath)) {
    const { execSync } = require("child_process")
    execSync("npx tsx generate-legend-test-page.ts", { cwd: path.resolve(__dirname, "..") })
  }
})

test.describe("Server-rendered SVG legend positioning", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`file://${galleryPath}`)
  })

  test("full gallery screenshot", async ({ page }) => {
    await page.screenshot({
      path: "test-results/server-legend-gallery.png",
      fullPage: true,
    })
    const svgCount = await page.locator("svg").count()
    expect(svgCount).toBe(11)
  })

  test("bar-legend-right: legend visible, not overlapping chart", async ({ page }) => {
    const container = page.locator("text=bar-legend-right").locator("..")
    const svg = container.locator("svg")
    const box = await svg.boundingBox()
    expect(box).not.toBeNull()

    const legend = svg.locator(".semiotic-legend")
    const legendBox = await legend.boundingBox()
    expect(legendBox).not.toBeNull()

    // Legend should be within the SVG bounds
    expect(legendBox!.x + legendBox!.width).toBeLessThanOrEqual(box!.x + box!.width + 5)

    await container.screenshot({ path: "test-results/bar-legend-right.png" })
  })

  test("bar-legend-left: legend on the left side", async ({ page }) => {
    const container = page.locator("text=bar-legend-left").locator("..")
    const svg = container.locator("svg")
    const legend = svg.locator(".semiotic-legend")
    const legendBox = await legend.boundingBox()
    const svgBox = await svg.boundingBox()
    expect(legendBox).not.toBeNull()

    expect(legendBox!.x - svgBox!.x).toBeLessThan(30)

    await container.screenshot({ path: "test-results/bar-legend-left.png" })
  })

  test("bar-legend-top: legend near the top", async ({ page }) => {
    const container = page.locator("text=bar-legend-top").locator("..")
    const svg = container.locator("svg")
    const legend = svg.locator(".semiotic-legend")
    const legendBox = await legend.boundingBox()
    const svgBox = await svg.boundingBox()
    expect(legendBox).not.toBeNull()

    expect(legendBox!.y - svgBox!.y).toBeLessThan(60)

    await container.screenshot({ path: "test-results/bar-legend-top.png" })
  })

  test("bar-legend-bottom: legend near the bottom", async ({ page }) => {
    const container = page.locator("text=bar-legend-bottom").locator("..")
    const svg = container.locator("svg")
    const legend = svg.locator(".semiotic-legend")
    const legendBox = await legend.boundingBox()
    const svgBox = await svg.boundingBox()
    expect(legendBox).not.toBeNull()

    const relY = legendBox!.y - svgBox!.y
    expect(relY).toBeGreaterThan(svgBox!.height * 0.5)

    await container.screenshot({ path: "test-results/bar-legend-bottom.png" })
  })

  test("line-legend-right: legend visible with colored lines", async ({ page }) => {
    const container = page.locator("text=line-legend-right").locator("..")
    const svg = container.locator("svg")
    const legend = svg.locator(".semiotic-legend")
    await expect(legend).toBeVisible()

    await container.screenshot({ path: "test-results/line-legend-right.png" })
  })

  test("pie-background: background covers full SVG area", async ({ page }) => {
    const container = page.locator("text=pie-background").locator("..")
    await container.screenshot({ path: "test-results/pie-background.png" })
  })

  test("line-colorscheme: two different colored paths", async ({ page }) => {
    const container = page.locator("text=line-colorscheme").locator("..")
    await container.screenshot({ path: "test-results/line-colorscheme.png" })

    const svgContent = await container.locator("svg").innerHTML()
    expect(svgContent).toContain("#0EA4AF")
    expect(svgContent).toContain("#DB2187")
  })
})
