import { describe, expect, it } from "vitest"

import { renderChart, renderChartWithEvidence } from "./renderToStaticSVG"
import { buildArtifactContract } from "../artifact/contract"

/**
 * Render evidence — ground truth emitted from the same scene the SVG
 * converter walks. These tests pin the contract the MCP renderChart tool
 * and agent repair loops depend on: marks are counted from the rendered
 * scene (never inferred from props), emptiness is explicit, and domains
 * are the *resolved* scale domains.
 */

const lineData = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  revenue: 100 + i * 12
}))

const barData = [
  { product: "Widget", units: 480 },
  { product: "Gadget", units: 620 },
  { product: "Sprocket", units: 290 }
]

describe("renderChartWithEvidence", () => {
  it("returns the same SVG renderChart returns", () => {
    const props = {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue",
      title: "Revenue"
    }
    const svgOnly = renderChart("LineChart", props)
    const { svg } = renderChartWithEvidence("LineChart", props)
    expect(svg).toBe(svgOnly)
  })

  it("carries an optional artifact contract beside server render evidence", () => {
    const props = {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue",
      title: "Revenue"
    }
    const contract = buildArtifactContract("LineChart", props, {
      id: "server-revenue",
      intents: ["trend"],
      evidence: [
        {
          id: "rows",
          role: "source-data",
          sample: { rowCount: 1, values: [{ privateValue: 100 }] }
        }
      ]
    })
    const { evidence } = renderChartWithEvidence("LineChart", props, {
      artifactContract: contract
    })

    expect(JSON.stringify(evidence.artifactContract)).not.toContain(
      "privateValue"
    )
    expect(evidence.artifactContract).not.toBe(contract)
    expect(evidence.artifactTransfer?.status).toBe("excluded")
    expect(evidence.artifactBinding).toEqual({
      status: "match",
      mismatchPaths: [],
      unknownPaths: []
    })
  })

  it("reports mismatched and undeclared contract identity separately", () => {
    const props = {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue",
      title: "Revenue"
    }
    const contract = buildArtifactContract("LineChart", props, {
      id: "server-binding",
      intents: ["trend"]
    })
    const mismatch = structuredClone(contract)
    mismatch.artifact.component = "BarChart"
    const mismatchEvidence = renderChartWithEvidence("LineChart", props, {
      artifactContract: mismatch
    }).evidence
    const unknown = structuredClone(contract)
    delete unknown.artifact.component
    delete unknown.artifact.configFingerprint
    delete unknown.artifact.dataFingerprint
    const unknownEvidence = renderChartWithEvidence("LineChart", props, {
      artifactContract: unknown
    }).evidence

    expect(mismatchEvidence.artifactBinding).toMatchObject({
      status: "mismatch",
      mismatchPaths: ["artifact.component"]
    })
    expect(unknownEvidence.artifactBinding).toEqual({
      status: "unknown",
      mismatchPaths: [],
      unknownPaths: [
        "artifact.component",
        "artifact.configFingerprint",
        "artifact.dataFingerprint"
      ]
    })
  })

  it("emits XY evidence with marks, domains, and the component name", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue",
      title: "Revenue over time"
    })
    expect(evidence.component).toBe("LineChart")
    expect(evidence.frameType).toBe("xy")
    expect(evidence.status).toBe("ok")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
    expect(Object.keys(evidence.markCountByType).length).toBeGreaterThan(0)
    // Resolved domains cover the data (extentPadding may widen them).
    expect(evidence.xDomain).toBeDefined()
    expect(evidence.xDomain![0]).toBeLessThanOrEqual(1)
    expect(evidence.xDomain![1]).toBeGreaterThanOrEqual(12)
    expect(evidence.yDomain).toBeDefined()
    expect(evidence.yDomain![1]).toBeGreaterThanOrEqual(232)
    expect(evidence.ariaLabel).toBe("Revenue over time")
    expect(evidence.warnings).toEqual([])
  })

  it("reports a painted BumpChart with no rank competition as degenerate", () => {
    const { evidence } = renderChartWithEvidence("BumpChart", {
      data: [
        { period: "Q1", service: "alpha", throughput: 10 },
        { period: "Q2", service: "alpha", throughput: 15 },
        { period: "Q3", service: "alpha", throughput: 8 },
        { period: "Q4", service: "alpha", throughput: 18 }
      ],
      xAccessor: "period",
      yAccessor: "throughput",
      lineBy: "service",
      showPoints: true,
      showLabels: false
    })

    expect(evidence.status).toBe("ok")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThan(0)
    expect(evidence.semanticStatus).toBe("degenerate")
    expect(evidence.semanticDiagnostics).toEqual([
      expect.objectContaining({
        code: "BUMP_NO_RANK_COMPETITION",
        severity: "error"
      })
    ])
  })

  it("reports an empty render honestly", () => {
    const { svg, evidence } = renderChartWithEvidence("LineChart", {
      data: [],
      xAccessor: "month",
      yAccessor: "revenue"
    })
    expect(svg).toContain("<svg")
    expect(evidence.status).toBe("empty")
    expect(evidence.empty).toBe(true)
    expect(evidence.markCount).toBe(0)
    expect(evidence.warnings).toContain("EMPTY_SCENE")
  })

  it("normalizes pre-grouped AreaChart data and counts only painted marks", () => {
    const { svg, evidence } = renderChartWithEvidence("AreaChart", {
      data: [
        {
          series: "alpha",
          coordinates: [
            { x: 0, y: 1 },
            { x: 1, y: 3 },
            { x: 2, y: 2 }
          ]
        }
      ],
      areaBy: "series",
      lineDataAccessor: "coordinates",
      xAccessor: "x",
      yAccessor: "y",
      width: 400,
      height: 220
    })
    expect(svg).toMatch(/<path[^>]+d="M/)
    expect(evidence.status).toBe("ok")
    expect(evidence.markCountByType.area).toBe(1)
  })

  it("emits ordinal evidence with the category domain", () => {
    const { evidence } = renderChartWithEvidence("BarChart", {
      data: barData,
      categoryAccessor: "product",
      valueAccessor: "units",
      title: "Sales"
    })
    expect(evidence.frameType).toBe("ordinal")
    expect(evidence.empty).toBe(false)
    expect(evidence.categories).toEqual(["Widget", "Gadget", "Sprocket"])
    expect(evidence.yDomain).toBeDefined()
    expect(evidence.yDomain![1]).toBeGreaterThanOrEqual(620)
  })

  it("emits native value evidence for BigNumber", () => {
    const { svg, evidence } = renderChartWithEvidence("BigNumber", {
      value: 0.97,
      label: "SLA attainment",
      format: "percent",
      comparison: { value: 0.95, label: "vs last month" },
      target: { value: 0.99, label: "target" },
      thresholds: [
        { at: 0, level: "danger" },
        { at: 0.95, level: "warning" },
        { at: 0.99, level: "success" }
      ]
    })
    expect(svg).toContain('data-semiotic-component="BigNumber"')
    expect(svg).toContain("97%")
    expect(evidence.component).toBe("BigNumber")
    expect(evidence.frameType).toBe("value")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBe(1)
    expect(evidence.markCountByType.value).toBe(1)
  })

  it("emits network evidence with node and edge counts", () => {
    const { evidence } = renderChartWithEvidence("SankeyDiagram", {
      edges: [
        { source: "A", target: "B", value: 10 },
        { source: "B", target: "C", value: 6 }
      ],
      title: "Flow"
    })
    expect(evidence.frameType).toBe("network")
    expect(evidence.empty).toBe(false)
    expect(evidence.nodeCount).toBeGreaterThanOrEqual(3)
    expect(evidence.edgeCount).toBe(2)
    expect(evidence.markCount).toBe(
      (evidence.nodeCount ?? 0) + (evidence.edgeCount ?? 0)
    )
  })

  it("emits geo evidence from rendered features", () => {
    const { evidence } = renderChartWithEvidence("ChoroplethMap", {
      areas: [
        {
          type: "Feature",
          id: "CA",
          properties: { name: "California", value: 39 },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-124, 32],
                [-114, 32],
                [-114, 42],
                [-124, 42],
                [-124, 32]
              ]
            ]
          }
        },
        {
          type: "Feature",
          id: "TX",
          properties: { name: "Texas", value: 29 },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [-106, 26],
                [-93, 26],
                [-93, 36],
                [-106, 36],
                [-106, 26]
              ]
            ]
          }
        }
      ],
      valueAccessor: "value",
      title: "States"
    })
    expect(evidence.frameType).toBe("geo")
    expect(evidence.empty).toBe(false)
    expect(evidence.markCount).toBeGreaterThanOrEqual(2)
  })

  it("counts annotations rendered into the SVG", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue",
      annotations: [
        { type: "y-threshold", value: 150, label: "Target" },
        { type: "label", month: 6, revenue: 172, label: "Mid-year" }
      ]
    })
    expect(evidence.annotationCount).toBe(2)
    expect(evidence.annotationInputCount).toBe(2)
    expect(evidence.unrenderedAnnotationCount).toBe(0)
  })

  it("reports unrendered annotation input instead of claiming it painted", () => {
    const { evidence, svg } = renderChartWithEvidence("LineChart", {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue",
      annotations: [
        { type: "y-threshold", value: 150, label: "Target" },
        { type: "not-a-static-annotation" }
      ]
    })
    expect(svg).toContain("Target")
    expect(evidence.annotationInputCount).toBe(2)
    expect(evidence.annotationCount).toBe(1)
    expect(evidence.unrenderedAnnotationCount).toBe(1)
    expect(evidence.unrenderedAnnotationTypes).toEqual([
      "not-a-static-annotation"
    ])
    expect(evidence.warnings).toContain("UNRENDERED_ANNOTATIONS")
  })

  it("generates an aria label when no title or description is given", () => {
    const { evidence } = renderChartWithEvidence("LineChart", {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue"
    })
    expect(evidence.ariaLabel).toMatch(/xy chart, \d+ marks/)
  })
})

/**
 * axisExtent ("exact") SSR parity. The static XY/ordinal renderers hand-list
 * props into their pipeline config; axisExtent used to be omitted, so
 * `axisExtent: "exact"` silently no-op'd in server output (the same class of
 * bug as the dropped bar gradientFill). These assert the resolved value-axis
 * domain is pinned to the data max under "exact" and differs from the padded
 * default — using the evidence domain (ground truth from the rendered scene)
 * rather than a screenshot.
 */
describe("axisExtent SSR parity", () => {
  // Non-round maxima so "nice"/padded (rounds/pads up) and "exact" (pins to
  // the data max) produce a visibly different resolved domain.
  const ordinalData = [
    { category: "A", value: 47 },
    { category: "B", value: 23 },
    { category: "C", value: 31 }
  ]
  const xyData = [
    { x: 3, y: 47 },
    { x: 17, y: 23 },
    { x: 29, y: 31 }
  ]

  it("ordinal: exact pins the value-axis domain and renders an endpoint tick", () => {
    const base = {
      data: ordinalData,
      categoryAccessor: "category",
      valueAccessor: "value"
    }
    const dflt = renderChartWithEvidence("BarChart", base)
    const exact = renderChartWithEvidence("BarChart", {
      ...base,
      axisExtent: "exact"
    })
    // Domain (bar heights) pinned to the data max.
    expect(exact.evidence.yDomain).toEqual([0, 47])
    expect(exact.evidence.yDomain).not.toEqual(dflt.evidence.yDomain)
    // Tick label lands on the data max (the axisExtent headline behavior),
    // which the padded "nice" default does not produce.
    expect(exact.svg).toContain(">47<")
    expect(dflt.svg).not.toContain(">47<")
  })

  it("xy: exact pins the y-domain and renders min/max endpoint ticks", () => {
    const base = { data: xyData, xAccessor: "x", yAccessor: "y" }
    const dflt = renderChartWithEvidence("LineChart", base)
    const exact = renderChartWithEvidence("LineChart", {
      ...base,
      axisExtent: "exact"
    })
    expect(exact.evidence.yDomain).toEqual([23, 47])
    expect(exact.evidence.yDomain).not.toEqual(dflt.evidence.yDomain)
    expect(exact.svg).toContain(">47<") // data max
    expect(exact.svg).toContain(">23<") // data min
    expect(dflt.svg).not.toContain(">47<")
  })

  it("xy: a per-axis nice override keeps y padding while x stays exact", () => {
    const mixed = renderChartWithEvidence("LineChart", {
      data: xyData,
      xAccessor: "x",
      yAccessor: "y",
      axisExtent: "exact",
      frameProps: {
        axes: [{ orient: "bottom" }, { orient: "left", extent: "nice" }]
      }
    })
    expect(mixed.evidence.yDomain![0]).toBeLessThan(23)
    expect(mixed.evidence.yDomain![1]).toBeGreaterThan(47)
    expect(mixed.svg).toContain(">3<")
    expect(mixed.svg).toContain(">29<")
    expect(mixed.svg).not.toContain(">47<")
  })
})

/**
 * HOC-level props → SSR frame parity. These props are exposed by a chart's
 * HOC (and advertised in validationMap) but were dropped on the renderChart
 * path because the per-chart server buildProps never mapped the HOC prop into
 * frame props — the layer above the pipeline-config drops fixed for gradientFill
 * and axisExtent. symbolBy needs an HOC→frame rename (→ symbolAccessor);
 * connectorOpacity/trackFill share their name but still had to be forwarded.
 */
describe("HOC prop → SSR frame parity", () => {
  it("SwarmPlot: symbolBy emits glyph (symbol) marks instead of circles", () => {
    const data = [
      { category: "A", value: 10, kind: "x" },
      { category: "A", value: 12, kind: "y" },
      { category: "B", value: 8, kind: "x" },
      { category: "B", value: 15, kind: "y" }
    ]
    const base = { data, categoryAccessor: "category", valueAccessor: "value" }
    const plain = renderChartWithEvidence("SwarmPlot", base).evidence
    const symbol = renderChartWithEvidence("SwarmPlot", {
      ...base,
      symbolBy: "kind"
    }).evidence
    // Without symbolBy: plain circles. With symbolBy: d3-shape glyph marks.
    expect(plain.markCountByType.symbol ?? 0).toBe(0)
    expect(plain.markCountByType.point ?? 0).toBe(4)
    expect(symbol.markCountByType.symbol).toBe(4)
  })

  it("Scatterplot: symbolBy emits glyph (symbol) marks instead of circles", () => {
    const data = [
      { x: 1, y: 4, kind: "x" },
      { x: 2, y: 7, kind: "y" },
      { x: 3, y: 5, kind: "x" }
    ]
    const base = { data, xAccessor: "x", yAccessor: "y" }
    const plain = renderChartWithEvidence("Scatterplot", base).evidence
    const symbol = renderChartWithEvidence("Scatterplot", {
      ...base,
      symbolBy: "kind"
    }).evidence
    expect(plain.markCountByType.symbol ?? 0).toBe(0)
    expect(symbol.markCountByType.symbol).toBe(3)
  })

  it("SwarmPlot: symbolMap pins categories to explicit shapes", () => {
    const data = [
      { category: "A", value: 10, kind: "hit" },
      { category: "B", value: 8, kind: "miss" }
    ]
    const base = {
      data,
      categoryAccessor: "category",
      valueAccessor: "value",
      symbolBy: "kind"
    }
    // Glyphs render as <path> elements. Swapping the map must swap the shapes:
    // if symbolMap reached the scene the two SVGs differ; if it were ignored
    // (auto-assigned by first-seen order) they'd be identical.
    const svg = renderChart("SwarmPlot", {
      ...base,
      symbolMap: { hit: "star", miss: "cross" }
    })
    const swapped = renderChart("SwarmPlot", {
      ...base,
      symbolMap: { hit: "cross", miss: "star" }
    })
    expect(svg).toContain("<path")
    expect(svg).not.toBe(swapped)
  })

  it("FunnelChart: connectorOpacity reaches the horizontal funnel connectors", () => {
    const data = [
      { step: "Visit", value: 1000 },
      { step: "Signup", value: 400 },
      { step: "Paid", value: 120 }
    ]
    const base = { data, stepAccessor: "step", valueAccessor: "value" }
    const dflt = renderChart("FunnelChart", base)
    const custom = renderChart("FunnelChart", {
      ...base,
      connectorOpacity: 0.42
    })
    expect(custom).not.toBe(dflt)
    expect(custom).toContain("0.42")
  })

  it("SwimlaneChart: trackFill paints the lane background", () => {
    const data = [
      { lane: "Team A", phase: "plan", value: 3 },
      { lane: "Team A", phase: "build", value: 5 },
      { lane: "Team B", phase: "plan", value: 2 },
      { lane: "Team B", phase: "ship", value: 4 }
    ]
    const base = {
      data,
      categoryAccessor: "lane",
      subcategoryAccessor: "phase",
      valueAccessor: "value"
    }
    const dflt = renderChart("SwimlaneChart", base)
    const track = renderChart("SwimlaneChart", {
      ...base,
      trackFill: "#eeeeee"
    })
    expect(track).not.toBe(dflt)
    expect(track).toContain("#eeeeee")
  })

  it("SwimlaneChart: rounded trackFill serializes through the rounded SVG path", () => {
    const data = [{ lane: "Roadmap", phase: "implemented", value: 40 }]
    const svg = renderChart("SwimlaneChart", {
      data,
      categoryAccessor: "lane",
      subcategoryAccessor: "phase",
      valueAccessor: "value",
      valueExtent: [0, 100],
      trackFill: "#d4dce8",
      roundedTop: (laneWidth: number) => laneWidth / 10
    })

    expect(svg).toMatch(/<path[^>]*fill="#d4dce8"/)
    expect(svg).not.toMatch(/<rect[^>]*fill="#d4dce8"/)
  })
})

// Semiotic auto-reserves/adjusts margin (e.g. to fit a legend), so a caller
// hand-drawing an SSR overlay (an end-cap circle, a custom glyph positioned
// outside `svgAnnotationRules`) can't reconstruct the actual plot rectangle
// from the input props alone — only evidence exposes the ground truth.
describe("RenderEvidence — resolved margin / plot rect", () => {
  it("matches the data-area translate() for a chart with no auto-reserved chrome", () => {
    const { svg, evidence } = renderChartWithEvidence("LineChart", {
      data: lineData,
      xAccessor: "month",
      yAccessor: "revenue"
    })
    expect(evidence.margin).toBeDefined()
    const translateMatch = svg.match(
      /id="data-area" transform="translate\(([\d.]+),([\d.]+)\)"/
    )
    expect(translateMatch).toBeTruthy()
    const [, tx, ty] = translateMatch as RegExpMatchArray
    expect(evidence.margin?.left).toBeCloseTo(Number(tx))
    expect(evidence.margin?.top).toBeCloseTo(Number(ty))
    expect(evidence.plot).toEqual({
      x: evidence.margin?.left,
      y: evidence.margin?.top,
      width:
        evidence.width -
        (evidence.margin?.left ?? 0) -
        (evidence.margin?.right ?? 0),
      height:
        evidence.height -
        (evidence.margin?.top ?? 0) -
        (evidence.margin?.bottom ?? 0)
    })
  })

  it("reflects an auto-reserved legend margin, not just the caller's input margin", () => {
    const grouped = lineData.map((d, i) => ({
      ...d,
      series: i % 2 === 0 ? "A" : "B"
    }))
    const withoutLegend = renderChartWithEvidence("LineChart", {
      data: grouped,
      xAccessor: "month",
      yAccessor: "revenue",
      lineBy: "series"
    })
    const withLegend = renderChartWithEvidence("LineChart", {
      data: grouped,
      xAccessor: "month",
      yAccessor: "revenue",
      lineBy: "series",
      showLegend: true,
      legendPosition: "bottom"
    })
    // A bottom legend grows the reserved bottom margin beyond the default —
    // the exact "legend eats into the plot" case a hand-drawn overlay can't
    // see without evidence, since it isn't in the input props.
    expect(withLegend.evidence.margin?.bottom).toBeGreaterThan(
      withoutLegend.evidence.margin?.bottom ?? 0
    )
    const translateMatch = withLegend.svg.match(
      /id="data-area" transform="translate\(([\d.]+),([\d.]+)\)"/
    )
    const [, tx, ty] = translateMatch as RegExpMatchArray
    expect(withLegend.evidence.margin?.left).toBeCloseTo(Number(tx))
    expect(withLegend.evidence.margin?.top).toBeCloseTo(Number(ty))
  })

  it("clamps compact HOC legend reservation before it can make the plot negative", () => {
    const { evidence } = renderChartWithEvidence("BarChart", {
      data: [
        { category: "A", value: 1, group: "one" },
        { category: "B", value: 2, group: "two" }
      ],
      categoryAccessor: "category",
      valueAccessor: "value",
      colorBy: "group",
      mode: "sparkline",
      showLegend: true,
      legendPosition: "bottom",
      width: 120,
      height: 24
    })

    expect(evidence.margin).toBeDefined()
    expect(evidence.plot?.height).toBeGreaterThanOrEqual(8)
  })
})
