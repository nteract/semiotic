import { test, expect } from "@playwright/test"
import { createRequire } from "node:module"
import * as React from "react"
import { waitForChartReady } from "./helpers"

/**
 * SSR / CSR visual parity gate.
 *
 * Two SSR code paths exist in v3:
 *
 *   1. **`renderChart`** (`semiotic/server`) — exercised by the spec
 *      below in Node, output injected into a fresh page via
 *      `page.setContent`. This is the path manual-placeholder /
 *      MCP / static-render consumers go through.
 *   2. **In-frame canvas pipeline** — the same chart rendered via the
 *      live HOC component in the browser fixture. This is the path
 *      auto-hydrating consumers see after the SSR → canvas swap.
 *
 * For each chart in the matrix we compare the current SSR SVG directly with
 * the current CSR canvas, then baseline one side-by-side sheet. The direct
 * comparison uses a two-pixel, color-aware tolerance because SVG and canvas
 * rasterize edges differently; the composite baseline remains the human-
 * reviewable record of intentional rendering changes.
 *
 * Update baselines after intentional rendering changes:
 *   npx playwright test integration-tests/ssr-parity.spec.ts --update-snapshots
 */

interface ParityCase {
  id: string
  component: string
  props: Record<string, unknown>
  package?: "geo"
  theme?: string
  comparison?: "pixel" | "structural"
  /** Legend text that must remain fully inside both fixed chart viewports. */
  visibleLegendLabel?: string
}

interface RenderEvidence {
  frameType: "xy" | "ordinal" | "network" | "geo"
  status: "ok" | "empty"
  empty: boolean
  markCount: number
  markCountByType: Record<string, number>
  nodeCount?: number
  edgeCount?: number
  yDomain?: [number, number]
}

// SVG and layered canvas/SVG frames differ substantially at individual ink
// pixels (text antialiasing, simulation jitter, and canvas glyph coverage).
// This is a coarse current-output alarm for large layout/theme/orientation
// divergence; the fixture-specific SVG assertions and composite baselines are
// the precise gates. Calibrated below every aligned fixture and well below the
// 77–98% ratios produced by the real Likert/geo/dark-theme regressions. The
// aligned Chromium matrix currently tops out at 17.3%, so 25% leaves room for
// browser rasterization while still catching the former 30% default-line-
// color divergence.
const MAX_CURRENT_INK_DIFFERENCE = 0.25

const cjsRequire = createRequire(__filename)

const { makeSsrParityCases } = cjsRequire("./ssr-parity-fixtures.js") as {
  makeSsrParityCases: (ReactModule: typeof React) => ParityCase[]
}
const cases = makeSsrParityCases(React)

// Lazy-load `renderChartWithEvidence` from the built server bundle via the CJS
// variant. Playwright's TS loader runs spec files as CJS, and the
// dist/ folder has no `type: "module"` package.json — so Node refuses
// to load the `.module.min.js` ESM bundle from a CJS context. The
// CJS variant (`.min.js`) loads cleanly via a local createRequire loader. Cached after
// first load to keep the per-test cost down.
let renderChartWithEvidence:
  | ((component: string, props: Record<string, unknown>) => { svg: string; evidence: RenderEvidence })
  | null = null
function getRenderChartWithEvidence() {
  if (renderChartWithEvidence) return renderChartWithEvidence
  const server = cjsRequire("../dist/server.min.js") as {
    renderChartWithEvidence?: typeof renderChartWithEvidence
  }
  renderChartWithEvidence = server.renderChartWithEvidence ?? null
  if (!renderChartWithEvidence) {
    throw new Error("renderChartWithEvidence not found on semiotic/server")
  }
  return renderChartWithEvidence
}

function assertCustomRenderEvidence(id: string, evidence: RenderEvidence, svg: string) {
  expect(evidence.status).toBe("ok")
  expect(evidence.empty).toBe(false)
  expect(evidence.markCount).toBeGreaterThan(0)
  if (id === "area") {
    expect(svg).toMatch(/<path[^>]*d="M[^"]*C/)
    expect(svg).toContain("<linearGradient")
    expect(svg).toMatch(/fill="url\(#/)
    expect(svg.match(/<path[^>]*d="[^"]*Z"[^>]*>/)?.[0]).toContain('stroke="none"')
  }
  if (id === "xy-custom-waffle") {
    expect(evidence.frameType).toBe("xy")
    expect(evidence.markCountByType.rect).toBeGreaterThanOrEqual(100)
    expect(svg).toContain("Custom waffle layout")
  }
  if (id === "temporal-histogram") {
    expect(evidence.frameType).toBe("xy")
    expect(evidence.markCountByType.rect).toBeGreaterThan(0)
    expect(svg).toContain("#d62728")
    expect(svg).toContain("#f59e0b")
  }
  if (id === "ordinal-custom-isotype-glyphs") {
    expect(evidence.frameType).toBe("ordinal")
    expect(evidence.markCountByType.glyph).toBeGreaterThan(0)
    expect(evidence.markCountByType.rect).toBeGreaterThanOrEqual(3)
    expect(svg).toContain("PARTIAL SIGNS USE GLYPH FRACTION")
    expect(svg).toContain("<clipPath")
  }
  if (id === "network-custom-glyph-layout") {
    expect(evidence.frameType).toBe("network")
    expect(evidence.markCountByType["node:glyph"]).toBeGreaterThanOrEqual(4)
    expect(evidence.markCountByType["edge:curved"]).toBeGreaterThan(0)
    expect(svg).toContain("stroke-dasharray")
    expect(svg).toContain("M-7 -5 L5 0 L-7 5")
  }
  if (id === "geo-custom-isotype-glyphs") {
    expect(evidence.frameType).toBe("geo")
    expect(evidence.markCountByType.glyph).toBeGreaterThanOrEqual(4)
    expect(svg).toContain("Projected geo glyphs")
    expect(svg).toContain("<clipPath")
  }
  // Regression checks for props that used to be silently dropped on the SSR
  // (renderChart) path. These assert the prop actually reached the SSR SVG /
  // scene, not just that the screenshot looks plausible — a stale/blank
  // baseline can otherwise "pass" a screenshot diff if it was bootstrapped
  // from the same broken output.
  if (id === "bar-gradient") {
    expect(svg).toContain("<linearGradient")
    expect(svg).toMatch(/fill="url\(#/)
  }
  // Gauge gradients are arc-length sampled into colored radial slices (not a
  // linear SVG gradient). Assert multiple painted colors plus the unfilled
  // band before taking the side-by-side sheet, so the fixture cannot silently
  // regress to a flat/threshold-only SSR gauge while retaining valid marks.
  if (id === "gauge-gradient") {
    const fills = new Set<string>()
    for (const match of svg.matchAll(/<path\b[^>]*fill="([^"]+)"/g)) {
      fills.add(match[1])
    }
    expect(svg).toContain("#d1d5db")
    expect(fills.size).toBeGreaterThan(3)
  }
  // axisExtent:"exact" pins the value axis to the data max (47); the padded
  // "nice" default never emits that tick label.
  if (id === "bar-axis-exact" || id === "line-axis-exact") {
    expect(svg).toContain(">47<")
  }
  // symbolBy makes each mark a d3-shape glyph (scene "symbol" node) instead
  // of a plain circle/point.
  if (id === "swarm-symbol" || id === "scatter-symbol") {
    expect(evidence.markCountByType.symbol).toBeGreaterThan(0)
    expect(evidence.markCountByType.point ?? 0).toBe(0)
  }
  // connectorOpacity reaches the horizontal funnel's between-step connectors.
  if (id === "funnel-connector-opacity") {
    expect(svg).toContain("0.66")
  }
  // trackFill paints the lane background behind each swimlane.
  if (id === "swimlane-track") {
    expect(svg).toContain("#c9d6ea")
  }
  // fillArea:[names] fills one series as an area (gradient) while the other
  // stays a line — SSR used to draw every series as a bare line.
  if (id === "line-mixed-area") {
    expect(svg).toContain("<linearGradient")
    expect(svg).toMatch(/<path\b[^>]*fill="url\(#/)
  }
  // Value-anchored semanticGradient resolves to a colorStops gradient; SSR
  // used to drop it and paint a flat area.
  if (id === "area-semantic-gradient") {
    expect(svg).toContain("<linearGradient")
    expect(svg).toContain("#E5A800")
  }
  // AreaChart semanticLine: the new value-banded top stroke. The fill is a
  // semantic gradient AND the top stroke is split into hard color bands at the
  // semanticGradient offsets — SSR must emit both the gradient fill and the
  // three fill:none stroke segments (one per band color), or it has silently
  // dropped the new stroke-band path.
  if (id === "area-semantic-line") {
    expect(svg).toContain("<linearGradient")
    expect(svg).toMatch(/fill="url\(#/)
    expect(svg).toContain('stroke="#0E9AA7"')
    expect(svg).toContain('stroke="#E5A800"')
    expect(svg).toContain('stroke="#FF7077"')
    expect((svg.match(/<path\b[^>]*fill="none"/g) ?? []).length).toBeGreaterThanOrEqual(3)
  }
  // AreaChart gradientFill via the new unified `{ stops }` config. The gradient
  // must reach SSR (not just the boolean/legacy shorthand) and carry the
  // requested stop color.
  if (id === "area-gradient-stops") {
    expect(svg).toContain("<linearGradient")
    expect(svg).toMatch(/fill="url\(#/)
    expect(svg).toContain("#6C4EE8")
  }
  // BumpChart line mode: one constant-width ribbon (area mark) per team plus a
  // point per team-period. SSR must emit the same area/point marks the canvas
  // draws from the shared bump layout.
  if (id === "bump") {
    expect(evidence.frameType).toBe("xy")
    expect(evidence.markCountByType.area).toBe(4)
    expect(evidence.markCountByType.point).toBe(12)
  }
  // BumpChart ribbon mode — the "bump area chart". Magnitude is encoded as a
  // variable-width perpendicular ribbon (still four area marks, no points),
  // and the SSR ribbon boundaries must match the canvas.
  if (id === "bump-ribbon") {
    expect(evidence.frameType).toBe("xy")
    expect(evidence.markCountByType.area).toBe(4)
    expect(evidence.markCountByType.point ?? 0).toBe(0)
  }
  // band draws a filled envelope that follows the line's curve. SSR dropped
  // the band; the ribbon also used to ignore the curve (straight edges).
  if (id === "line-band") {
    // A filled ribbon path (lines are fill:none) that carries cubic curve
    // commands — proves both that the band rendered AND that it curved.
    expect(svg).toMatch(/<path\b[^>]*d="M[^"]*C[^"]*"[^>]*fill="(?!none)/)
  }
  // valueExtent pins the value axis; the single 40-of-100 segment must not
  // fill the whole lane. yDomain is ground truth from the resolved scale.
  if (id === "swimlane-value-extent") {
    expect(evidence.yDomain).toEqual([0, 100])
  }
  // colorBy paints leaf tiles with distinct categorical fills and
  // labelMode:"all" labels every tier. SSR used to collapse to one fill and
  // drop parent labels.
  if (id === "treemap-colorby-labels") {
    expect(svg).toContain("#0E9AA7")
    expect(svg).toContain("#C2185B")
    expect(svg).toContain(">Group A<")
  }
  // hideRoot nodeStyle must compose with colorBy (not replace it) and keep
  // nested header-band geometry (paddingTop bands + parent labels).
  if (id === "treemap-hideroot") {
    expect(svg).toContain("transparent")
    expect(svg).toContain("#0E9AA7")
    expect(svg).toContain("#C2185B")
    expect(svg).toContain(">Group A<")
  }
  // Range/dumbbell candlestick: endpoint bulbs (2 per point), no body rect.
  // SSR used to draw a filled body rect for high/low-only data.
  if (id === "range-dumbbell") {
    expect((svg.match(/<circle/g) ?? []).length).toBe(rangeDumbbellPoints * 2)
  }
  // Custom middleAccessor bulb+pill via svgAnnotationRules — SSR used to drop
  // the entire custom rule path even after the native dumbbell was fixed.
  if (id === "range-middle-overlay") {
    expect(svg).toContain("range-middle-overlay")
    expect((svg.match(/range-middle-overlay/g) ?? []).length).toBe(rangeMiddlePoints)
    expect(svg).toContain("#DB2777")
    // Native dumbbell bulbs still present (2 endpoints × N points).
    expect((svg.match(/<circle/g) ?? []).length).toBeGreaterThanOrEqual(rangeMiddlePoints * 2)
  }
  // A declarative HatchFill segment resolves to an SVG <pattern> server-side.
  if (id === "swimlane-hatch") {
    expect(svg).toContain("<pattern")
    expect(svg).toMatch(/fill="url\(#/)
  }
  // Native x-band (region fill) + x-threshold (dashed line + label) both
  // serialize server-side; a bespoke vertical-annotation implementation used
  // to drop them from SSR.
  if (id === "line-vertical-bands") {
    expect(svg).toContain("Catch-up window")
    expect(svg).toContain("Caught up")
    expect(svg).toMatch(/stroke-dasharray/)
  }
  // Geo svgAnnotationRules: custom pin glyphs + fall-through built-in callout.
  // GeoSVGOverlay previously hard-coded `undefined` for the user rule.
  if (id === "geo-custom-annotation") {
    expect(svg).toContain("geo-custom-pin")
    expect((svg.match(/geo-custom-pin/g) ?? []).length).toBe(2)
    expect(svg).toContain("#DB2777")
    expect(svg).toContain("#0E9AA7")
    // Built-in callout still rendered (rule returned null for type:"callout").
    expect(svg).toContain("Delta")
  }
}

/** Point count for the range-dumbbell fixture (kept in sync with the fixture). */
const rangeDumbbellPoints = 5
/** Point count for the range-middle-overlay fixture (kept in sync with the fixture). */
const rangeMiddlePoints = 5

async function compareCurrentPanels(
  page: import("@playwright/test").Page,
  ssrPanel: import("@playwright/test").Locator,
  csrPanel: import("@playwright/test").Locator,
): Promise<{
  differenceRatio: number
  differingPixels: number
  inkPixels: number
  sameSize: boolean
  dominantColors?: { ssr: string[]; csr: string[] }
  inkBounds?: { ssr: number[]; csr: number[] }
}> {
  const [ssrPng, csrPng] = await Promise.all([
    ssrPanel.screenshot({ animations: "disabled" }),
    csrPanel.screenshot({ animations: "disabled" }),
  ])
  return page.evaluate(async ({ ssr, csr }) => {
    const loadPixels = async (base64: string) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const context = canvas.getContext("2d", { willReadFrequently: true })!
      // Locator screenshots can retain transparent pixels differently for an
      // SVG root and a layered canvas frame. Composite both onto the same
      // review-sheet background before comparing RGB values.
      context.fillStyle = "#fff"
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0)
      return {
        width: canvas.width,
        height: canvas.height,
        pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
      }
    }
    const [a, b] = await Promise.all([loadPixels(ssr), loadPixels(csr)])
    if (a.width !== b.width || a.height !== b.height) {
      return { differenceRatio: 1, differingPixels: 1, inkPixels: 1, sameSize: false }
    }

    const isInk = (pixels: Uint8ClampedArray, index: number) =>
      Math.min(pixels[index], pixels[index + 1], pixels[index + 2]) < 245
    const hasNearbyColorMatch = (
      source: Uint8ClampedArray,
      target: Uint8ClampedArray,
      x: number,
      y: number,
    ) => {
      const sourceIndex = (y * a.width + x) * 4
      for (let targetY = Math.max(0, y - 2); targetY <= Math.min(a.height - 1, y + 2); targetY++) {
        for (let targetX = Math.max(0, x - 2); targetX <= Math.min(a.width - 1, x + 2); targetX++) {
          const targetIndex = (targetY * a.width + targetX) * 4
          if (!isInk(target, targetIndex)) continue
          const channelDelta = Math.max(
            Math.abs(source[sourceIndex] - target[targetIndex]),
            Math.abs(source[sourceIndex + 1] - target[targetIndex + 1]),
            Math.abs(source[sourceIndex + 2] - target[targetIndex + 2]),
          )
          if (channelDelta <= 48) return true
        }
      }
      return false
    }

    // Compare meaningful painted pixels rather than letting the shared white
    // background hide a missing legend, axis, or mark. Check both directions:
    // otherwise content present on only one side could never count as a diff.
    let inkPixels = 0
    let differingPixels = 0
    for (let y = 0; y < a.height; y++) {
      for (let x = 0; x < a.width; x++) {
        const index = (y * a.width + x) * 4
        if (isInk(a.pixels, index)) {
          inkPixels++
          if (!hasNearbyColorMatch(a.pixels, b.pixels, x, y)) differingPixels++
        }
        if (isInk(b.pixels, index)) {
          inkPixels++
          if (!hasNearbyColorMatch(b.pixels, a.pixels, x, y)) differingPixels++
        }
      }
    }
    const dominantColors = (pixels: Uint8ClampedArray) => {
      const counts = new Map<string, number>()
      for (let index = 0; index < pixels.length; index += 4) {
        const channels = [pixels[index], pixels[index + 1], pixels[index + 2]]
        if (Math.max(...channels) - Math.min(...channels) < 24) continue
        const color = channels.map(value => value.toString(16).padStart(2, "0")).join("")
        counts.set(color, (counts.get(color) ?? 0) + 1)
      }
      return [...counts].sort((left, right) => right[1] - left[1]).slice(0, 4).map(([color]) => `#${color}`)
    }
    const inkBounds = (pixels: Uint8ClampedArray) => {
      let minX = a.width, minY = a.height, maxX = -1, maxY = -1
      for (let y = 0; y < a.height; y++) {
        for (let x = 0; x < a.width; x++) {
          if (!isInk(pixels, (y * a.width + x) * 4)) continue
          minX = Math.min(minX, x)
          minY = Math.min(minY, y)
          maxX = Math.max(maxX, x)
          maxY = Math.max(maxY, y)
        }
      }
      return [minX, minY, maxX, maxY]
    }
    return {
      differenceRatio: inkPixels === 0 ? 0 : differingPixels / inkPixels,
      differingPixels,
      inkPixels,
      sameSize: true,
      dominantColors: { ssr: dominantColors(a.pixels), csr: dominantColors(b.pixels) },
      inkBounds: { ssr: inkBounds(a.pixels), csr: inkBounds(b.pixels) },
    }
  }, { ssr: ssrPng.toString("base64"), csr: csrPng.toString("base64") })
}

test.describe("SSR / CSR parity", () => {
  for (const c of cases) {
    test(`SSR / CSR sheet — ${c.id}`, async ({ page }) => {
      const ssrProps = c.theme
        ? { ...c.props, animate: false, theme: c.theme }
        : { ...c.props, animate: false }
      const { svg: ssrSvg, evidence } = getRenderChartWithEvidence()(c.component, ssrProps)
      assertCustomRenderEvidence(c.id, evidence, ssrSvg)

      // Render only this fixture's CSR chart. Mounting the full matrix for
      // every screenshot multiplies browser startup work by 52 and makes
      // visual-review runs needlessly slow.
      await page.goto(`/ssr-parity-examples/?case=${encodeURIComponent(c.id)}`)
      await waitForChartReady(page, `csr-${c.id}`)

      // Keep the live CSR chart exactly as it rendered in the browser, then
      // place the standalone server SVG beside it. Moving the CSR fixture
      // node (rather than recreating it) retains its settled canvas pixels.
      await page.evaluate(({ id, component, svg }) => {
        const csrCase = document.querySelector<HTMLElement>(`[data-testid="csr-${id}"]`)
        if (!csrCase) throw new Error(`Missing CSR fixture for ${id}`)

        csrCase.querySelector("h2")?.remove()
        const sheet = document.createElement("section")
        sheet.className = "ssr-csr-sheet"
        sheet.dataset.testid = `ssr-csr-${id}`

        const title = document.createElement("h1")
        title.textContent = `${component} — ${id}`
        sheet.append(title)

        const columns = document.createElement("div")
        columns.className = "ssr-csr-columns"
        for (const [label, content] of [["SSR", null], ["CSR", csrCase]] as const) {
          const panel = document.createElement("article")
          panel.className = "ssr-csr-panel"
          const heading = document.createElement("h2")
          heading.textContent = label
          panel.append(heading)

          if (label === "SSR") {
            const ssrCase = document.createElement("div")
            ssrCase.className = "test-case"
            ssrCase.innerHTML = svg
            panel.append(ssrCase)
          } else if (content) {
            panel.append(content)
          }
          columns.append(panel)
        }
        sheet.append(columns)
        document.body.append(sheet)
      }, { id: c.id, component: c.component, svg: ssrSvg })

      const target = page.locator(`[data-testid="ssr-csr-${c.id}"]`)
      const chartPanels = target.locator(".ssr-csr-panel .test-case")
      // Compare the chart surfaces themselves. The CSR fixture wrapper also
      // contains accessibility/table controls that are intentionally outside
      // the fixed-size visual frame and would make wrapper crops differ.
      const ssrVisual = chartPanels.nth(0).locator("svg").first()
      const csrVisual = chartPanels.nth(1).locator('[role="group"]').first()
      if (c.visibleLegendLabel) {
        for (const visual of [ssrVisual, csrVisual]) {
          const visualBox = await visual.boundingBox()
          const labelBox = await visual.getByText(c.visibleLegendLabel, { exact: true }).first().boundingBox()
          expect(visualBox, `${c.id}: chart viewport must be measurable`).not.toBeNull()
          expect(labelBox, `${c.id}: legend label ${c.visibleLegendLabel} must render`).not.toBeNull()
          expect(labelBox!.x).toBeGreaterThanOrEqual(visualBox!.x)
          expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(visualBox!.x + visualBox!.width + 0.5)
        }
      }
      const currentDiff = await compareCurrentPanels(page, ssrVisual, csrVisual)
      if (process.env.SSR_PARITY_DIAGNOSTICS === "1") {
        console.log(`${c.id}: ${(currentDiff.differenceRatio * 100).toFixed(2)}%`)
      }
      expect(currentDiff.sameSize, `${c.id}: SSR/CSR panels must have the same dimensions`).toBe(true)
      if (c.comparison !== "structural") {
        expect(
          currentDiff.differenceRatio,
          `${c.id}: current SSR/CSR ink differs by ${(currentDiff.differenceRatio * 100).toFixed(1)}% ` +
            `(${currentDiff.differingPixels}/${currentDiff.inkPixels} painted pixels); ` +
            `dominant colors ${JSON.stringify(currentDiff.dominantColors)}; ` +
            `ink bounds ${JSON.stringify(currentDiff.inkBounds)}`,
        ).toBeLessThanOrEqual(MAX_CURRENT_INK_DIFFERENCE)
      }
      await expect(target).toHaveScreenshot(`ssr-csr-${c.id}.png`, { maxDiffPixels: 250 })
    })
  }
})
