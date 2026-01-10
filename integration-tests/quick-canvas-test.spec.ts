import { test, expect } from "@playwright/test"

test("canvas rendering debug test", async ({ page }) => {
  await page.goto("http://localhost:1235/canvas-test.html")

  // Wait for React to render
  await page.waitForSelector("h1", { timeout: 10000 })
  await page.waitForTimeout(2000)

  // Check console logs
  const logs: string[] = []
  page.on("console", msg => logs.push(msg.text()))

  // Count SVG and Canvas elements
  const svgCount = await page.locator("svg.visualization-layer").count()
  const canvasCount = await page.locator("canvas").count()

  console.log(`SVG elements: ${svgCount}`)
  console.log(`Canvas elements: ${canvasCount}`)
  console.log(`Console logs:`, logs)

  // Take a screenshot
  await page.screenshot({ path: "test-results/canvas-debug.png", fullPage: true })

  // Check if canvas exists
  if (canvasCount > 0) {
    const canvas = page.locator("canvas").first()
    const className = await canvas.getAttribute("class")
    const isVisible = await canvas.isVisible()
    console.log(`Canvas className: ${className}`)
    console.log(`Canvas visible: ${isVisible}`)
  }

  // This test is just for debugging, so we'll pass regardless
  expect(true).toBe(true)
})
