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
 * For each chart in the matrix we baseline both: the SSR SVG and the
 * CSR canvas. The pair of baselines isn't a strict pixel comparison
 * (SVG and canvas pipelines render with subtly different anti-aliasing
 * and won't match byte-for-byte), but their per-side baselines mean
 * any drift in either pipeline shows up as a snapshot diff and lands
 * in front of a maintainer for review. Together they catch the
 * regression class where one path's output diverges from what users
 * historically saw on hydration.
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
}

test.describe("SSR / CSR parity", () => {
  for (const c of cases) {
    test(`CSR baseline — ${c.id}`, async ({ page }) => {
      await page.goto("/ssr-parity-examples/")
      await waitForChartReady(page, `csr-${c.id}`)
      const target = page.locator(`[data-testid="csr-${c.id}"]`)
      await expect(target).toHaveScreenshot(`csr-${c.id}.png`, { maxDiffPixels: 250 })
    })

    test(`SSR baseline — ${c.id}`, async ({ page }) => {
      const ssrProps = c.theme ? { ...c.props, theme: c.theme } : c.props
      const { svg: ssrSvg, evidence } = getRenderChartWithEvidence()(c.component, ssrProps)
      assertCustomRenderEvidence(c.id, evidence, ssrSvg)
      // Inject directly. White background + tight padding match the
      // CSR fixture so the screenshots are framed comparably even
      // though we don't pixel-compare them directly.
      await page.setContent(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>SSR ${c.id}</title></head>
          <body style="margin:0;padding:16px;background:white;font-family:sans-serif;">
            <div data-testid="ssr-target" style="display:inline-block;background:white;">
              ${ssrSvg}
            </div>
          </body>
        </html>
      `)
      const target = page.locator('[data-testid="ssr-target"]')
      await target.waitFor({ state: "visible" })
      await expect(target).toHaveScreenshot(`ssr-${c.id}.png`, { maxDiffPixels: 250 })
    })
  }
})
