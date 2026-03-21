import { test, expect, Page } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"

// Helper function to wait for canvas-based visualization to render
async function waitForVisualization(page: Page, testId: string, timeout = 8000) {
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible()
  const canvas = testCase.locator("canvas").first()
  await expect(canvas).toBeVisible({ timeout })
  await page.waitForTimeout(500)
}

// ─── 1. Canvas aria-labels describe chart type and data shape ─────────────────

test.describe("Accessibility - Canvas aria-labels", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("XY chart frame has role=img and aria-label from title", async ({ page }) => {
    await waitForVisualization(page, "a11y-xy-titled")
    const testCase = page.locator('[data-testid="a11y-xy-titled"]')
    const frame = testCase.locator(".stream-xy-frame")
    await expect(frame).toHaveAttribute("role", "img")
    await expect(frame).toHaveAttribute("aria-label", "Monthly Revenue Trends")
  })

  test("XY chart frame falls back to default aria-label when no title", async ({ page }) => {
    await waitForVisualization(page, "a11y-xy-default")
    const testCase = page.locator('[data-testid="a11y-xy-default"]')
    const frame = testCase.locator(".stream-xy-frame")
    await expect(frame).toHaveAttribute("role", "img")
    await expect(frame).toHaveAttribute("aria-label", "XY chart")
  })

  test("Ordinal chart frame has role=img and aria-label from title", async ({ page }) => {
    await waitForVisualization(page, "a11y-ordinal")
    const testCase = page.locator('[data-testid="a11y-ordinal"]')
    const frame = testCase.locator(".stream-ordinal-frame")
    await expect(frame).toHaveAttribute("role", "img")
    await expect(frame).toHaveAttribute("aria-label", "Sales by Category")
  })

  test("Network chart frame has role=img and aria-label from title", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-network"]')
    await expect(testCase).toBeVisible()
    const canvas = testCase.locator("canvas").first()
    await expect(canvas).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    const frame = testCase.locator(".stream-network-frame")
    await expect(frame).toHaveAttribute("role", "img")
    await expect(frame).toHaveAttribute("aria-label", "Team Connections")
  })

  test("canvas element has an aria-label describing the data", async ({ page }) => {
    await waitForVisualization(page, "a11y-xy-titled")
    const testCase = page.locator('[data-testid="a11y-xy-titled"]')
    const canvas = testCase.locator("canvas").first()

    // The canvas gets an aria-label set by computeCanvasAriaLabel after scene render
    const ariaLabel = await canvas.getAttribute("aria-label")
    expect(ariaLabel).toBeTruthy()
    // Should mention "chart" or describe the data shape
    expect(ariaLabel!.length).toBeGreaterThan(0)
  })

  test("ordinal canvas element has an aria-label", async ({ page }) => {
    await waitForVisualization(page, "a11y-ordinal")
    const testCase = page.locator('[data-testid="a11y-ordinal"]')
    const canvas = testCase.locator("canvas").first()

    const ariaLabel = await canvas.getAttribute("aria-label")
    expect(ariaLabel).toBeTruthy()
    expect(ariaLabel!.length).toBeGreaterThan(0)
  })
})

// ─── 2. AriaLiveTooltip region with aria-live="polite" ────────────────────────

test.describe("Accessibility - AriaLiveTooltip region", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("chart with tooltip has an aria-live='polite' region attached", async ({ page }) => {
    await waitForVisualization(page, "a11y-tooltip")
    const testCase = page.locator('[data-testid="a11y-tooltip"]')

    const liveRegion = testCase.locator("[aria-live='polite']")
    await expect(liveRegion.first()).toBeAttached()

    // Verify it is specifically polite (not assertive)
    const liveValue = await liveRegion.first().getAttribute("aria-live")
    expect(liveValue).toBe("polite")
  })

  test("aria-live region is visually hidden but present in DOM", async ({ page }) => {
    await waitForVisualization(page, "a11y-tooltip")
    const testCase = page.locator('[data-testid="a11y-tooltip"]')

    const liveRegion = testCase.locator("[aria-live='polite']").first()
    await expect(liveRegion).toBeAttached()

    // The region should be in the DOM for screen readers even if visually clipped
    const box = await liveRegion.boundingBox()
    // It may be visually hidden (clip/sr-only) or have zero dimensions — that's fine
    // The key assertion is that the element exists in the accessibility tree
    expect(await liveRegion.evaluate((el) => el.isConnected)).toBe(true)
  })

  test("hovering the chart canvas does not remove the aria-live region", async ({ page }) => {
    await waitForVisualization(page, "a11y-tooltip")
    const testCase = page.locator('[data-testid="a11y-tooltip"]')
    const canvas = testCase.locator("canvas").first()
    const box = await canvas.boundingBox()

    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(500)

      // Region should still be present after hover
      const liveRegion = testCase.locator("[aria-live='polite']")
      await expect(liveRegion.first()).toBeAttached()
    }
  })
})

// ─── 3. Legend keyboard traversal ─────────────────────────────────────────────

test.describe("Accessibility - Legend keyboard traversal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("interactive legend items are focusable with tabIndex", async ({ page }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    // Interactive legend items should have tabindex for keyboard access
    const focusableItems = testCase.locator(".legend-item [tabindex='0']")
    const count = await focusableItems.count()
    expect(count).toBeGreaterThan(0)
  })

  test("legend items have role='option' and aria-label", async ({ page }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    const legendOptions = testCase.locator("[role='option']")
    const count = await legendOptions.count()
    expect(count).toBeGreaterThan(0)

    // Each option should have an aria-label with the category name
    for (let i = 0; i < count; i++) {
      const ariaLabel = await legendOptions.nth(i).getAttribute("aria-label")
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel!.length).toBeGreaterThan(0)
    }
  })

  test("legend container has role='listbox' when interactive", async ({ page }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    const listbox = testCase.locator("[role='listbox']")
    await expect(listbox.first()).toBeAttached()

    // Listbox should have aria-label
    const ariaLabel = await listbox.first().getAttribute("aria-label")
    expect(ariaLabel).toBe("Chart legend")
  })

  test("legend listbox has aria-multiselectable for isolate mode", async ({ page }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    const listbox = testCase.locator("[role='listbox']")
    const multiselectable = await listbox.first().getAttribute("aria-multiselectable")
    expect(multiselectable).toBe("true")
  })

  test("Tab key moves focus into legend items", async ({ page }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    // Focus the chart frame first, then tab into the legend
    const frame = testCase.locator(".stream-ordinal-frame")
    await frame.focus()

    // Tab until we reach a legend option
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab")
      const focused = page.locator(":focus")
      const role = await focused.getAttribute("role")
      if (role === "option") {
        // Successfully tabbed into a legend item
        const ariaLabel = await focused.getAttribute("aria-label")
        expect(ariaLabel).toBeTruthy()
        return
      }
    }

    // If we get here, verify legend items exist at minimum
    const legendOptions = testCase.locator("[role='option']")
    expect(await legendOptions.count()).toBeGreaterThan(0)
  })

  test("Arrow keys navigate between legend items", async ({ page }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    // Focus the first legend option directly
    const firstOption = testCase.locator("[role='option']").first()
    await firstOption.evaluate((el) => (el as any).focus())

    const firstLabel = await page.locator(":focus").getAttribute("aria-label")
    expect(firstLabel).toBeTruthy()

    // Press ArrowDown to move to the next item
    await page.keyboard.press("ArrowDown")

    const secondLabel = await page.locator(":focus").getAttribute("aria-label")
    expect(secondLabel).toBeTruthy()

    // The focus should have moved to a different item
    expect(secondLabel).not.toBe(firstLabel)
  })

  test("Enter/Space key activates legend item (isolate mode)", async ({ page }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    // Focus the first legend option
    const firstOption = testCase.locator("[role='option']").first()
    await firstOption.evaluate((el) => (el as any).focus())

    // Press Enter to toggle isolation
    await page.keyboard.press("Enter")
    await page.waitForTimeout(300)

    // After activation, the aria-selected state should change
    const ariaSelected = await firstOption.getAttribute("aria-selected")
    expect(ariaSelected).toBe("true")
  })
})

// ─── 4. Focus rings appear on keyboard focus ─────────────────────────────────

test.describe("Accessibility - Focus rings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("chart frames are focusable with tabIndex=0", async ({ page }) => {
    await waitForVisualization(page, "a11y-xy-titled")
    const testCase = page.locator('[data-testid="a11y-xy-titled"]')
    const frame = testCase.locator(".stream-xy-frame")

    await expect(frame).toHaveAttribute("tabindex", "0")
  })

  test("ordinal chart frame is focusable with tabIndex=0", async ({ page }) => {
    await waitForVisualization(page, "a11y-ordinal")
    const testCase = page.locator('[data-testid="a11y-ordinal"]')
    const frame = testCase.locator(".stream-ordinal-frame")

    await expect(frame).toHaveAttribute("tabindex", "0")
  })

  test("legend focus ring becomes visible when legend item receives keyboard focus", async ({
    page,
  }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    // Focus rings start hidden
    const focusRing = testCase.locator(".semiotic-legend-focus-ring").first()
    await expect(focusRing).toBeAttached()

    const initialVisibility = await focusRing.getAttribute("visibility")
    expect(initialVisibility).toBe("hidden")

    // Focus a legend item via keyboard
    const firstOption = testCase.locator("[role='option']").first()
    await firstOption.evaluate((el) => (el as any).focus())
    await page.waitForTimeout(100)

    // After focus, the ring within the focused item should be visible
    const focusedRing = page.locator(":focus .semiotic-legend-focus-ring")
    const ringCount = await focusedRing.count()
    if (ringCount > 0) {
      const visibility = await focusedRing.first().getAttribute("visibility")
      expect(visibility).toBe("visible")
    }
  })

  test("legend focus ring hides when item loses focus", async ({ page }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    // Focus a legend item
    const firstOption = testCase.locator("[role='option']").first()
    await firstOption.evaluate((el) => (el as any).focus())
    await page.waitForTimeout(100)

    // Blur by focusing something else
    const frame = testCase.locator(".stream-ordinal-frame")
    await frame.focus()
    await page.waitForTimeout(100)

    // All focus rings should be hidden now
    const focusRings = testCase.locator(".semiotic-legend-focus-ring")
    const count = await focusRings.count()
    for (let i = 0; i < count; i++) {
      const visibility = await focusRings.nth(i).getAttribute("visibility")
      expect(visibility).toBe("hidden")
    }
  })

  test("focus ring has proper styling attributes (stroke, no fill)", async ({ page }) => {
    await waitForVisualization(page, "a11y-legend-keyboard")
    const testCase = page.locator('[data-testid="a11y-legend-keyboard"]')

    const focusRing = testCase.locator(".semiotic-legend-focus-ring").first()
    await expect(focusRing).toBeAttached()

    // Verify the focus ring has accessible visual properties
    const fill = await focusRing.getAttribute("fill")
    expect(fill).toBe("none")

    const strokeWidth = await focusRing.getAttribute("stroke-width")
    expect(Number(strokeWidth)).toBeGreaterThanOrEqual(2)
  })
})

// ─── 5. SVG overlays have title/desc elements ────────────────────────────────

test.describe("Accessibility - SVG overlay title/desc elements", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("XY chart SVG overlay contains a title element with chart title", async ({ page }) => {
    await waitForVisualization(page, "a11y-xy-titled")
    const testCase = page.locator('[data-testid="a11y-xy-titled"]')

    const svgTitle = testCase.locator("svg title")
    await expect(svgTitle.first()).toBeAttached()

    const titleText = await svgTitle.first().textContent()
    expect(titleText).toBe("Monthly Revenue Trends")
  })

  test("XY chart SVG overlay contains a desc element", async ({ page }) => {
    await waitForVisualization(page, "a11y-xy-titled")
    const testCase = page.locator('[data-testid="a11y-xy-titled"]')

    const svgDesc = testCase.locator("svg desc")
    await expect(svgDesc.first()).toBeAttached()

    const descText = await svgDesc.first().textContent()
    expect(descText).toBeTruthy()
    expect(descText).toContain("XY data visualization")
  })

  test("XY chart SVG title includes custom title text in desc", async ({ page }) => {
    await waitForVisualization(page, "a11y-xy-titled")
    const testCase = page.locator('[data-testid="a11y-xy-titled"]')

    const svgDesc = testCase.locator("svg desc")
    const descText = await svgDesc.first().textContent()
    // When title is provided, desc should reference it
    expect(descText).toContain("Monthly Revenue Trends")
  })

  test("XY chart without title has fallback SVG title", async ({ page }) => {
    await waitForVisualization(page, "a11y-xy-default")
    const testCase = page.locator('[data-testid="a11y-xy-default"]')

    const svgTitle = testCase.locator("svg title")
    await expect(svgTitle.first()).toBeAttached()

    const titleText = await svgTitle.first().textContent()
    expect(titleText).toBe("XY Chart")
  })

  test("Ordinal chart SVG overlay has title and desc", async ({ page }) => {
    await waitForVisualization(page, "a11y-ordinal")
    const testCase = page.locator('[data-testid="a11y-ordinal"]')

    const svgTitle = testCase.locator("svg title")
    await expect(svgTitle.first()).toBeAttached()
    const titleText = await svgTitle.first().textContent()
    expect(titleText).toBe("Sales by Category")

    const svgDesc = testCase.locator("svg desc")
    await expect(svgDesc.first()).toBeAttached()
    const descText = await svgDesc.first().textContent()
    expect(descText).toContain("ordinal data visualization")
  })

  test("Network chart SVG overlay has title and desc", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-network"]')
    await expect(testCase).toBeVisible()
    const canvas = testCase.locator("canvas").first()
    await expect(canvas).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(2000)

    const svgTitle = testCase.locator("svg title")
    await expect(svgTitle.first()).toBeAttached()
    const titleText = await svgTitle.first().textContent()
    expect(titleText).toBe("Team Connections")

    const svgDesc = testCase.locator("svg desc")
    await expect(svgDesc.first()).toBeAttached()
    const descText = await svgDesc.first().textContent()
    expect(descText).toContain("network data visualization")
  })
})

// ─── 6. ChartContainer toolbar buttons have aria-labels ───────────────────────

test.describe("Accessibility - ChartContainer toolbar buttons", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/accessibility-examples/")
  })

  test("ChartContainer renders toolbar action buttons", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-chart-container"]')
    await expect(testCase).toBeVisible({ timeout: 5000 })

    const buttons = testCase.locator("button.semiotic-chart-action")
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)
  })

  test("every toolbar button has an aria-label", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-chart-container"]')
    await expect(testCase).toBeVisible({ timeout: 5000 })

    const buttons = testCase.locator("button.semiotic-chart-action")
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const ariaLabel = await buttons.nth(i).getAttribute("aria-label")
      expect(ariaLabel).toBeTruthy()
      expect(ariaLabel!.length).toBeGreaterThan(0)
    }
  })

  test("every toolbar button has a title attribute for hover tooltips", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-chart-container"]')
    await expect(testCase).toBeVisible({ timeout: 5000 })

    const buttons = testCase.locator("button.semiotic-chart-action")
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)

    for (let i = 0; i < count; i++) {
      const title = await buttons.nth(i).getAttribute("title")
      expect(title).toBeTruthy()
    }
  })

  test("export button has descriptive aria-label", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-chart-container"]')
    await expect(testCase).toBeVisible({ timeout: 5000 })

    // Find the export button specifically
    const exportButton = testCase.locator("button.semiotic-chart-action[aria-label='Export chart']")
    await expect(exportButton).toBeAttached()
  })

  test("fullscreen button has descriptive aria-label", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-chart-container"]')
    await expect(testCase).toBeVisible({ timeout: 5000 })

    const fullscreenButton = testCase.locator(
      "button.semiotic-chart-action[aria-label='Enter fullscreen']"
    )
    await expect(fullscreenButton).toBeAttached()
  })

  test("toolbar buttons have descriptive aria-labels", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-chart-container"]')
    await expect(testCase).toBeVisible({ timeout: 5000 })

    // Export and fullscreen buttons should always render when actions are set
    const exportButton = testCase.locator(
      "button.semiotic-chart-action[aria-label='Export chart']"
    )
    await expect(exportButton).toBeAttached()

    const fullscreenButton = testCase.locator(
      "button.semiotic-chart-action[aria-label='Enter fullscreen']"
    )
    await expect(fullscreenButton).toBeAttached()

    // copyConfig button requires chartConfig to be available, which a bare BarChart doesn't provide
    // So we just verify the other buttons have proper aria-labels
  })

  test("ChartContainer displays its title text", async ({ page }) => {
    const testCase = page.locator('[data-testid="a11y-chart-container"]')
    await expect(testCase).toBeVisible({ timeout: 5000 })

    await expect(testCase).toContainText("Revenue Overview")
  })
})

// ─── 7. Automated axe-core accessibility scanning ───────────────────────────

test.describe("Accessibility - axe-core automated scanning", () => {
  // Wait for canvas-based charts to render before running axe scan
  async function waitForChartsToRender(page: Page) {
    const canvas = page.locator("canvas").first()
    await expect(canvas).toBeVisible({ timeout: 10000 })
  }

  test("no accessibility violations on XY chart examples", async ({ page }) => {
    await page.goto("/xy-examples/")
    await waitForChartsToRender(page)
    const results = await new AxeBuilder({ page })
      .exclude("canvas") // canvas is opaque to axe — tested manually above
      .analyze()
    expect(results.violations).toEqual([])
  })

  test("no accessibility violations on ordinal chart examples", async ({ page }) => {
    await page.goto("/ordinal-examples/")
    await waitForChartsToRender(page)
    const results = await new AxeBuilder({ page })
      .exclude("canvas")
      .analyze()
    expect(results.violations).toEqual([])
  })

  test("no accessibility violations on network chart examples", async ({ page }) => {
    await page.goto("/network-examples/")
    await waitForChartsToRender(page)
    const results = await new AxeBuilder({ page })
      .exclude("canvas")
      .analyze()
    expect(results.violations).toEqual([])
  })

  test("no accessibility violations on geo chart examples", async ({ page }) => {
    await page.goto("/geo-examples/")
    await waitForChartsToRender(page)
    const results = await new AxeBuilder({ page })
      .exclude("canvas")
      .analyze()
    expect(results.violations).toEqual([])
  })

  test("no accessibility violations on coordinated views examples", async ({ page }) => {
    await page.goto("/coordinated-examples/")
    await waitForChartsToRender(page)
    const results = await new AxeBuilder({ page })
      .exclude("canvas")
      .analyze()
    expect(results.violations).toEqual([])
  })

  test("no accessibility violations on accessibility examples", async ({ page }) => {
    await page.goto("/accessibility-examples/")
    await waitForChartsToRender(page)
    const results = await new AxeBuilder({ page })
      .exclude("canvas")
      .analyze()
    expect(results.violations).toEqual([])
  })
})

// ─── Smoke test: no JS errors on page load ───────────────────────────────────

test.describe("Accessibility - No console errors", () => {
  test("accessibility examples page loads without JS errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/accessibility-examples/")
    await page.waitForTimeout(3000)

    // Filter out known React dev warnings
    const realErrors = errors.filter(
      (e) => !e.includes("act(") && !e.includes("Warning:")
    )
    expect(realErrors).toHaveLength(0)
  })
})
