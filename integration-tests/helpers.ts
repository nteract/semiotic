import { expect, type Page } from "@playwright/test"

/**
 * Wait for two animation frames to pass on the page. Deterministic
 * replacement for a small `waitForTimeout(100)` after a DOM interaction —
 * one frame to process the event, one more for the resulting render.
 */
export async function waitForRafs(page: Page, count = 2): Promise<void> {
  await page.evaluate(async (n: number) => {
    for (let i = 0; i < n; i++) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }
  }, count)
}

/**
 * Check whether a canvas inside the given container has painted visible
 * content (non-transparent, non-white pixels). Used as the readiness
 * signal for chart mount / streaming update checks.
 *
 * Returns true on the first non-white, non-near-transparent pixel found.
 * Stride samples every 4th pixel and the alpha threshold is intentionally
 * low (>10) so very sparse charts (a 2-point dumbbell plot, a swimlane
 * with a few ribbons, anti-aliased thin candlestick wicks) still register
 * as ready. The previous "≥6 hits at 16-pixel stride" tuning was inherited
 * from the dense streaming-regression pages and timed out on sparser ones.
 */
function canvasHasContentEval(id: string): boolean {
  const container = document.querySelector(`[data-testid="${id}"]`)
  if (!container) return false
  const canvas = container.querySelector("canvas") as HTMLCanvasElement | null
  if (!canvas || canvas.width === 0 || canvas.height === 0) return false
  const ctx = canvas.getContext("2d")
  if (!ctx) return false
  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  } catch {
    return false
  }
  for (let i = 0; i < data.length; i += 16) {
    const a = data[i + 3]
    // Threshold low enough to catch the anti-aliased edges of thin lines
    // (candlestick wicks, grid ticks) — a 2px stroke at a non-integer
    // coordinate can land entirely on edge pixels with alpha around 30.
    if (a <= 10) continue
    if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) continue
    return true
  }
  return false
}

/**
 * Wait for the chart identified by `testId` to mount and paint visible
 * content. Replaces the `waitForVisualization` + `waitForTimeout(500)`
 * boilerplate that was duplicated across every integration spec —
 * event-driven, so fast machines don't pay an arbitrary wait and slow
 * CI doesn't flake.
 *
 * `timeout` covers both the canvas-visible step and the pixel-content
 * poll. Defaults to 10 seconds — the lion's share is the framework
 * warm-up on cold starts.
 */
export async function waitForChartReady(
  page: Page,
  testId: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? 10_000
  const testCase = page.locator(`[data-testid="${testId}"]`)
  await expect(testCase).toBeVisible({ timeout })
  const canvas = testCase.locator("canvas").first()
  await expect(canvas).toBeVisible({ timeout })
  await page.waitForFunction(canvasHasContentEval, testId, { timeout })
}

/**
 * Wait for every data canvas on the current page to have painted content.
 * Used by "does the page render without errors" tests instead of a bulk
 * `waitForTimeout(5000)` — the test proceeds as soon as the page is
 * visibly stable.
 *
 * Stream Frames render the chart onto a data canvas (which carries an
 * `aria-label` via `computeCanvasAriaLabel`) and layer a transparent
 * interaction canvas on top for pointer event capture. The interaction
 * canvas stays blank until the user hovers, so we deliberately filter to
 * `canvas[aria-label]` — otherwise this poll would hang until timeout on
 * any page containing an XY or Geo chart.
 */
export async function waitForAllChartsReady(
  page: Page,
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? 15_000
  // We *don't* wait for `networkidle` — some example pages keep a parcel
  // HMR socket / dev-server poll open in CI, which delays networkidle past
  // the timeout on firefox even though every chart is fully painted. The
  // canvas-content poll below is the actual readiness signal.
  await page.waitForLoadState("load", { timeout })
  await page.waitForFunction(
    () => {
      // Data canvases carry an `aria-label` set by `computeCanvasAriaLabel`;
      // the transparent interaction-canvas overlay does not. Skipping the
      // overlay avoids hanging on hover-driven blank canvases. Fall back to
      // every canvas when no aria-label is present (SVG-only pages).
      const labeled = Array.from(
        document.querySelectorAll("canvas[aria-label]")
      ) as HTMLCanvasElement[]
      const candidates = labeled.length > 0
        ? labeled
        : (Array.from(document.querySelectorAll("canvas")) as HTMLCanvasElement[])
      if (candidates.length === 0) return false
      for (const canvas of candidates) {
        if (canvas.width === 0 || canvas.height === 0) return false
        const ctx = canvas.getContext("2d")
        if (!ctx) return false
        let data: Uint8ClampedArray
        try {
          data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        } catch {
          return false
        }
        let hasPixel = false
        for (let i = 0; i < data.length; i += 16) {
          if (data[i + 3] > 10 && !(data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240)) {
            hasPixel = true
            break
          }
        }
        if (!hasPixel) return false
      }
      return true
    },
    undefined,
    { timeout }
  )
}

/**
 * Wait for a streaming chart to have accumulated new content beyond a
 * captured baseline. Useful for tests like "line chart updates over time"
 * that need to observe streaming behavior without relying on a sleep.
 *
 * The baseline is captured by hashing the canvas screenshot; we poll
 * until the hash changes. `timeout` guards against a frozen stream.
 */
export async function waitForStreamingUpdate(
  page: Page,
  testId: string,
  options: { timeout?: number } = {}
): Promise<void> {
  const timeout = options.timeout ?? 8_000
  // Baseline: lightweight sum of pixel bytes in the first canvas.
  const baseline = await page.evaluate((id: string) => {
    const container = document.querySelector(`[data-testid="${id}"]`)
    if (!container) return 0
    const canvas = container.querySelector("canvas") as HTMLCanvasElement | null
    if (!canvas) return 0
    const ctx = canvas.getContext("2d")
    if (!ctx) return 0
    try {
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let sum = 0
      for (let i = 0; i < data.length; i += 128) sum = (sum + data[i] + data[i + 1] + data[i + 2]) | 0
      return sum
    } catch { return 0 }
  }, testId)

  await page.waitForFunction(
    ({ id, base }: { id: string; base: number }) => {
      const container = document.querySelector(`[data-testid="${id}"]`)
      if (!container) return false
      const canvas = container.querySelector("canvas") as HTMLCanvasElement | null
      if (!canvas) return false
      const ctx = canvas.getContext("2d")
      if (!ctx) return false
      try {
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
        let sum = 0
        for (let i = 0; i < data.length; i += 128) sum = (sum + data[i] + data[i + 1] + data[i + 2]) | 0
        return sum !== base
      } catch { return false }
    },
    { id: testId, base: baseline },
    { timeout }
  )
}
