// Polyfill TextEncoder/TextDecoder for react-dom/server in jsdom
import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import * as React from "react"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactDOMServer = require("react-dom/server") as { renderToStaticMarkup: (el: React.ReactElement) => string }
import { renderStaticLegend, extractCategories } from "./staticLegend"
import { LIGHT_THEME, DARK_THEME } from "../store/ThemeStore"

function renderLegendString(config: Parameters<typeof renderStaticLegend>[0]): string {
  const node = renderStaticLegend(config)
  if (!node) return ""
  return ReactDOMServer.renderToStaticMarkup(<svg>{node}</svg>)
}

describe("renderStaticLegend", () => {
  const baseConfig = {
    categories: ["A", "B", "C"],
    theme: LIGHT_THEME,
    totalWidth: 600,
    totalHeight: 400,
    margin: { top: 20, right: 20, bottom: 30, left: 40 },
  }

  it("returns null for empty categories", () => {
    expect(renderStaticLegend({ ...baseConfig, categories: [] })).toBeNull()
  })

  it("renders swatch rects for each category", () => {
    const svg = renderLegendString(baseConfig)
    expect(svg).toContain("semiotic-legend")
    // 3 categories = 3 rect elements
    expect((svg.match(/<rect /g) || []).length).toBe(3)
  })

  it("renders labels for each category", () => {
    const svg = renderLegendString(baseConfig)
    expect(svg).toContain(">A<")
    expect(svg).toContain(">B<")
    expect(svg).toContain(">C<")
  })

  it("uses theme text color for labels", () => {
    const svg = renderLegendString({ ...baseConfig, theme: DARK_THEME })
    expect(svg).toContain(DARK_THEME.colors.text)
  })

  it("uses custom colorScheme array", () => {
    const svg = renderLegendString({
      ...baseConfig,
      colorScheme: ["#ff0000", "#00ff00", "#0000ff"],
    })
    expect(svg).toContain("#ff0000")
    expect(svg).toContain("#00ff00")
    expect(svg).toContain("#0000ff")
  })

  it("positions legend on the right by default", () => {
    const svg = renderLegendString(baseConfig)
    // Right position: totalWidth - margin.right + 10 = 590
    expect(svg).toContain("translate(590,")
  })

  it("positions legend at top", () => {
    const svg = renderLegendString({ ...baseConfig, position: "top" })
    // Top position uses margin.left as tx
    expect(svg).toContain("translate(40,")
  })

  it("positions legend at bottom within SVG bounds", () => {
    const svg = renderLegendString({ ...baseConfig, position: "bottom" })
    // Bottom: totalHeight(400) - margin.bottom(30) + 8 = 378
    expect(svg).toContain("translate(40,378)")
  })

  it("positions legend at left", () => {
    const svg = renderLegendString({ ...baseConfig, position: "left" })
    expect(svg).toContain("translate(4,")
  })

  it("renders horizontal layout for top/bottom positions", () => {
    const svg = renderLegendString({ ...baseConfig, position: "top" })
    // Horizontal layout: items have translate with increasing x offsets
    const matches = svg.match(/translate\(\d+/g)
    expect(matches).toBeTruthy()
    // Multiple different x translations for horizontal items
    if (matches) {
      const xValues = matches.map(m => parseInt(m.replace("translate(", "")))
      const unique = new Set(xValues)
      expect(unique.size).toBeGreaterThan(1)
    }
  })
})

describe("extractCategories", () => {
  it("returns empty array for empty data", () => {
    expect(extractCategories([], "category")).toEqual([])
  })

  it("returns empty array for undefined accessor", () => {
    expect(extractCategories([{ a: 1 }], undefined)).toEqual([])
  })

  it("extracts unique categories with string accessor", () => {
    const data = [
      { category: "A", value: 1 },
      { category: "B", value: 2 },
      { category: "A", value: 3 },
    ]
    expect(extractCategories(data, "category")).toEqual(["A", "B"])
  })

  it("extracts unique categories with function accessor", () => {
    const data = [{ x: 1, group: "X" }, { x: 2, group: "Y" }, { x: 3, group: "X" }]
    expect(extractCategories(data, (d) => d.group)).toEqual(["X", "Y"])
  })

  it("skips null/undefined values", () => {
    const data = [{ c: "A" }, { c: null }, { c: "B" }, { c: undefined }]
    expect(extractCategories(data, "c")).toEqual(["A", "B"])
  })
})
