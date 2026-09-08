import { expect, test } from "@playwright/test"
import { resolve } from "node:path"
import AxeBuilder from "@axe-core/playwright"

test.use({ actionTimeout: 10000 })

test("keeps controls accessible and notes readable in both themes", async ({
  page
}, testInfo) => {
  for (const mode of ["light", "dark"]) {
    const toggle = page.getByRole("button", { name: `Switch to ${mode} mode` })
    if (await toggle.isVisible()) await toggle.click()
    const note = page
      .getByTestId("pretext-note-demo")
      .locator(".annotation-note-label")
    await expect(note).toBeVisible()
    const audit = await new AxeBuilder({ page })
      .include(".pretext-controls")
      .analyze()
    expect(audit.violations).toEqual([])
    await page
      .locator(".pretext-comparison")
      .screenshot({ path: testInfo.outputPath(`${mode}.png`) })
  }
})

test.beforeEach(async ({ page }) => {
  await page.goto("/annotations/text-layout", { waitUntil: "domcontentloaded" })
  await expect(
    page.getByRole("heading", { level: 1, name: "Text Layout with Pretext" })
  ).toBeVisible()
  await expect(
    page.locator(
      '[data-testid="pretext-note-demo"] [data-text-layout="pretext"]'
    )
  ).toBeVisible()
})

test("wraps multilingual notes, responds to typography and width, and can be disabled", async ({
  page
}) => {
  const measured = page.getByTestId("pretext-note-demo")
  const lines = measured.locator(".annotation-note-label tspan")
  const originalText = await page
    .getByLabel("Annotation text", { exact: true })
    .inputValue()
  const initialCount = await lines.count()
  expect(initialCount).toBeGreaterThan(1)
  await expect(
    page
      .getByTestId("default-note-demo")
      .locator(".annotation-note-label tspan")
  ).toHaveCount(1)
  expect((await lines.allTextContents()).join("")).toBe(originalText)

  const note = measured.locator(".annotation-note")
  const manualPosition = await note.getAttribute("transform")
  await page
    .getByRole("checkbox", { name: "Place notes automatically" })
    .check()
  await expect(note).not.toHaveAttribute("transform", manualPosition!)
  await expect(note).toHaveAttribute("data-text-layout", "pretext")
  expect((await lines.allTextContents()).join("")).toBe(originalText)
  await page
    .getByRole("checkbox", { name: "Place notes automatically" })
    .uncheck()
  await expect(note).toHaveAttribute("transform", manualPosition!)

  await page.getByRole("slider", { name: "Wrap width", exact: true }).focus()
  await page.keyboard.press("Home")
  await expect.poll(() => lines.count()).toBeGreaterThan(initialCount)
  await page
    .getByLabel("Sample text", { exact: true })
    .selectOption("softHyphen")
  await page.getByLabel("Font", { exact: true }).selectOption("Georgia, serif")
  await expect(measured.locator(".annotation-note")).toHaveAttribute(
    "font-family",
    "Georgia, serif"
  )
  const widths = await lines.evaluateAll((nodes) =>
    nodes.map((node) => (node as SVGTextContentElement).getComputedTextLength())
  )
  expect(Math.max(...widths)).toBeLessThanOrEqual(80.75)

  await page
    .getByRole("checkbox", { name: "Enable Pretext on the second chart" })
    .uncheck()
  await expect(measured.locator('[data-text-layout="pretext"]')).toHaveCount(0)
  expect(await lines.allTextContents()).toEqual(
    await page
      .getByTestId("default-note-demo")
      .locator(".annotation-note-label tspan")
      .allTextContents()
  )
})

test("keeps the interactive example within a phone viewport", async ({
  page
}) => {
  await page.setViewportSize({ width: 360, height: 800 })
  const note = page
    .getByTestId("pretext-note-demo")
    .locator(".annotation-note-label")
  await expect(note).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(360)
  const geometry = await note.evaluate((element) => {
    const text = element.getBoundingClientRect()
    const chart = element.closest("svg")!.getBoundingClientRect()
    return {
      left: text.left - chart.left,
      right: chart.right - text.right,
      top: text.top - chart.top,
      bottom: chart.bottom - text.bottom
    }
  })
  expect(geometry.left).toBeGreaterThanOrEqual(0)
  expect(geometry.right).toBeGreaterThanOrEqual(0)
  expect(geometry.top).toBeGreaterThanOrEqual(0)
  expect(geometry.bottom).toBeGreaterThanOrEqual(0)
})

test("refreshes real font metrics after a face finishes loading", async ({
  page
}) => {
  test.skip(
    process.platform !== "darwin",
    "This macOS font-cache regression uses local Courier New"
  )
  const widths = await page.evaluate(
    async (moduleUrl) => {
      const {
        createPretextNoteMeasurer,
        resetPretextFonts,
        resolvePretextOptions
      } = await import(moduleUrl)
      const options = resolvePretextOptions({
        fontFamily: '"PretextFontRegression", Arial',
        fontSize: 12
      })
      const note = { label: "iiiiiiiiiiii", wrap: 300 }
      resetPretextFonts()
      const before = createPretextNoteMeasurer(options)(note).width
      const face = new FontFace("PretextFontRegression", 'local("Courier New")')
      document.fonts.add(face)
      await face.load()
      await document.fonts.ready
      resetPretextFonts()
      const after = createPretextNoteMeasurer(options)(note).width
      const canvas = document.createElement("canvas")
      const context = canvas.getContext("2d")!
      context.font = '400 12px "PretextFontRegression", Arial'
      return { before, after, expected: context.measureText(note.label).width }
    },
    `/@fs/${resolve("src/components/text/pretextAnnotationLayout.ts")}`
  )
  expect(widths.after).toBeGreaterThan(widths.before * 2)
  expect(widths.after).toBeCloseTo(widths.expected, 1)
})
