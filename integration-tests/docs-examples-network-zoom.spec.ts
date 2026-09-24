import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

const errors = new WeakMap<Page, string[]>()
async function scrollToTop(page: Page) {
  await expect(page.getByTestId("zoom-phase")).toHaveText("Detail ready")
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    return new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve())
    )
  })
}

test.setTimeout(45_000)
test.beforeEach(async ({ page }) => {
  // Exercise the authored system-font fallbacks without depending on Google's CDN.
  await page.route("https://fonts.googleapis.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/css",
      body: ""
    })
  )
  const messages: string[] = []
  errors.set(page, messages)
  page.on("pageerror", (error) => messages.push(error.message))
  page.on("console", (message) => {
    if (message.type() === "error") messages.push(message.text())
  })
  await page.goto("/examples/pipeline-explorer")
  await expect(
    page.getByRole("heading", { name: "Pipeline Explorer", exact: true })
  ).toBeVisible()
  await expect(page.getByLabel("Zoom level")).toHaveText("100%")
})
test.afterEach(async ({ page }) => expect(errors.get(page)).toEqual([]))

test("card and connection tooltips show real data and stay readable through zoom, pan and narrow layouts", async ({
  page
}, testInfo) => {
  const frame = page.locator(".stream-network-frame")
  const tooltip = page.getByRole("tooltip")
  const hoverCard = async (id: string, label: string) => {
    await frame.scrollIntoViewIfNeeded()
    const card = await page.locator(`[data-mark-id="${id}"]`).boundingBox()
    if (!card) throw new Error(`Missing card ${id}`)
    await page.mouse.move(
      card.x + Math.min(card.width / 2, 100),
      card.y + card.height / 2
    )
    await expect(tooltip).toContainText(label)
    await expect(frame.locator(".semiotic-tooltip")).toHaveCount(1)
    const tip = (await tooltip.boundingBox())!
    const chart = (await frame.boundingBox())!
    expect(tip.x).toBeGreaterThanOrEqual(chart.x)
    expect(tip.y).toBeGreaterThanOrEqual(chart.y)
    expect(tip.x + tip.width).toBeLessThanOrEqual(chart.x + chart.width)
    expect(tip.y + tip.height).toBeLessThanOrEqual(chart.y + chart.height)
  }
  await hoverCard("step-0", "Orders · Source")
  await expect(tooltip).toContainText("24,816 output rows")
  await page.screenshot({ path: testInfo.outputPath("pipeline-tooltip.png") })
  const midpoint = await page
    .locator('[data-testid="zoom-connections"] path')
    .first()
    .evaluate((element) => {
      const path = element as SVGPathElement
      const p = path.getPointAtLength(path.getTotalLength() / 2)
      const screen = new DOMPoint(p.x, p.y).matrixTransform(
        path.getScreenCTM()!
      )
      return { x: screen.x, y: screen.y }
    })
  await page.mouse.move(midpoint.x, midpoint.y)
  await expect(tooltip).toContainText("Orders: Source → Validate")
  await expect(tooltip).toContainText("24,816 rows sent")
  for (const name of ["Zoom out", "Fit", "Reset"]) {
    await page.getByRole("button", { name, exact: true }).click()
    await expect(page.getByTestId("zoom-phase")).toHaveText("Exploring…")
    await expect(page.getByTestId("zoom-phase")).toHaveText("Detail ready")
    await hoverCard("step-0", "Orders · Source")
  }
  await page.getByLabel("Inspect a step").selectOption("step-29")
  await page.getByRole("button", { name: "Focus step", exact: true }).click()
  await expect(page.getByTestId("zoom-phase")).toHaveText("Exploring…")
  await expect(page.getByTestId("zoom-phase")).toHaveText("Detail ready")
  await hoverCard("step-29", "Events · Publish")
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    await page.getByRole("button", { name: "Focus step", exact: true }).click()
    await expect(page.getByTestId("zoom-phase")).toHaveText("Exploring…")
    await expect(page.getByTestId("zoom-phase")).toHaveText("Detail ready")
    await hoverCard("step-29", "Events · Publish")
  }
  await page.screenshot({
    path: testInfo.outputPath("pipeline-tooltip-narrow.png")
  })
  await page.mouse.move(0, 0)
  await expect(tooltip).toHaveCount(0)
})

test("inspect steps, virtualize cards, preserve notes and track the minimap without layout work", async ({
  page
}, testInfo) => {
  const explorer = page.getByRole("region", {
    name: "Interactive pipeline explorer"
  })
  const first = page.getByLabel("Note for Orders · Source", { exact: true })
  await expect(first).toBeVisible()
  await expect
    .poll(async () => Number(await explorer.getAttribute("data-mounted-count")))
    .toBeLessThan(30)
  const calls = await explorer.getAttribute("data-layout-calls")
  const initialWindow = await page
    .getByTestId("pipeline-minimap-window")
    .getAttribute("y")
  await first.fill("Check the next daily snapshot")
  await expect(
    page.getByRole("textbox", { name: "Step note", exact: true })
  ).toHaveValue("Check the next daily snapshot")
  await page.getByLabel("Inspect a step").selectOption("step-29")
  await page.getByRole("button", { name: "Focus step", exact: true }).click()
  await expect(
    page.getByLabel("Note for Events · Publish", { exact: true })
  ).toBeVisible()
  await expect(first).toHaveCount(0)
  await expect(page.getByTestId("pipeline-minimap-window")).not.toHaveAttribute(
    "y",
    initialWindow!
  )
  await page.getByLabel("Inspect a step").selectOption("step-0")
  await page.getByRole("button", { name: "Focus step", exact: true }).click()
  await expect(first).toHaveValue("Check the next daily snapshot")
  await expect(first).toBeVisible()
  await page.getByLabel("Inspect a step").selectOption("step-11")
  await expect(page.locator(".pipeline-step-detail")).toContainText(
    "96 records"
  )
  await expect(page.locator(".pipeline-status")).toContainText("Review")
  await page.getByRole("button", { name: "Fit", exact: true }).click()
  await expect(explorer).toHaveAttribute("data-visible-count", "30")
  await expect(explorer).toHaveAttribute("data-layout-calls", calls!)
  await scrollToTop(page)
  await page.screenshot({
    path: testInfo.outputPath("pipeline-overview.png"),
    fullPage: true
  })
})

test("all four detail levels are deliberate and promotion waits until settled", async ({
  page
}, testInfo) => {
  const card = page.locator('[data-mark-id="step-0"] article')
  await expect(card).toHaveAttribute("data-lod", "3")
  await page.getByRole("button", { name: "Zoom out", exact: true }).click()
  await expect(card).toHaveAttribute("data-lod", "2")
  await expect(card.locator("input")).toHaveCount(0)
  await scrollToTop(page)
  // Cards revealed by virtualization must catch up to their neighbors on settle.
  await expect
    .poll(() =>
      page
        .locator(".pipeline-card")
        .evaluateAll((cards) =>
          [
            ...new Set(cards.map((element) => element.getAttribute("data-lod")))
          ].sort()
        )
    )
    .toEqual(["2"])
  await page.screenshot({
    path: testInfo.outputPath("pipeline-summaries.png"),
    fullPage: true
  })
  await page.getByRole("button", { name: "Zoom out", exact: true }).click()
  await expect(card).toHaveAttribute("data-lod", "1")
  await expect(card.getByRole("button")).toHaveCount(0)
  await page.getByRole("button", { name: "Zoom out", exact: true }).click()
  await expect(card).toHaveAttribute("data-lod", "0")
  await expect(page.getByLabel("Zoom level")).toHaveText("15%")
  await page.getByRole("button", { name: "Reset", exact: true }).click()
  await expect(page.getByTestId("zoom-phase")).toHaveText("Exploring…")
  await expect(card.locator("input")).toHaveCount(0)
  await expect(page.getByTestId("zoom-phase")).toHaveText("Detail ready")
  await expect(card).toHaveAttribute("data-lod", "3")
  await scrollToTop(page)
  await page.screenshot({
    path: testInfo.outputPath("pipeline-detail.png"),
    fullPage: true
  })
})

test("bounds and locks apply to the finished controls, wheel and keyboard", async ({
  page
}) => {
  await page.getByText("Camera settings", { exact: true }).click()
  await page
    .getByRole("combobox", { name: "Minimum zoom", exact: true })
    .selectOption("0.5")
  await page
    .getByRole("combobox", { name: "Maximum zoom", exact: true })
    .selectOption("1")
  await expect(
    page.getByRole("button", { name: "Zoom in", exact: true })
  ).toBeDisabled()
  await page.getByRole("button", { name: "Zoom out", exact: true }).click()
  await expect(page.getByLabel("Zoom level")).toHaveText("50%")
  await expect(
    page.getByRole("button", { name: "Zoom out", exact: true })
  ).toBeDisabled()
  const frame = page.locator(".stream-network-frame")
  await frame.focus()
  await frame.press("+")
  await expect(page.getByLabel("Zoom level")).toHaveText("100%")
  await page.getByLabel("Lock camera", { exact: true }).check()
  for (const name of ["Fit", "Reset", "Focus step", "Zoom in", "Zoom out"])
    await expect(page.getByRole("button", { name, exact: true })).toBeDisabled()
  await frame.focus()
  await frame.press("-")
  const box = (await frame.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 30)
  await page.mouse.wheel(0, 100)
  await expect(page.getByLabel("Zoom level")).toHaveText("100%")
  await page.getByLabel("Lock camera", { exact: true }).uncheck()
  await page.getByRole("button", { name: "Zoom out", exact: true }).click()
  await expect(page.getByLabel("Zoom level")).toHaveText("50%")
})

test("axis locks constrain panning and a focused editor survives semantic zoom", async ({
  page
}) => {
  const frame = page.locator(".stream-network-frame")
  const camera = () =>
    page.locator(".semiotic-network-html-marks > div").evaluate((element) => {
      const matrix = new DOMMatrix(getComputedStyle(element).transform)
      return { x: matrix.e, y: matrix.f }
    })
  await page.getByText("Camera settings", { exact: true }).click()
  const axes = page.getByRole("combobox", { name: "Pan axes", exact: true })
  await axes.selectOption("x")
  const initial = await camera()
  await frame.focus()
  await frame.press("Alt+ArrowRight")
  await expect.poll(async () => (await camera()).x).toBeLessThan(initial.x)
  await expect(page.getByTestId("zoom-phase")).toHaveText("Detail ready")
  const horizontal = await camera()
  expect(horizontal.y).toBe(initial.y)
  await frame.press("Alt+ArrowDown")
  expect(await camera()).toEqual(horizontal)
  await axes.selectOption("y")
  await frame.focus()
  await frame.press("Alt+ArrowDown")
  await expect.poll(async () => (await camera()).y).toBeLessThan(horizontal.y)
  await expect(page.getByTestId("zoom-phase")).toHaveText("Detail ready")
  const vertical = await camera()
  expect(vertical.x).toBe(horizontal.x)
  await axes.selectOption("false")
  await frame.focus()
  await frame.press("Alt+ArrowRight")
  await frame.press("Alt+ArrowDown")
  expect(await camera()).toEqual(vertical)
  await axes.selectOption("true")
  await page.getByRole("button", { name: "Reset", exact: true }).click()
  await expect(page.getByTestId("zoom-phase")).toHaveText("Detail ready")
  const input = page.getByLabel("Note for Orders · Source", { exact: true })
  await input.fill("Keep this editor open")
  const box = (await frame.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 30)
  await page.mouse.wheel(0, 400)
  await expect
    .poll(async () =>
      parseInt((await page.getByLabel("Zoom level").textContent())!)
    )
    .toBeLessThan(90)
  await expect(page.getByTestId("zoom-phase")).toHaveText("Detail ready")
  await expect(input).toBeFocused()
  await expect(input).toHaveValue("Keep this editor open")
  await expect(page.locator('[data-mark-id="step-0"] article')).toHaveAttribute(
    "data-lod",
    "3"
  )
})

test("narrow screens, both themes, reduced motion and the table remain accessible", async ({
  page
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 900 })
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth
        )
      )
      .toBe(true)
    await expect(page.getByLabel("Inspect a step")).toBeVisible()
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByLabel("Inspect a step").selectOption("step-17")
  await expect(page.locator(".pipeline-step-detail")).toContainText("980 ms")
  await page.getByText("Read all 30 steps as a table", { exact: true }).click()
  await expect(page.locator(".pipeline-table tbody tr")).toHaveCount(30)
  for (const theme of ["dark", "light"]) {
    if ((await page.locator("html").getAttribute("data-theme")) !== theme)
      await page
        .getByRole("button", { name: `Switch to ${theme} mode` })
        .click()
    const audit = await new AxeBuilder({ page })
      .include(".pipeline-explorer")
      .analyze()
    expect(audit.violations).toEqual([])
    await scrollToTop(page)
    await page.screenshot({
      path: testInfo.outputPath(`pipeline-mobile-${theme}.png`),
      fullPage: true
    })
  }
  await page.getByRole("button", { name: "Fit", exact: true }).click()
  await expect(page.locator(".pipeline-explorer")).toHaveAttribute(
    "data-visible-count",
    "30"
  )
})

test("gallery, guide link and complete source tabs expose the example", async ({
  page
}) => {
  await expect(
    page.getByRole("button", { name: "Show full code view", exact: true })
  ).toBeEnabled()
  await page
    .getByRole("button", { name: "Show full code view", exact: true })
    .click()
  await expect(
    page.getByRole("tablist", { name: "Example source files" }).getByRole("tab")
  ).toHaveCount(7)
  await page
    .getByRole("tab", {
      name: "pipeline-explorer/PipelineCard.tsx",
      exact: true
    })
    .click()
  await expect(page.getByRole("tabpanel")).toContainText("useNetworkLOD")
  await page
    .getByRole("tab", { name: "pipeline-explorer/data.ts", exact: true })
    .click()
  await expect(page.getByRole("tabpanel")).toContainText("18364")
  await page.goto("/examples")
  await page
    .getByRole("link")
    .filter({
      has: page.getByRole("heading", { name: "Pipeline Explorer", exact: true })
    })
    .click()
  await expect(
    page.getByRole("heading", { name: "Pipeline Explorer", exact: true })
  ).toBeVisible()
  await page
    .getByRole("link", { name: "custom-layout guide", exact: true })
    .click()
  await expect(
    page.getByRole("link", { name: "Pipeline Explorer", exact: true })
  ).toHaveAttribute("href", "/examples/pipeline-explorer")
  // The source-loader fix also serves existing, multi-file gallery stories.
  await page.goto("/examples/watermarks")
  await page
    .getByRole("button", { name: "Show full code view", exact: true })
    .click()
  await page
    .getByRole("tab", { name: "watermarksClaimContracts.js", exact: true })
    .click()
  await expect(page.getByRole("tabpanel")).toContainText("export")
})
