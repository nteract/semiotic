import { test, expect } from "@playwright/test"

test("check xy-examples page for errors", async ({ page }) => {
  const errors: string[] = []
  const consoleLogs: string[] = []

  page.on("pageerror", err => errors.push(err.message))
  page.on("console", msg => {
    if (msg.type() === "error") {
      consoleLogs.push(`ERROR: ${msg.text()}`)
    } else {
      consoleLogs.push(msg.text())
    }
  })

  await page.goto("http://localhost:1234/xy-examples/")
  await page.waitForTimeout(3000)

  console.log("=== Page Errors ===")
  errors.forEach(e => console.log(e))

  console.log("\n=== Console Logs ===")
  consoleLogs.forEach(l => console.log(l))

  console.log("\n=== Element Counts ===")
  const testCases = await page.locator('[data-testid]').count()
  const svgs = await page.locator("svg.visualization-layer").count()
  const canvases = await page.locator("canvas").count()

  console.log(`Test cases: ${testCases}`)
  console.log(`SVG elements: ${svgs}`)
  console.log(`Canvas elements: ${canvases}`)

  // Get list of test IDs
  const testIds = await page.locator('[data-testid]').evaluateAll(els =>
    els.map(el => el.getAttribute('data-testid'))
  )
  console.log("\n=== Test IDs found ===")
  testIds.forEach(id => console.log(`  - ${id}`))

  // Check specific canvas example
  const canvasTest = page.locator('[data-testid="xy-line-canvas"]')
  const canvasTestVisible = await canvasTest.isVisible().catch(() => false)
  console.log(`\nCanvas test case visible: ${canvasTestVisible}`)

  if (canvasTestVisible) {
    const svgInCanvas = await canvasTest.locator("svg").count()
    const canvasInCanvas = await canvasTest.locator("canvas").count()
    console.log(`  SVG inside canvas test: ${svgInCanvas}`)
    console.log(`  Canvas inside canvas test: ${canvasInCanvas}`)
  }

  await page.screenshot({ path: "test-results/xy-examples-debug.png", fullPage: true })
})
