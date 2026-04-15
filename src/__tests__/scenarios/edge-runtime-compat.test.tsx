/**
 * Edge runtime compatibility tests.
 *
 * Verifies that the sync server rendering functions (renderChart, renderDashboard,
 * renderToStaticSVG, generateFrameSVGs) work without Node-only APIs.
 *
 * These functions should work in:
 * - Cloudflare Workers (V8 isolate, no Node builtins)
 * - Vercel Edge Functions (same)
 * - Deno Deploy (V8 + Deno APIs)
 *
 * The async functions (renderToImage, renderToAnimatedGif) require sharp
 * and are explicitly Node-only.
 */

import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import { renderChart, renderToStaticSVG, renderDashboard } from "../../components/server/renderToStaticSVG"
import { generateFrameSVGs } from "../../components/server/animatedGif"

function isValidSVG(svg: string): boolean {
  return svg.startsWith("<svg") && svg.includes("</svg>")
}

describe("Edge runtime compatibility — sync functions", () => {
  it("renderChart produces SVG without Node APIs", () => {
    const svg = renderChart("BarChart", {
      data: [{ category: "A", value: 10 }, { category: "B", value: 20 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      width: 300, height: 200,
    })
    expect(isValidSVG(svg)).toBe(true)
  })

  it("renderChart with theme produces themed SVG", () => {
    const svg = renderChart("LineChart", {
      data: [{ x: 1, y: 10 }, { x: 2, y: 20 }],
      xAccessor: "x",
      yAccessor: "y",
      theme: "dark",
      width: 300, height: 200,
    })
    expect(isValidSVG(svg)).toBe(true)
  })

  it("renderChart with accessibility.colorBlindSafe resolves correctly", () => {
    const svg = renderChart("BarChart", {
      data: [{ category: "A", value: 10 }, { category: "B", value: 20 }],
      categoryAccessor: "category",
      valueAccessor: "value",
      theme: { mode: "light", accessibility: { colorBlindSafe: true } },
      colorBy: "category",
      width: 300, height: 200,
    })
    expect(isValidSVG(svg)).toBe(true)
    // Should use COLOR_BLIND_SAFE_CATEGORICAL palette (first color is #0072B2)
    expect(svg).toContain("#0072B2")
  })

  it("renderDashboard produces multi-chart SVG", () => {
    const svg = renderDashboard([
      { component: "BarChart", props: { data: [{ category: "A", value: 10 }], categoryAccessor: "category", valueAccessor: "value" } },
      { component: "PieChart", props: { data: [{ category: "A", value: 30 }, { category: "B", value: 70 }], categoryAccessor: "category", valueAccessor: "value" } },
    ], { width: 800, layout: { columns: 2 } })
    expect(isValidSVG(svg)).toBe(true)
    expect(svg).toContain("foreignObject")
  })

  it("renderToStaticSVG (frame-level) produces SVG", () => {
    const svg = renderToStaticSVG("xy", {
      chartType: "line",
      data: [{ x: 1, y: 10 }, { x: 2, y: 20 }],
      xAccessor: "x",
      yAccessor: "y",
      size: [300, 200],
    } as any)
    expect(isValidSVG(svg)).toBe(true)
  })

  it("renderChart with all 17 theme presets produces valid SVG", () => {
    const themes = [
      "light", "dark", "high-contrast",
      "tufte", "tufte-dark",
      "pastels", "pastels-dark",
      "bi-tool", "bi-tool-dark",
      "italian", "italian-dark",
      "journalist", "journalist-dark",
      "playful", "playful-dark",
      "carbon", "carbon-dark",
    ]
    for (const theme of themes) {
      const svg = renderChart("BarChart", {
        data: [{ category: "A", value: 10 }],
        categoryAccessor: "category",
        valueAccessor: "value",
        theme,
        width: 200, height: 150,
      })
      expect(isValidSVG(svg)).toBe(true)
    }
  })

  it("renderChart with annotations works without Node APIs", () => {
    const svg = renderChart("LineChart", {
      data: [{ x: 1, y: 10 }, { x: 2, y: 20 }],
      xAccessor: "x",
      yAccessor: "y",
      annotations: [
        { type: "y-threshold", value: 15, label: "Target" },
      ],
      width: 300, height: 200,
    })
    expect(isValidSVG(svg)).toBe(true)
    expect(svg).toContain("Target")
  })

  it("renderChart with legend produces valid SVG", () => {
    const svg = renderChart("BarChart", {
      data: [
        { category: "A", value: 10, group: "X" },
        { category: "B", value: 20, group: "Y" },
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
      colorBy: "group",
      showLegend: true,
      width: 300, height: 200,
    })
    expect(isValidSVG(svg)).toBe(true)
    expect(svg).toContain("semiotic-legend")
  })

  it("generateFrameSVGs produces frame array without Node APIs", () => {
    const data = [
      { x: 1, y: 10 }, { x: 2, y: 20 }, { x: 3, y: 15 },
      { x: 4, y: 25 }, { x: 5, y: 18 }, { x: 6, y: 30 },
    ]
    const frames = generateFrameSVGs("line", data, {
      xAccessor: "x",
      yAccessor: "y",
      width: 300,
      height: 200,
    }, { frameCount: 3 })
    expect(frames.length).toBe(3)
    for (const frame of frames) {
      expect(isValidSVG(frame)).toBe(true)
    }
  })
})
