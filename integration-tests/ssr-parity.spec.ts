import { test, expect } from "@playwright/test"
import * as React from "react"
import { waitForChartReady } from "./helpers"
import { makeSsrParityCases } from "./ssr-parity-fixtures.js"

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

const cases = makeSsrParityCases(React) as ParityCase[]

// Lazy-load `renderChart` from the built server bundle via the CJS
// variant. Playwright's TS loader runs spec files as CJS, and the
// dist/ folder has no `type: "module"` package.json — so Node refuses
// to load the `.module.min.js` ESM bundle from a CJS context. The
// CJS variant (`.min.js`) loads cleanly via `require`. Cached after
// first load to keep the per-test cost down.
let renderChart: ((component: string, props: Record<string, unknown>) => string) | null = null
function getRenderChart() {
  if (renderChart) return renderChart
  const server = require("../dist/server.min.js") as { renderChart?: typeof renderChart }
  renderChart = server.renderChart ?? null
  if (!renderChart) throw new Error("renderChart not found on semiotic/server")
  return renderChart
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
      const render = getRenderChart()
      const ssrProps = c.theme ? { ...c.props, theme: c.theme } : c.props
      const ssrSvg = render(c.component, ssrProps)
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
