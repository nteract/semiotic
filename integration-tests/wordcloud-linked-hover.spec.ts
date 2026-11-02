import { expect, test } from "@playwright/test"
import { makeWordCloudParityCases } from "./wordcloud-parity-fixtures"
import { expectTooltipWithinPlot, waitForChartReady } from "./helpers"

test("linked-hover connects canvas and SVG words in both directions", async ({
  page
}) => {
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  const fixture = makeWordCloudParityCases()[0]
  await page.goto(`/ssr-parity-examples/?case=${fixture.id}&linkedWords`)
  await waitForChartReady(page, "linked-canvas")
  const canvas = page.getByTestId("linked-canvas").locator("canvas").first()
  const canvasPixels = () =>
    canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL())
  const original = await canvasPixels()
  const svgWords = page
    .getByTestId("linked-svg")
    .locator("svg[data-network-scene] [data-word-id]")
  const isolatedWords = page
    .getByTestId("isolated-cloud")
    .locator("svg[data-network-scene] [data-word-id]")

  async function expectSelection(term: string) {
    await expect(page.getByTestId("linked-term")).toHaveText(term)
    await expect(page.getByTestId("linked-term-observed")).toHaveText(term)
    await expect
      .poll(() =>
        svgWords.evaluateAll((words) =>
          words.map((word) => ({
            term: word.getAttribute("data-word-id"),
            opacity: Number(word.getAttribute("opacity") ?? 1)
          }))
        )
      )
      .toEqual(
        fixture.props.layout!.words.map((word) => ({
          term: word.id,
          opacity: term === "none" || term === word.id ? 1 : 0.25
        }))
      )
    await expect
      .poll(async () => (await canvasPixels()) === original, {
        message:
          term === "none"
            ? "Clearing linked hover must restore the original canvas words"
            : "WordCloud must redraw when its linked-hover selection becomes active"
      })
      .toBe(term === "none")
    await expect(page.getByTestId("isolated-term")).toHaveText("none")
    await expect(page.getByTestId("isolated-term-observed")).toHaveText("none")
    expect(
      await isolatedWords.evaluateAll((words) =>
        words.map((word) => Number(word.getAttribute("opacity") ?? 1))
      )
    ).toEqual([1, 1, 1])
  }

  await expectSelection("none")
  // Each renderer publishes raw callback-accessor identity and receives the
  // other's selection. The hull backgrounds stay intact around dimmed words.
  for (const [renderAs, term] of [
    ["canvas", "care"],
    ["svg", "trust"]
  ] as const) {
    const source = page.getByTestId(`linked-${renderAs}`)
    const surface = source.locator("[data-wordcloud-state]")
    const word = fixture.props.layout!.words.find((word) => word.id === term)!
    for (const width of [900, 600]) {
      // Reflow the pair from columns to rows and recompute real viewport
      // bounds, so tooltip placement and hit testing also run after resize.
      await page.setViewportSize({ width, height: 900 })
      await surface.scrollIntoViewIfNeeded()
      const box = (await surface.boundingBox())!
      await page.mouse.move(
        box.x + 12 + 160 + word.x + (word.x0 + word.x1) / 2,
        box.y + 8 + 100 + word.y + (word.y0 + word.y1) / 2
      )
      const tooltip = source.locator(".stream-network-tooltip")
      await expect(tooltip).toContainText(term)
      await expect(tooltip).toContainText(String(word.value))
      await expectTooltipWithinPlot(source, {
        left: 12,
        right: 18,
        top: 8,
        bottom: 14
      })
      await expectSelection(term)
      if (width === 900) {
        await expect(
          page.getByTestId("wordcloud-linked-hover")
        ).toHaveScreenshot(`wordcloud-linked-hover-${renderAs}.png`)
      }
      await page.mouse.move(0, 0)
      await expect(tooltip).toBeHidden()
      await expectSelection("none")
    }
  }
  expect(errors).toEqual([])
})
