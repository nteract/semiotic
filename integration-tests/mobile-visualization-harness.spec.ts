import { test, expect } from "@playwright/test"
import { waitForAllChartsReady } from "./helpers"

const mobilePreviewWidths = [320, 360, 390, 430, 768]

type HarnessSummary = {
  viewportWidth: number
  documentScrollWidth: number
  chartOverflows: Array<{ id: string; left: number; right: number; width: number }>
  dataCanvasCount: number
  unlabeledCanvasCount: number
  calloutItems: number
  dataSummaryActions: number
  detailPanels: number
  hoverOnlyRiskCount: number
  labelOverlapFailures: Array<{ chartId: string; a: string; b: string; ratio: number }>
  touchTargetFailures: Array<{ id: string; width: number; height: number }>
}

function inspectMobileHarness(): HarnessSummary {
  const viewportWidth = document.documentElement.clientWidth
  const documentScrollWidth = Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth
  )
  const chartOverflows = Array.from(
    document.querySelectorAll<HTMLElement>("[data-mobile-chart]")
  )
    .map((el) => {
      const box = el.getBoundingClientRect()
      return {
        id: el.dataset.mobileChart || el.dataset.testid || "unknown",
        left: box.left,
        right: box.right,
        width: box.width,
      }
    })
    .filter((box) => box.left < -1 || box.right > viewportWidth + 1)

  const dataCanvases = Array.from(
    document.querySelectorAll<HTMLCanvasElement>("canvas[aria-label]")
  ).filter((canvas) => canvas.width > 0 && canvas.height > 0)
  const unlabeledCanvasCount = dataCanvases.filter((canvas) => {
    const label = canvas.getAttribute("aria-label")
    return !label || label.trim().length === 0
  }).length

  const touchTargetFailures = Array.from(
    document.querySelectorAll<HTMLElement>("[data-mobile-touch-target]")
  )
    .map((el) => {
      const box = el.getBoundingClientRect()
      return {
        id: el.dataset.mobileTouchTarget || el.textContent?.trim() || "target",
        width: box.width,
        height: box.height,
      }
    })
    .filter((target) => target.width < 40 || target.height < 40)

  const labelOverlapFailures: HarnessSummary["labelOverlapFailures"] = []
  for (const chart of Array.from(document.querySelectorAll<HTMLElement>("[data-mobile-chart]"))) {
    const chartId = chart.dataset.mobileChart || chart.dataset.testid || "unknown"
    const labels = Array.from(chart.querySelectorAll<SVGTextElement>("svg text"))
      .map((el) => {
        const style = window.getComputedStyle(el)
        const box = el.getBoundingClientRect()
        return {
          text: el.textContent?.trim() || "label",
          hidden: style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0,
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        }
      })
      .filter((label) => !label.hidden && label.width >= 4 && label.height >= 4)

    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i]
        const b = labels[j]
        const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
        const overlapArea = overlapWidth * overlapHeight
        if (overlapArea <= 0) continue
        const smallerArea = Math.min(a.width * a.height, b.width * b.height)
        const ratio = smallerArea > 0 ? overlapArea / smallerArea : 0
        if (ratio >= 0.82) {
          labelOverlapFailures.push({
            chartId,
            a: a.text,
            b: b.text,
            ratio: Number(ratio.toFixed(2)),
          })
        }
      }
    }
  }

  return {
    viewportWidth,
    documentScrollWidth,
    chartOverflows,
    dataCanvasCount: dataCanvases.length,
    unlabeledCanvasCount,
    calloutItems: document.querySelectorAll('[data-testid="mobile-callouts"] li').length,
    dataSummaryActions: document.querySelectorAll('button[aria-label="Toggle data summary"]').length,
    detailPanels: document.querySelectorAll(".semiotic-mobile-detail-panel").length,
    hoverOnlyRiskCount: document.querySelectorAll("[data-hover-only-detail='true']").length,
    labelOverlapFailures,
    touchTargetFailures,
  }
}

test.describe("mobile visualization preview harness", () => {
  for (const width of mobilePreviewWidths) {
    test(`passes mobile layout checks at ${width}px`, async ({ page }) => {
      const pageErrors: string[] = []
      const consoleErrors: string[] = []

      page.on("pageerror", (error) => pageErrors.push(error.message))
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text())
      })

      await page.setViewportSize({ width, height: width === 768 ? 920 : 980 })
      await page.goto("/mobile-visualization-examples/")
      await waitForAllChartsReady(page)

      const summary = await page.evaluate(inspectMobileHarness)

      expect(pageErrors).toEqual([])
      expect(consoleErrors).toEqual([])
      expect(summary.documentScrollWidth).toBeLessThanOrEqual(summary.viewportWidth + 2)
      expect(summary.chartOverflows).toEqual([])
      expect(summary.dataCanvasCount).toBeGreaterThanOrEqual(3)
      expect(summary.unlabeledCanvasCount).toBe(0)
      expect(summary.calloutItems).toBeGreaterThanOrEqual(2)
      expect(summary.dataSummaryActions).toBeGreaterThanOrEqual(1)
      expect(summary.detailPanels).toBeGreaterThanOrEqual(1)
      expect(summary.hoverOnlyRiskCount).toBe(0)
      expect(summary.labelOverlapFailures).toEqual([])
      expect(summary.touchTargetFailures).toEqual([])

      await expect(page.locator('[data-testid="mobile-harness"]')).toHaveScreenshot(
        `mobile-visualization-${width}.png`,
        { maxDiffPixels: width === 768 ? 900 : 700 }
      )
    })
  }
})
