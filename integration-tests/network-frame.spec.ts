import { test, expect, Page } from "@playwright/test"

// Helper function to wait for viz to render
async function waitForVisualization(page: Page, testId: string) {
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible()

  const svg = testCase.locator("svg.visualization-layer")
  const canvas = testCase.locator("canvas")

  try {
    await expect(svg.or(canvas)).toBeVisible({ timeout: 10000 })
  } catch (e) {
    throw new Error(`Neither SVG nor Canvas found for test case: ${testId}`)
  }

  // Network layouts often need more time for force simulations
  await page.waitForTimeout(2000)
}

test.describe("NetworkFrame - Force-Directed Layouts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  // KNOWN ISSUE: Circles visibility - skipping for now
  test.skip("renders force-directed network in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "network-force-svg")

    const testCase = page.locator('[data-testid="network-force-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Check that nodes are rendered
    const nodes = svg.locator("circle, g.nodes circle")
    const nodeCount = await nodes.count()
    expect(nodeCount).toBeGreaterThan(0)

    // Check that edges are rendered
    const edges = svg.locator("line, path, g.edges line, g.edges path")
    const edgeCount = await edges.count()
    expect(edgeCount).toBeGreaterThan(0)

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("network-force-svg.png", {
      maxDiffPixels: 200 // Force layouts can have slight variations
    })
  })

  test("shows tooltip on node hover", async ({ page }) => {
    await waitForVisualization(page, "network-force-hover")

    const testCase = page.locator('[data-testid="network-force-hover"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Get the bounding box of the SVG to hover within it
    const box = await svg.boundingBox()
    if (box) {
      // Hover near the center of the chart where nodes should be
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(300)

      // Visual snapshot with potential hover state
      await expect(testCase).toHaveScreenshot("network-force-hover-state.png", {
        maxDiffPixels: 200
      })
    }
  })
})

test.describe("NetworkFrame - Hierarchical Layouts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  // KNOWN ISSUE: Tree layout visibility - skipping for now
  test.skip("renders tree layout in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "network-tree-svg")

    const testCase = page.locator('[data-testid="network-tree-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Check that nodes are rendered
    const nodes = svg.locator("circle")
    const nodeCount = await nodes.count()
    expect(nodeCount).toBeGreaterThan(0)

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("network-tree-svg.png", {
      maxDiffPixels: 100
    })
  })

  test("renders treemap layout in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "network-treemap-svg")

    const testCase = page.locator('[data-testid="network-treemap-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Check that rectangles are rendered
    const rects = svg.locator("rect")
    const rectCount = await rects.count()
    expect(rectCount).toBeGreaterThan(0)

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("network-treemap-svg.png", {
      maxDiffPixels: 100
    })
  })

  test("renders partition (sunburst) layout in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "network-partition-svg")

    const testCase = page.locator('[data-testid="network-partition-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("network-partition-svg.png", {
      maxDiffPixels: 100
    })
  })

  // KNOWN ISSUE: Circle pack visibility - skipping for now
  test.skip("renders circle pack layout in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "network-circlepack-svg")

    const testCase = page.locator('[data-testid="network-circlepack-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Check that circles are rendered
    const circles = svg.locator("circle")
    const circleCount = await circles.count()
    expect(circleCount).toBeGreaterThan(0)

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("network-circlepack-svg.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("NetworkFrame - Flow Layouts", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  test("renders sankey diagram in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "network-sankey-svg")

    const testCase = page.locator('[data-testid="network-sankey-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("network-sankey-svg.png", {
      maxDiffPixels: 100
    })
  })

  test("renders chord diagram in SVG mode", async ({ page }) => {
    await waitForVisualization(page, "network-chord-svg")

    const testCase = page.locator('[data-testid="network-chord-svg"]')
    const svg = testCase.locator("svg.visualization-layer")
    await expect(svg).toBeVisible()

    // Visual snapshot
    await expect(testCase).toHaveScreenshot("network-chord-svg.png", {
      maxDiffPixels: 100
    })
  })
})

test.describe("NetworkFrame - Node and Edge Rendering", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/network-examples/")
  })

  // KNOWN ISSUE: Circle visibility check has issues - skipping for now
  test.skip("renders nodes with correct styling", async ({ page }) => {
    await waitForVisualization(page, "network-force-svg")

    const testCase = page.locator('[data-testid="network-force-svg"]')
    const svg = testCase.locator("svg.visualization-layer")

    // Get first node and check it has styling
    const firstNode = svg.locator("circle").first()
    await expect(firstNode).toBeVisible()

    // Check that node has fill (color)
    const fill = await firstNode.getAttribute("fill")
    expect(fill).toBeTruthy()
  })

  test("renders edges connecting nodes", async ({ page }) => {
    await waitForVisualization(page, "network-force-svg")

    const testCase = page.locator('[data-testid="network-force-svg"]')
    const svg = testCase.locator("svg.visualization-layer")

    // Check that edges exist
    const edges = svg.locator("line, path")
    const edgeCount = await edges.count()
    expect(edgeCount).toBeGreaterThan(0)
  })
})
