import { test, expect } from "@playwright/test"

test("debug canvas scatter", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", err => errors.push(err.message))
  page.on("console", msg => {
    if (msg.type() === "error") {
      console.log(`ERROR: ${msg.text()}`)
    }
  })

  await page.goto("http://localhost:1234/xy-examples/")
  await page.waitForTimeout(2000)

  // Check the canvas scatter test case
  const testCase = page.locator('[data-testid="xy-scatter-canvas"]')
  const testCaseVisible = await testCase.isVisible()
  console.log(`Test case visible: ${testCaseVisible}`)

  if (testCaseVisible) {
    const svgCount = await testCase.locator("svg").count()
    const canvasCount = await testCase.locator("canvas").count()
    const vizLayerCount = await testCase.locator("svg.visualization-layer").count()

    console.log(`SVG count: ${svgCount}`)
    console.log(`Canvas count: ${canvasCount}`)
    console.log(`SVG.visualization-layer count: ${vizLayerCount}`)

    // Get all elements
    const allElements = await testCase.locator("*").evaluateAll(els =>
      els.map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id
      })).filter(e => e.tag === "SVG" || e.tag === "CANVAS" || e.tag === "DIV")
    )

    console.log("Elements found:", JSON.stringify(allElements, null, 2))

    await testCase.screenshot({ path: "test-results/canvas-scatter-debug.png" })
  } else {
    console.log("Test case not visible!")
  }

  if (errors.length > 0) {
    console.log("Page errors:", errors)
  }
})
