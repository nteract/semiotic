// Polyfill TextEncoder/TextDecoder for react-dom/server in jsdom
import { TextEncoder, TextDecoder } from "util"
Object.assign(global, { TextEncoder, TextDecoder })

import { extractRenderEvidence } from "./renderEvidence"
import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"

// ── Standalone server SVG dialect (renderChart output) ───────────────

describe("renderChartWithEvidence", () => {
  const barProps = {
    title: "Revenue by Region",
    data: [
      { region: "North", revenue: 10 },
      { region: "South", revenue: 18 },
      { region: "West", revenue: 14 }
    ],
    categoryAccessor: "region",
    valueAccessor: "revenue",
    width: 320,
    height: 220
  }

  it("returns the same SVG as renderChart plus evidence", () => {
    const { svg, evidence } = renderChartWithEvidence("BarChart", barProps)
    expect(svg).toBe(renderChart("BarChart", barProps))
    expect(evidence.empty).toBe(false)
    expect(evidence.totalMarks).toBeGreaterThanOrEqual(3)
    expect(evidence.markCounts.rect).toBeGreaterThanOrEqual(3)
  })

  it("extracts axis tick labels and resolved domain", () => {
    const { evidence } = renderChartWithEvidence("BarChart", barProps)
    expect(evidence.axes.length).toBeGreaterThan(0)
    const allTicks = evidence.axes.flatMap(a => a.tickLabels)
    expect(allTicks).toContain("North")
    expect(allTicks).toContain("South")
    const withDomain = evidence.axes.find(a => a.domain)
    expect(withDomain?.domain).toHaveLength(2)
  })

  it("reads the accessible name from the rendered title", () => {
    const { evidence } = renderChartWithEvidence("BarChart", barProps)
    expect(evidence.accessibleName).toBe("Revenue by Region")
    expect(evidence.title).toBe("Revenue by Region")
  })

  it("counts annotations from props", () => {
    const { evidence } = renderChartWithEvidence("BarChart", {
      ...barProps,
      annotations: [
        { type: "category-highlight", category: "North", label: "leader" },
        { type: "y-threshold", value: 15, label: "target" }
      ]
    })
    expect(evidence.annotationCount).toBe(2)
  })

  it("reports a LineChart path mark", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      data: [
        { x: 1, y: 2 },
        { x: 2, y: 5 },
        { x: 3, y: 4 }
      ],
      xAccessor: "x",
      yAccessor: "y",
      width: 320,
      height: 220
    })
    expect(evidence.empty).toBe(false)
    expect(evidence.markCounts.path).toBeGreaterThanOrEqual(1)
  })
})

// ── HOC SSR dialect (wrapper div + data svg + overlay svg) ────────────

describe("extractRenderEvidence — HOC SSR markup", () => {
  const hocMarkup = `<div class="stream-ordinal-frame" role="img" aria-label="Revenue by Region" style="position:relative"><svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><g transform="translate(70,50)"><rect x="18" y="51" width="77" height="58" fill="#1f77b4"></rect><rect x="114" y="5" width="77" height="104" fill="#1f77b4"></rect></g></svg><svg role="img" width="320" height="220"><title>Revenue by Region</title><desc>Revenue by Region — ordinal data visualization</desc><g transform="translate(70,50)"><g class="ordinal-axes"><g class="semiotic-axis semiotic-axis-bottom" data-orient="bottom"><line x1="0" y1="110" x2="210" y2="110"></line><g><text class="semiotic-axis-tick">North</text></g><g><text class="semiotic-axis-tick">South</text></g></g><g class="semiotic-axis semiotic-axis-left" data-orient="left"><line x1="0" y1="0" x2="0" y2="110"></line><g><text class="semiotic-axis-tick">0</text></g><g><text class="semiotic-axis-tick">15</text></g></g></g></g></svg></div>`

  it("counts only data-layer marks, not axis chrome", () => {
    const evidence = extractRenderEvidence(hocMarkup)
    expect(evidence.markCounts).toEqual({ rect: 2 })
    expect(evidence.totalMarks).toBe(2)
    expect(evidence.empty).toBe(false)
  })

  it("extracts per-orient axes with tick labels and domains", () => {
    const evidence = extractRenderEvidence(hocMarkup)
    expect(evidence.axes).toHaveLength(2)
    const bottom = evidence.axes.find(a => a.orient === "bottom")
    expect(bottom?.tickLabels).toEqual(["North", "South"])
    expect(bottom?.domain).toEqual(["North", "South"])
    const left = evidence.axes.find(a => a.orient === "left")
    expect(left?.domain).toEqual(["0", "15"])
  })

  it("prefers the wrapper aria-label as the accessible name", () => {
    const evidence = extractRenderEvidence(hocMarkup)
    expect(evidence.accessibleName).toBe("Revenue by Region")
    expect(evidence.description).toContain("ordinal data visualization")
  })

  it("flags an empty render", () => {
    const empty = `<div class="stream-xy-frame" role="img" aria-label="XY chart"><svg width="320" height="220"><g></g></svg><svg role="img"><title>XY Chart</title></svg></div>`
    const evidence = extractRenderEvidence(empty)
    expect(evidence.empty).toBe(true)
    expect(evidence.totalMarks).toBe(0)
  })
})
