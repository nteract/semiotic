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
 * For each chart in the matrix we baseline one side-by-side sheet: the SSR
 * SVG beside the CSR canvas. This is intentionally not a strict pixel
 * comparison — SVG and canvas have subtly different anti-aliasing — but one
 * composite baseline makes fidelity gaps visible during normal snapshot
 * review instead of requiring a maintainer to open two independent files.
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
}

interface RenderEvidence {
  frameType: "xy" | "ordinal" | "network" | "geo"
  status: "ok" | "empty"
  empty: boolean
  markCount: number
  markCountByType: Record<string, number>
  nodeCount?: number
  edgeCount?: number
}

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
  if (id === "xy-custom-waffle") {
    expect(evidence.frameType).toBe("xy")
    expect(evidence.markCountByType.rect).toBeGreaterThanOrEqual(100)
    expect(svg).toContain("Custom waffle layout")
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
}

test.describe("SSR / CSR parity", () => {
  for (const c of cases) {
    test(`SSR / CSR sheet — ${c.id}`, async ({ page }) => {
      const ssrProps = c.theme ? { ...c.props, theme: c.theme } : c.props
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
      await expect(target).toHaveScreenshot(`ssr-csr-${c.id}.png`, { maxDiffPixels: 250 })
    })
  }
})
