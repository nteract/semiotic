import { scaleLinear, scaleBand } from "d3-scale"
import { buildBarScene, buildClusterBarScene } from "./barScene"
import { buildPieScene } from "./pieScene"
import { buildPointScene, buildSwarmScene } from "./pointScene"
import { buildBoxplotScene, buildViolinScene, buildHistogramScene, buildRidgelineScene } from "./statisticalScene"
import { buildTimelineScene } from "./timelineScene"
import { buildConnectors } from "./connectorScene"
import { buildFunnelScene } from "./funnelScene"
import { buildBarFunnelScene } from "./barFunnelScene"
import { buildSwimlaneScene } from "./swimlaneScene"
import type { OrdinalSceneContext } from "./types"
import type { OrdinalScales, OrdinalColumn, OrdinalLayout, OrdinalPipelineConfig } from "../ordinalTypes"
import type { Style } from "../types"

// ── Helpers ─────────────────────────────────────────────────────────────

const defaultStyle: Style = { fill: "#4682b4", opacity: 1 }

function makeScales(opts: {
  projection?: "vertical" | "horizontal" | "radial"
  rDomain?: [number, number]
  rRange?: [number, number]
  oDomain?: string[]
} = {}): OrdinalScales {
  const { projection = "vertical", rDomain = [0, 100], rRange = [300, 0], oDomain = ["A", "B"] } = opts
  return {
    o: scaleBand<string>().domain(oDomain).range([0, 400]).padding(0.1),
    r: scaleLinear().domain(rDomain).range(rRange),
    projection
  }
}

function makeColumn(name: string, pieceData: Record<string, any>[], overrides: Partial<OrdinalColumn> = {}): OrdinalColumn {
  return {
    name,
    x: 10,
    y: 0,
    width: 80,
    middle: 50,
    padding: 5,
    pieceData,
    pct: 0.5,
    pctStart: 0,
    ...overrides
  }
}

function makeConfig(overrides: Partial<OrdinalPipelineConfig> = {}): OrdinalPipelineConfig {
  return {
    chartType: "bar",
    windowSize: 200,
    windowMode: "sliding",
    extentPadding: 0,
    projection: "vertical",
    ...overrides
  }
}

function makeCtx(overrides: Partial<OrdinalSceneContext> = {}): OrdinalSceneContext {
  const scales = overrides.scales || makeScales()
  return {
    scales,
    columns: overrides.columns || {},
    config: overrides.config || makeConfig(),
    getR: overrides.getR || ((d: any) => d.value),
    getO: overrides.getO || ((d: any) => d.category),
    multiScales: overrides.multiScales || [],
    rAccessors: overrides.rAccessors || [(d: any) => d.value],
    resolvePieceStyle: overrides.resolvePieceStyle || (() => ({ ...defaultStyle })),
    resolveSummaryStyle: overrides.resolveSummaryStyle || (() => ({ ...defaultStyle })),
    getRawRange: overrides.getRawRange || (() => null),
    ...overrides
  }
}

const layout: OrdinalLayout = { width: 400, height: 300 }

// ── barScene ────────────────────────────────────────────────────────────

describe("buildBarScene", () => {
  it("returns rect nodes for each column", () => {
    const ctx = makeCtx({
      columns: {
        A: makeColumn("A", [{ category: "A", value: 50 }]),
        B: makeColumn("B", [{ category: "B", value: 30 }])
      }
    })
    const nodes = buildBarScene(ctx, layout)
    expect(nodes).toHaveLength(2)
    expect(nodes.every(n => n.type === "rect")).toBe(true)
  })

  it("returns empty array for empty columns", () => {
    const ctx = makeCtx({ columns: {} })
    const nodes = buildBarScene(ctx, layout)
    expect(nodes).toHaveLength(0)
  })

  it("produces correct vertical bar positioning", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      columns: {
        A: makeColumn("A", [{ category: "A", value: 50 }])
      }
    })
    const nodes = buildBarScene(ctx, layout)
    expect(nodes).toHaveLength(1)
    const bar = nodes[0]
    expect(bar.type).toBe("rect")
    if (bar.type === "rect") {
      // Bar should have positive dimensions and be within the layout area
      expect(bar.h).toBeGreaterThan(0)
      expect(bar.w).toBeGreaterThan(0)
      expect(bar.y).toBeGreaterThanOrEqual(0)
      expect(bar.y + bar.h).toBeLessThanOrEqual(layout.height)
      // A value of 50 on [0,100] should produce a bar roughly half the chart height
      expect(bar.h / layout.height).toBeCloseTo(0.5, 1)
    }
  })

  it("handles horizontal projection", () => {
    const scales = makeScales({ projection: "horizontal", rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ projection: "horizontal" }),
      columns: {
        A: makeColumn("A", [{ category: "A", value: 40 }])
      }
    })
    const nodes = buildBarScene(ctx, layout)
    expect(nodes).toHaveLength(1)
    const bar = nodes[0]
    if (bar.type === "rect") {
      // Horizontal bar: x starts at baseline, width proportional to value
      expect(bar.x).toBeGreaterThanOrEqual(0)
      expect(bar.w).toBeGreaterThan(0)
      // value=40 on [0,100] should produce a bar roughly 40% of layout width
      expect(bar.w / layout.width).toBeCloseTo(0.4, 1)
    }
  })

  it("stacks multiple pieces in the same column", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      getStack: (d: any) => d.stack,
      columns: {
        A: makeColumn("A", [
          { category: "A", value: 30, stack: "x" },
          { category: "A", value: 20, stack: "y" }
        ])
      }
    })
    const nodes = buildBarScene(ctx, layout)
    expect(nodes).toHaveLength(2)
    // Both should be rects stacked vertically
    expect(nodes[0].type).toBe("rect")
    expect(nodes[1].type).toBe("rect")
    if (nodes[0].type === "rect" && nodes[1].type === "rect") {
      // First stack: value=30, starts at offset 0
      // Second stack: value=20, starts at offset 30
      // They should not overlap vertically
      const bottom0 = nodes[0].y + nodes[0].h
      const bottom1 = nodes[1].y + nodes[1].h
      expect(bottom0).not.toBeCloseTo(bottom1)
    }
  })

  it("handles negative values", () => {
    const scales = makeScales({ rDomain: [-50, 50], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      columns: {
        A: makeColumn("A", [
          { category: "A", value: 30, stack: "pos" },
          { category: "A", value: -20, stack: "neg" }
        ]),
      },
      getStack: (d: any) => d.stack
    })
    const nodes = buildBarScene(ctx, layout)
    expect(nodes).toHaveLength(2)
    // All rects should have non-negative height
    for (const n of nodes) {
      if (n.type === "rect") {
        expect(n.h).toBeGreaterThanOrEqual(0)
        expect(n.w).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it("normalizes when config.normalize is true", () => {
    const scales = makeScales({ rDomain: [0, 1], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ normalize: true }),
      getStack: (d: any) => d.stack,
      columns: {
        A: makeColumn("A", [
          { category: "A", value: 60, stack: "x" },
          { category: "A", value: 40, stack: "y" }
        ])
      }
    })
    const nodes = buildBarScene(ctx, layout)
    expect(nodes).toHaveLength(2)
    // With normalization, 60/(60+40)=0.6 and 40/(60+40)=0.4
    // The datum should have __aggregateValue showing original value
    if (nodes[0].type === "rect") {
      expect(nodes[0].datum.__aggregateValue).toBe(60)
    }
  })

  it("propagates style from resolvePieceStyle", () => {
    const customStyle: Style = { fill: "#ff0000", opacity: 0.7, stroke: "#000" }
    const ctx = makeCtx({
      resolvePieceStyle: () => customStyle,
      columns: {
        A: makeColumn("A", [{ category: "A", value: 50 }])
      }
    })
    const nodes = buildBarScene(ctx, layout)
    expect(nodes).toHaveLength(1)
    if (nodes[0].type === "rect") {
      expect(nodes[0].style.fill).toBe("#ff0000")
      expect(nodes[0].style.opacity).toBe(0.7)
    }
  })

  it("sets __aggregateValue and category on datum", () => {
    const ctx = makeCtx({
      columns: {
        A: makeColumn("A", [{ category: "A", value: 42 }])
      }
    })
    const nodes = buildBarScene(ctx, layout)
    if (nodes[0].type === "rect") {
      expect(nodes[0].datum.__aggregateValue).toBe(42)
      expect(nodes[0].datum.category).toBe("A")
    }
  })
})

describe("buildClusterBarScene", () => {
  it("produces sub-bars for each group within a column", () => {
    const scales = makeScales()
    const ctx = makeCtx({
      scales,
      getGroup: (d: any) => d.group,
      columns: {
        A: makeColumn("A", [
          { category: "A", value: 30, group: "g1" },
          { category: "A", value: 50, group: "g2" }
        ])
      }
    })
    const nodes = buildClusterBarScene(ctx, layout)
    expect(nodes).toHaveLength(2)
    expect(nodes.every(n => n.type === "rect")).toBe(true)
    // The two bars should have different x positions (side by side)
    if (nodes[0].type === "rect" && nodes[1].type === "rect") {
      expect(nodes[0].x).not.toBe(nodes[1].x)
    }
  })

  it("returns empty array when no columns", () => {
    const ctx = makeCtx({ columns: {} })
    const nodes = buildClusterBarScene(ctx, layout)
    expect(nodes).toHaveLength(0)
  })

  it("handles horizontal projection", () => {
    const scales = makeScales({ projection: "horizontal", rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      getGroup: (d: any) => d.group,
      columns: {
        A: makeColumn("A", [
          { category: "A", value: 30, group: "g1" }
        ])
      }
    })
    const nodes = buildClusterBarScene(ctx, layout)
    expect(nodes).toHaveLength(1)
    if (nodes[0].type === "rect") {
      expect(nodes[0].w).toBeGreaterThan(0)
      expect(nodes[0].h).toBeGreaterThan(0)
    }
  })
})

// ── pieScene ────────────────────────────────────────────────────────────

describe("buildPieScene", () => {
  it("returns wedge nodes for each column", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "pie" }),
      columns: {
        A: makeColumn("A", [{ category: "A", value: 60 }], { pct: 0.6, pctStart: 0 }),
        B: makeColumn("B", [{ category: "B", value: 40 }], { pct: 0.4, pctStart: 0.6 })
      }
    })
    const nodes = buildPieScene(ctx, layout)
    expect(nodes).toHaveLength(2)
    expect(nodes.every(n => n.type === "wedge")).toBe(true)
  })

  it("sets cx and cy to 0 (frame handles translation)", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "pie" }),
      columns: {
        A: makeColumn("A", [{ value: 100 }], { pct: 1, pctStart: 0 })
      }
    })
    const nodes = buildPieScene(ctx, layout)
    expect(nodes[0].cx).toBe(0)
    expect(nodes[0].cy).toBe(0)
  })

  it("computes outerRadius from layout dimensions", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "pie" }),
      columns: {
        A: makeColumn("A", [{ value: 100 }], { pct: 1, pctStart: 0 })
      }
    })
    const smallLayout = { width: 200, height: 100 }
    const nodes = buildPieScene(ctx, smallLayout)
    // outerRadius = min(200, 100)/2 - 4 = 46
    expect(nodes[0].outerRadius).toBe(46)
  })

  it("sets innerRadius to 0 for pie charts", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "pie" }),
      columns: {
        A: makeColumn("A", [{ value: 100 }], { pct: 1, pctStart: 0 })
      }
    })
    const nodes = buildPieScene(ctx, layout)
    expect(nodes[0].innerRadius).toBe(0)
  })

  it("sets innerRadius for donut charts", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "donut", innerRadius: 40 }),
      columns: {
        A: makeColumn("A", [{ value: 100 }], { pct: 1, pctStart: 0 })
      }
    })
    const nodes = buildPieScene(ctx, layout)
    expect(nodes[0].innerRadius).toBe(40)
  })

  it("uses default innerRadius of 60 for donut without explicit value", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "donut" }),
      columns: {
        A: makeColumn("A", [{ value: 100 }], { pct: 1, pctStart: 0 })
      }
    })
    const nodes = buildPieScene(ctx, layout)
    expect(nodes[0].innerRadius).toBe(60)
  })

  it("wedge angles span from pctStart to pctStart+pct", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "pie" }),
      columns: {
        A: makeColumn("A", [{ value: 50 }], { pct: 0.5, pctStart: 0 }),
        B: makeColumn("B", [{ value: 50 }], { pct: 0.5, pctStart: 0.5 })
      }
    })
    const nodes = buildPieScene(ctx, layout)
    // First wedge: 0 to 50% of 2pi
    // Second wedge: 50% to 100% of 2pi
    const angularSpan0 = nodes[0].endAngle - nodes[0].startAngle
    const angularSpan1 = nodes[1].endAngle - nodes[1].startAngle
    expect(angularSpan0).toBeCloseTo(Math.PI) // half circle
    expect(angularSpan1).toBeCloseTo(Math.PI)
    // End of first should equal start of second
    expect(nodes[0].endAngle).toBeCloseTo(nodes[1].startAngle)
  })

  it("applies startAngle offset from config", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "pie", startAngle: 90 }),
      columns: {
        A: makeColumn("A", [{ value: 100 }], { pct: 1, pctStart: 0 })
      }
    })
    const nodes = buildPieScene(ctx, layout)
    // Default start: -PI/2, plus 90 degrees = -PI/2 + PI/2 = 0
    expect(nodes[0].startAngle).toBeCloseTo(0)
  })

  it("propagates style and sets category", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "pie" }),
      resolvePieceStyle: () => ({ fill: "#e74c3c", opacity: 0.9 }),
      columns: {
        X: makeColumn("X", [{ value: 100 }], { pct: 1, pctStart: 0 })
      }
    })
    const nodes = buildPieScene(ctx, layout)
    expect(nodes[0].style.fill).toBe("#e74c3c")
    expect(nodes[0].category).toBe("X")
  })

  it("returns empty array for empty columns", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "pie" }),
      columns: {}
    })
    const nodes = buildPieScene(ctx, layout)
    expect(nodes).toHaveLength(0)
  })
})

// ── pointScene ──────────────────────────────────────────────────────────

describe("buildPointScene", () => {
  it("returns point nodes for each piece in each column", () => {
    const ctx = makeCtx({
      columns: {
        A: makeColumn("A", [
          { category: "A", value: 20 },
          { category: "A", value: 40 }
        ]),
        B: makeColumn("B", [{ category: "B", value: 60 }])
      }
    })
    const nodes = buildPointScene(ctx, layout)
    expect(nodes).toHaveLength(3)
    expect(nodes.every(n => n.type === "point")).toBe(true)
  })

  it("positions points vertically: x=col.middle, y=rScale(value)", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      columns: {
        A: makeColumn("A", [{ category: "A", value: 50 }], { middle: 100 })
      }
    })
    const nodes = buildPointScene(ctx, layout)
    expect(nodes).toHaveLength(1)
    if (nodes[0].type === "point") {
      expect(nodes[0].x).toBe(100) // col.middle
      // value=50 on [0,100] should place point roughly in the middle of the value range
      expect(nodes[0].y).toBeGreaterThan(0)
      expect(nodes[0].y).toBeLessThan(layout.height)
    }
  })

  it("positions points horizontally: x=rScale(value), y=col.middle", () => {
    const scales = makeScales({ projection: "horizontal", rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      columns: {
        A: makeColumn("A", [{ category: "A", value: 25 }], { middle: 75 })
      }
    })
    const nodes = buildPointScene(ctx, layout)
    if (nodes[0].type === "point") {
      // Horizontal: x mapped by value scale, y at column middle
      expect(nodes[0].x).toBeGreaterThan(0)
      expect(nodes[0].x).toBeLessThan(layout.width)
      expect(nodes[0].y).toBe(75) // col.middle (category axis — stable)
    }
  })

  it("uses default radius of 5 when style has no r", () => {
    const ctx = makeCtx({
      resolvePieceStyle: () => ({ fill: "#000" }),
      columns: {
        A: makeColumn("A", [{ value: 50 }])
      }
    })
    const nodes = buildPointScene(ctx, layout)
    if (nodes[0].type === "point") {
      expect(nodes[0].r).toBe(5)
    }
  })

  it("uses r from style when provided", () => {
    const ctx = makeCtx({
      resolvePieceStyle: () => ({ fill: "#000", r: 12 } as any),
      columns: {
        A: makeColumn("A", [{ value: 50 }])
      }
    })
    const nodes = buildPointScene(ctx, layout)
    if (nodes[0].type === "point") {
      expect(nodes[0].r).toBe(12)
    }
  })

  it("returns empty array for empty columns", () => {
    const ctx = makeCtx({ columns: {} })
    const nodes = buildPointScene(ctx, layout)
    expect(nodes).toHaveLength(0)
  })

  it("attaches datum to each node", () => {
    const datum = { category: "A", value: 77 }
    const ctx = makeCtx({
      columns: { A: makeColumn("A", [datum]) }
    })
    const nodes = buildPointScene(ctx, layout)
    expect(nodes[0].datum).toBe(datum)
  })
})

describe("buildSwarmScene", () => {
  it("returns point nodes with jittered positions", () => {
    const ctx = makeCtx({
      columns: {
        A: makeColumn("A", [
          { category: "A", value: 30 },
          { category: "A", value: 30 },
          { category: "A", value: 30 }
        ])
      }
    })
    const nodes = buildSwarmScene(ctx, layout)
    expect(nodes).toHaveLength(3)
    expect(nodes.every(n => n.type === "point")).toBe(true)
    // Points with same value should have different x due to jitter (vertical projection)
    if (nodes[0].type === "point" && nodes[1].type === "point" && nodes[2].type === "point") {
      const xs = [nodes[0].x, nodes[1].x, nodes[2].x]
      // At least two should differ (deterministic jitter)
      expect(new Set(xs).size).toBeGreaterThan(1)
    }
  })

  it("uses default radius of 4", () => {
    const ctx = makeCtx({
      resolvePieceStyle: () => ({ fill: "#000" }),
      columns: {
        A: makeColumn("A", [{ value: 50 }])
      }
    })
    const nodes = buildSwarmScene(ctx, layout)
    if (nodes[0].type === "point") {
      expect(nodes[0].r).toBe(4)
    }
  })

  it("returns empty array for empty columns", () => {
    const ctx = makeCtx({ columns: {} })
    const nodes = buildSwarmScene(ctx, layout)
    expect(nodes).toHaveLength(0)
  })
})

// ── statisticalScene ────────────────────────────────────────────────────

describe("buildBoxplotScene", () => {
  const sampleData = [
    { category: "A", value: 10 },
    { category: "A", value: 20 },
    { category: "A", value: 30 },
    { category: "A", value: 40 },
    { category: "A", value: 50 },
    { category: "A", value: 60 },
    { category: "A", value: 70 },
    { category: "A", value: 80 },
    { category: "A", value: 90 },
    { category: "A", value: 100 }
  ]

  it("returns boxplot nodes with correct stats", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "boxplot" }),
      columns: { A: makeColumn("A", sampleData) }
    })
    const nodes = buildBoxplotScene(ctx, layout)
    const boxNode = nodes.find(n => n.type === "boxplot")
    expect(boxNode).toBeDefined()
    if (boxNode && boxNode.type === "boxplot") {
      expect(boxNode.stats.n).toBe(10)
      expect(boxNode.stats.min).toBe(10) // whiskerMin
      expect(boxNode.stats.max).toBe(100) // whiskerMax
      expect(boxNode.stats.median).toBeCloseTo(55)
      expect(boxNode.stats.q1).toBeCloseTo(32.5)
      expect(boxNode.stats.q3).toBeCloseTo(77.5)
    }
  })

  it("sets vertical projection properties", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "boxplot" }),
      columns: { A: makeColumn("A", sampleData, { middle: 50 }) }
    })
    const nodes = buildBoxplotScene(ctx, layout)
    const boxNode = nodes.find(n => n.type === "boxplot")
    if (boxNode && boxNode.type === "boxplot") {
      expect(boxNode.projection).toBe("vertical")
      expect(boxNode.x).toBe(50) // col.middle
      expect(boxNode.columnWidth).toBeCloseTo(80 * 0.6) // col.width * 0.6
    }
  })

  it("skips columns with no valid numeric data", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "boxplot" }),
      getR: () => NaN,
      columns: { A: makeColumn("A", [{ category: "A", value: NaN }]) }
    })
    const nodes = buildBoxplotScene(ctx, layout)
    expect(nodes).toHaveLength(0)
  })

  it("produces outlier points when showOutliers is true", () => {
    // Add extreme outlier
    const dataWithOutlier = [
      ...sampleData,
      { category: "A", value: 500 }
    ]
    const scales = makeScales({ rDomain: [0, 500], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "boxplot", showOutliers: true }),
      columns: { A: makeColumn("A", dataWithOutlier) }
    })
    const nodes = buildBoxplotScene(ctx, layout)
    const outlierPoints = nodes.filter(n => n.type === "point")
    expect(outlierPoints.length).toBeGreaterThanOrEqual(1)
  })

  it("does not produce outlier points when showOutliers is false", () => {
    const dataWithOutlier = [
      ...sampleData,
      { category: "A", value: 500 }
    ]
    const scales = makeScales({ rDomain: [0, 500], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "boxplot", showOutliers: false }),
      columns: { A: makeColumn("A", dataWithOutlier) }
    })
    const nodes = buildBoxplotScene(ctx, layout)
    const outlierPoints = nodes.filter(n => n.type === "point")
    expect(outlierPoints).toHaveLength(0)
  })

  it("returns empty for empty columns", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "boxplot" }),
      columns: {}
    })
    expect(buildBoxplotScene(ctx, layout)).toHaveLength(0)
  })
})

describe("buildViolinScene", () => {
  const sampleData = Array.from({ length: 50 }, (_, i) => ({
    category: "A",
    value: 10 + (i * 80) / 49 // spread from 10 to 90
  }))

  it("returns violin nodes with path strings", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "violin", bins: 10 }),
      columns: { A: makeColumn("A", sampleData) }
    })
    const nodes = buildViolinScene(ctx, layout)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe("violin")
    if (nodes[0].type === "violin") {
      expect(nodes[0].pathString).toContain("M")
      expect(nodes[0].pathString).toContain("Z")
    }
  })

  it("includes IQR line by default", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "violin", bins: 10 }),
      columns: { A: makeColumn("A", sampleData) }
    })
    const nodes = buildViolinScene(ctx, layout)
    if (nodes[0].type === "violin") {
      expect(nodes[0].iqrLine).toBeDefined()
      expect(nodes[0].iqrLine!.isVertical).toBe(true)
    }
  })

  it("omits IQR line when showIQR is false", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "violin", bins: 10, showIQR: false }),
      columns: { A: makeColumn("A", sampleData) }
    })
    const nodes = buildViolinScene(ctx, layout)
    if (nodes[0].type === "violin") {
      expect(nodes[0].iqrLine).toBeUndefined()
    }
  })

  it("includes distribution stats", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "violin", bins: 10 }),
      columns: { A: makeColumn("A", sampleData) }
    })
    const nodes = buildViolinScene(ctx, layout)
    if (nodes[0].type === "violin") {
      expect(nodes[0].stats).toBeDefined()
      expect(nodes[0].stats!.n).toBe(50)
      expect(nodes[0].stats!.min).toBeLessThan(nodes[0].stats!.max)
    }
  })

  it("skips columns with fewer than 2 data points", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "violin" }),
      columns: { A: makeColumn("A", [{ category: "A", value: 50 }]) }
    })
    const nodes = buildViolinScene(ctx, layout)
    expect(nodes).toHaveLength(0)
  })

  it("returns empty for empty columns", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "violin" }),
      columns: {}
    })
    expect(buildViolinScene(ctx, layout)).toHaveLength(0)
  })

  it("violin path extends to vMin and vMax (no bin-center inset)", () => {
    // Horizontal projection: values on x-axis
    // sampleData ranges from value=10 to value=90
    const scales = makeScales({ rDomain: [0, 100], rRange: [0, 400], projection: "horizontal" })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "violin", bins: 10, projection: "horizontal" }),
      columns: { A: makeColumn("A", sampleData) }
    })
    const nodes = buildViolinScene(ctx, layout)
    expect(nodes).toHaveLength(1)
    if (nodes[0].type === "violin") {
      const path = nodes[0].pathString
      // sampleData: value = 10 + (i * 80) / 49, so vMin ≈ 10, vMax ≈ 90
      // rScale(10) = 40, rScale(90) = 360
      const xAtVMin = scales.r(10)  // 40
      const xAtVMax = scales.r(90)  // 360

      // Extract all x-coordinates from the path
      const coords = path.match(/[ML]\s+([\d.e+-]+)\s+([\d.e+-]+)/g)!
      const xValues = coords.map(c => parseFloat(c.replace(/^[ML]\s+/, '').split(/\s+/)[0]))

      // Path should start and end at the data extremes, not half a bin inset
      expect(Math.min(...xValues)).toBeCloseTo(xAtVMin, 0)
      expect(Math.max(...xValues)).toBeCloseTo(xAtVMax, 0)
    }
  })
})

describe("buildHistogramScene", () => {
  const sampleData = Array.from({ length: 100 }, (_, i) => ({
    category: "A",
    value: i
  }))

  it("returns rect nodes for histogram bins", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "histogram", bins: 10 }),
      columns: { A: makeColumn("A", sampleData) }
    })
    const nodes = buildHistogramScene(ctx, layout)
    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes.every(n => n.type === "rect")).toBe(true)
  })

  it("skips empty bins", () => {
    // Data concentrated in a narrow range; many bins will be empty
    const narrowData = [
      { category: "A", value: 10 },
      { category: "A", value: 10 },
      { category: "A", value: 11 }
    ]
    const scales = makeScales({ rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "histogram", bins: 25 }),
      columns: { A: makeColumn("A", narrowData) }
    })
    const nodes = buildHistogramScene(ctx, layout)
    // Should have far fewer nodes than bins
    expect(nodes.length).toBeLessThan(25)
  })

  it("skips columns with no valid data", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "histogram", bins: 10 }),
      getR: () => NaN,
      columns: { A: makeColumn("A", [{ category: "A", value: NaN }]) }
    })
    const nodes = buildHistogramScene(ctx, layout)
    expect(nodes).toHaveLength(0)
  })

  it("returns empty for empty columns", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "histogram" }),
      columns: {}
    })
    expect(buildHistogramScene(ctx, layout)).toHaveLength(0)
  })

  it("all rect nodes have positive dimensions", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "histogram", bins: 10 }),
      columns: { A: makeColumn("A", sampleData) }
    })
    const nodes = buildHistogramScene(ctx, layout)
    for (const n of nodes) {
      if (n.type === "rect") {
        expect(n.w).toBeGreaterThan(0)
        expect(n.h).toBeGreaterThan(0)
      }
    }
  })
  it("two categories with disjoint ranges share the same bin boundaries when rScale domain covers both", () => {
    // Category A: values in [0, 50], Category B: values in [60, 100]
    // With a shared rScale domain of [0, 100], both should use the same bin edges
    const catA = Array.from({ length: 10 }, (_, i) => ({ category: "A", value: i * 5 }))
    const catB = Array.from({ length: 10 }, (_, i) => ({ category: "B", value: 60 + i * 4 }))

    // Global domain covers the full range
    const scales = makeScales({ rDomain: [0, 100], rRange: [0, 400], projection: "horizontal" })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "histogram", bins: 10, projection: "horizontal" }),
      columns: {
        A: makeColumn("A", catA, { x: 0, width: 80, middle: 40 }),
        B: makeColumn("B", catB, { x: 100, width: 80, middle: 140 })
      }
    })

    const nodes = buildHistogramScene(ctx, layout)
    const rectsA = nodes.filter(n => n.type === "rect" && (n as any).group === "A")
    const rectsB = nodes.filter(n => n.type === "rect" && (n as any).group === "B")

    expect(rectsA.length).toBeGreaterThan(0)
    expect(rectsB.length).toBeGreaterThan(0)

    // All rects should have x positions that align to the same bin grid
    // Bin width = (100 - 0) / 10 = 10 data units → each bin spans the same x-pixel width
    const allRects = nodes.filter(n => n.type === "rect") as Array<{ x: number; w: number }>
    const binWidths = new Set(allRects.map(r => Math.round(r.w * 100) / 100))
    // All bins should have the same width (within floating-point tolerance)
    expect(binWidths.size).toBe(1)
  })
})

describe("buildRidgelineScene", () => {
  const sampleData = Array.from({ length: 30 }, (_, i) => ({
    category: "A",
    value: 10 + i * 2
  }))

  it("returns violin-typed nodes with path strings", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "ridgeline", bins: 10 }),
      columns: { A: makeColumn("A", sampleData) }
    })
    const nodes = buildRidgelineScene(ctx, layout)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe("violin")
    if (nodes[0].type === "violin") {
      expect(nodes[0].pathString).toContain("M")
      expect(nodes[0].pathString).toContain("Z")
    }
  })

  it("skips columns with fewer than 2 data points", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "ridgeline" }),
      columns: { A: makeColumn("A", [{ category: "A", value: 50 }]) }
    })
    expect(buildRidgelineScene(ctx, layout)).toHaveLength(0)
  })

  it("includes stats on the node", () => {
    const scales = makeScales({ rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "ridgeline", bins: 10 }),
      columns: { A: makeColumn("A", sampleData) }
    })
    const nodes = buildRidgelineScene(ctx, layout)
    if (nodes[0].type === "violin") {
      expect(nodes[0].stats).toBeDefined()
      expect(nodes[0].stats!.n).toBe(30)
    }
  })
})

// ── timelineScene ───────────────────────────────────────────────────────

describe("buildTimelineScene", () => {
  it("returns rect nodes for timeline ranges", () => {
    const scales = makeScales({ projection: "horizontal", rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "timeline", projection: "horizontal" }),
      getRawRange: (d: any) => [d.start, d.end],
      columns: {
        A: makeColumn("A", [{ category: "A", start: 10, end: 50 }])
      }
    })
    const nodes = buildTimelineScene(ctx, layout)
    expect(nodes).toHaveLength(1)
    expect(nodes[0].type).toBe("rect")
  })

  it("computes horizontal bar from start to end", () => {
    const scales = makeScales({ projection: "horizontal", rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "timeline", projection: "horizontal" }),
      getRawRange: (d: any) => [d.start, d.end],
      columns: {
        A: makeColumn("A", [{ category: "A", start: 0, end: 50 }])
      }
    })
    const nodes = buildTimelineScene(ctx, layout)
    if (nodes[0].type === "rect") {
      // Range [0, 50] on [0, 100] → bar should span ~50% of layout width
      expect(nodes[0].x).toBeGreaterThanOrEqual(0)
      expect(nodes[0].w).toBeGreaterThan(0)
      expect(nodes[0].w / layout.width).toBeCloseTo(0.5, 1)
    }
  })

  it("handles vertical timeline", () => {
    const scales = makeScales({ projection: "vertical", rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "timeline", projection: "vertical" }),
      getRawRange: (d: any) => [d.start, d.end],
      columns: {
        A: makeColumn("A", [{ category: "A", start: 20, end: 80 }])
      }
    })
    const nodes = buildTimelineScene(ctx, layout)
    expect(nodes).toHaveLength(1)
    if (nodes[0].type === "rect") {
      expect(nodes[0].w).toBe(80) // col.width
      expect(nodes[0].h).toBeGreaterThan(0)
    }
  })

  it("skips pieces with null range", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "timeline", projection: "horizontal" }),
      getRawRange: () => null,
      columns: {
        A: makeColumn("A", [{ category: "A", start: 10, end: 50 }])
      }
    })
    const nodes = buildTimelineScene(ctx, layout)
    expect(nodes).toHaveLength(0)
  })

  it("handles inverted start/end (end < start)", () => {
    const scales = makeScales({ projection: "horizontal", rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "timeline", projection: "horizontal" }),
      getRawRange: (d: any) => [d.start, d.end],
      columns: {
        A: makeColumn("A", [{ category: "A", start: 80, end: 20 }])
      }
    })
    const nodes = buildTimelineScene(ctx, layout)
    if (nodes[0].type === "rect") {
      expect(nodes[0].w).toBeGreaterThan(0) // uses Math.min/max
    }
  })

  it("returns empty for empty columns", () => {
    const ctx = makeCtx({
      config: makeConfig({ chartType: "timeline" }),
      columns: {}
    })
    expect(buildTimelineScene(ctx, layout)).toHaveLength(0)
  })
})

// ── connectorScene ──────────────────────────────────────────────────────

describe("buildConnectors", () => {
  it("returns connector nodes linking pieces with same connector key", () => {
    const scales = makeScales()
    const pieceNodes = [
      { type: "point" as const, x: 10, y: 20, r: 5, style: defaultStyle, datum: { id: 1, category: "A", group: "g1" } },
      { type: "point" as const, x: 100, y: 80, r: 5, style: defaultStyle, datum: { id: 2, category: "B", group: "g1" } }
    ]
    const ctx = makeCtx({
      scales,
      getConnector: (d: any) => d.group,
      getO: (d: any) => d.category,
      config: makeConfig({ connectorStyle: { stroke: "#333", strokeWidth: 2 } })
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors).toHaveLength(1)
    expect(connectors[0].type).toBe("connector")
    expect(connectors[0].x1).toBe(10)
    expect(connectors[0].y1).toBe(20)
    expect(connectors[0].x2).toBe(100)
    expect(connectors[0].y2).toBe(80)
  })

  it("returns empty when no getConnector", () => {
    const ctx = makeCtx({ getConnector: undefined })
    const connectors = buildConnectors(ctx, [], layout)
    expect(connectors).toHaveLength(0)
  })

  it("returns empty when connector key is falsy", () => {
    const scales = makeScales()
    const pieceNodes = [
      { type: "point" as const, x: 10, y: 20, r: 5, style: defaultStyle, datum: { id: 1, category: "A" } }
    ]
    const ctx = makeCtx({
      scales,
      getConnector: () => "",
      getO: (d: any) => d.category
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors).toHaveLength(0)
  })

  it("does not connect groups with only one point", () => {
    const scales = makeScales()
    const pieceNodes = [
      { type: "point" as const, x: 10, y: 20, r: 5, style: defaultStyle, datum: { category: "A", group: "solo" } }
    ]
    const ctx = makeCtx({
      scales,
      getConnector: (d: any) => d.group,
      getO: (d: any) => d.category
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors).toHaveLength(0)
  })

  it("connects rect nodes using their center", () => {
    const scales = makeScales()
    const pieceNodes = [
      { type: "rect" as const, x: 0, y: 0, w: 20, h: 40, style: defaultStyle, datum: { category: "A", group: "g1" } },
      { type: "rect" as const, x: 100, y: 50, w: 20, h: 40, style: defaultStyle, datum: { category: "B", group: "g1" } }
    ]
    const ctx = makeCtx({
      scales,
      getConnector: (d: any) => d.group,
      getO: (d: any) => d.category
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors).toHaveLength(1)
    // rect center: x + w/2 for x, y + 0 for vertical projection (cy = node.y)
    expect(connectors[0].x1).toBe(10) // 0 + 20/2
  })

  it("uses connectorStyle function when provided", () => {
    const scales = makeScales()
    const pieceNodes = [
      { type: "point" as const, x: 10, y: 20, r: 5, style: defaultStyle, datum: { category: "A", group: "g1", color: "red" } },
      { type: "point" as const, x: 100, y: 80, r: 5, style: defaultStyle, datum: { category: "B", group: "g1", color: "blue" } }
    ]
    const ctx = makeCtx({
      scales,
      getConnector: (d: any) => d.group,
      getO: (d: any) => d.category,
      config: makeConfig({
        connectorStyle: (d: any) => ({ stroke: d.color, strokeWidth: 3 })
      })
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors[0].style.stroke).toBe("red")
    expect(connectors[0].style.strokeWidth).toBe(3)
  })

  it("uses default style when no connectorStyle is set", () => {
    const scales = makeScales()
    const pieceNodes = [
      { type: "point" as const, x: 10, y: 20, r: 5, style: defaultStyle, datum: { category: "A", group: "g1" } },
      { type: "point" as const, x: 100, y: 80, r: 5, style: defaultStyle, datum: { category: "B", group: "g1" } }
    ]
    const ctx = makeCtx({
      scales,
      getConnector: (d: any) => d.group,
      getO: (d: any) => d.category,
      config: makeConfig({})
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors[0].style.stroke).toBe("#999")
    expect(connectors[0].style.opacity).toBe(0.5)
  })

  it("creates multiple connectors for chains of 3+ points", () => {
    const scales = makeScales({ oDomain: ["A", "B", "C"] })
    const pieceNodes = [
      { type: "point" as const, x: 10, y: 20, r: 5, style: defaultStyle, datum: { category: "A", group: "chain" } },
      { type: "point" as const, x: 50, y: 50, r: 5, style: defaultStyle, datum: { category: "B", group: "chain" } },
      { type: "point" as const, x: 90, y: 80, r: 5, style: defaultStyle, datum: { category: "C", group: "chain" } }
    ]
    const ctx = makeCtx({
      scales,
      getConnector: (d: any) => d.group,
      getO: (d: any) => d.category
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors).toHaveLength(2) // A->B and B->C
    expect(connectors[0].group).toBe("chain")
    expect(connectors[1].group).toBe("chain")
  })

  it("ignores node types other than point and rect", () => {
    const scales = makeScales()
    const pieceNodes = [
      { type: "wedge" as const, cx: 0, cy: 0, innerRadius: 0, outerRadius: 50, startAngle: 0, endAngle: Math.PI, style: defaultStyle, datum: { category: "A", group: "g1" } },
    ] as any[]
    const ctx = makeCtx({
      scales,
      getConnector: (d: any) => d.group,
      getO: (d: any) => d.category
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors).toHaveLength(0)
  })
})

// ── funnelScene ────────────────────────────────────────────────────────

describe("buildFunnelScene", () => {
  // Funnel uses horizontal projection: ordinal band maps to y-axis (col.x = y, col.width = band height)
  // layout.width is the horizontal extent for bars

  function makeFunnelScales(steps: string[]): OrdinalScales {
    return {
      o: scaleBand<string>().domain(steps).range([0, 300]).padding(0.1),
      r: scaleLinear().domain([0, 100]).range([0, 400]),
      projection: "horizontal"
    }
  }

  it("single-category data: centered bars with width proportional to value", () => {
    const steps = ["Visitors", "Signups", "Paid"]
    const scales = makeFunnelScales(steps)
    const band = scales.o.bandwidth()

    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "funnel", projection: "horizontal" }),
      columns: {
        Visitors: makeColumn("Visitors", [{ step: "Visitors", value: 1000 }], { x: scales.o("Visitors")!, width: band, pieceData: [{ step: "Visitors", value: 1000 }] }),
        Signups: makeColumn("Signups", [{ step: "Signups", value: 600 }], { x: scales.o("Signups")!, width: band, pieceData: [{ step: "Signups", value: 600 }] }),
        Paid: makeColumn("Paid", [{ step: "Paid", value: 200 }], { x: scales.o("Paid")!, width: band, pieceData: [{ step: "Paid", value: 200 }] }),
      },
      getR: (d: any) => d.value,
    })
    const nodes = buildFunnelScene(ctx, layout)

    // 3 rect nodes + 2 trapezoid connectors = 5
    const rects = nodes.filter(n => n.type === "rect")
    expect(rects.length).toBe(3)

    // Bars should be centered around layout.width/2 = 200
    const centerX = layout.width / 2
    for (const r of rects) {
      if (r.type === "rect") {
        expect(r.x + r.w / 2).toBeCloseTo(centerX, 0)
      }
    }

    // First bar (1000) should be widest, last bar (200) narrowest
    if (rects[0].type === "rect" && rects[2].type === "rect") {
      expect(rects[0].w).toBeGreaterThan(rects[2].w)
    }

    // Width should be proportional: 1000:600:200 = 5:3:1
    if (rects[0].type === "rect" && rects[1].type === "rect" && rects[2].type === "rect") {
      const ratio01 = rects[0].w / rects[1].w
      expect(ratio01).toBeCloseTo(1000 / 600, 1)
      const ratio02 = rects[0].w / rects[2].w
      expect(ratio02).toBeCloseTo(1000 / 200, 1)
    }
  })

  it("multi-category data: mirrored layout (even categories right, odd left)", () => {
    const steps = ["Step1", "Step2"]
    const scales = makeFunnelScales(steps)
    const band = scales.o.bandwidth()

    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "funnel", projection: "horizontal" }),
      getStack: (d: any) => d.channel,
      columns: {
        Step1: makeColumn("Step1", [
          { step: "Step1", value: 100, channel: "Web" },
          { step: "Step1", value: 80, channel: "Mobile" },
        ], { x: scales.o("Step1")!, width: band }),
        Step2: makeColumn("Step2", [
          { step: "Step2", value: 60, channel: "Web" },
          { step: "Step2", value: 40, channel: "Mobile" },
        ], { x: scales.o("Step2")!, width: band }),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildFunnelScene(ctx, layout)
    const rects = nodes.filter(n => n.type === "rect")
    const centerX = layout.width / 2

    // 2 steps x 2 categories = 4 rects
    expect(rects.length).toBe(4)

    // Step1 rects: Web (even index=0) extends right from center, Mobile (odd index=1) extends left
    const step1Rects = rects.filter(n => n.type === "rect" && n.datum.__funnelStep === "Step1")
    expect(step1Rects.length).toBe(2)

    // Web (category index 0, even) should be to the right of center
    const webRect = step1Rects.find(n => n.datum.category === "Web")!
    if (webRect.type === "rect") {
      expect(webRect.x).toBeGreaterThanOrEqual(centerX - 1) // starts at or right of center
    }

    // Mobile (category index 1, odd) should be to the left of center
    const mobileRect = step1Rects.find(n => n.datum.category === "Mobile")!
    if (mobileRect.type === "rect") {
      expect(mobileRect.x + mobileRect.w).toBeLessThanOrEqual(centerX + 1) // ends at or left of center
    }
  })

  it("trapezoid connectors between adjacent steps", () => {
    const steps = ["A", "B", "C"]
    const scales = makeFunnelScales(steps)
    const band = scales.o.bandwidth()

    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "funnel", projection: "horizontal" }),
      columns: {
        A: makeColumn("A", [{ value: 100 }], { x: scales.o("A")!, width: band }),
        B: makeColumn("B", [{ value: 50 }], { x: scales.o("B")!, width: band }),
        C: makeColumn("C", [{ value: 25 }], { x: scales.o("C")!, width: band }),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildFunnelScene(ctx, layout)
    const trapezoids = nodes.filter(n => n.type === "trapezoid")

    // 3 steps = 2 connectors
    expect(trapezoids.length).toBe(2)

    // Each trapezoid should have 4 corner points
    for (const t of trapezoids) {
      if (t.type === "trapezoid") {
        expect(t.points.length).toBe(4)
        // Each point should be [x, y]
        for (const pt of t.points) {
          expect(pt.length).toBe(2)
          expect(typeof pt[0]).toBe("number")
          expect(typeof pt[1]).toBe("number")
        }
      }
    }

    // The first trapezoid connects step A (wider) to step B (narrower)
    // Top edge (prev bar bottom) should be wider than bottom edge (curr bar top)
    if (trapezoids[0].type === "trapezoid") {
      const pts = trapezoids[0].points
      const topWidth = Math.abs(pts[1][0] - pts[0][0])
      const bottomWidth = Math.abs(pts[2][0] - pts[3][0])
      expect(topWidth).toBeGreaterThan(bottomWidth)
    }
  })

  it("label metadata set on each rect datum", () => {
    const steps = ["Visit", "Signup"]
    const scales = makeFunnelScales(steps)
    const band = scales.o.bandwidth()

    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "funnel", projection: "horizontal" }),
      columns: {
        Visit: makeColumn("Visit", [{ value: 100 }], { x: scales.o("Visit")!, width: band }),
        Signup: makeColumn("Signup", [{ value: 40 }], { x: scales.o("Signup")!, width: band }),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildFunnelScene(ctx, layout)
    const rects = nodes.filter(n => n.type === "rect")

    for (const r of rects) {
      if (r.type === "rect") {
        expect(r.datum.__funnelStep).toBeDefined()
        expect(typeof r.datum.__funnelValue).toBe("number")
        expect(typeof r.datum.__funnelPercent).toBe("number")
      }
    }
  })

  it("first step is 100% baseline", () => {
    const steps = ["Top", "Mid", "Bot"]
    const scales = makeFunnelScales(steps)
    const band = scales.o.bandwidth()

    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "funnel", projection: "horizontal" }),
      columns: {
        Top: makeColumn("Top", [{ value: 200 }], { x: scales.o("Top")!, width: band }),
        Mid: makeColumn("Mid", [{ value: 100 }], { x: scales.o("Mid")!, width: band }),
        Bot: makeColumn("Bot", [{ value: 50 }], { x: scales.o("Bot")!, width: band }),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildFunnelScene(ctx, layout)
    const rects = nodes.filter(n => n.type === "rect")

    // First step
    const firstRect = rects.find(n => n.type === "rect" && n.datum.__funnelStep === "Top")!
    expect(firstRect.datum.__funnelPercent).toBeCloseTo(100)
    expect(firstRect.datum.__funnelIsFirstStep).toBe(true)

    // Second step should not be marked as first step
    const midRect = rects.find(n => n.type === "rect" && n.datum.__funnelStep === "Mid")!
    expect(midRect.datum.__funnelIsFirstStep).toBe(false)
  })

  it("empty columns returns empty result", () => {
    const scales = makeFunnelScales(["A"])
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "funnel", projection: "horizontal" }),
      columns: {},
    })
    const nodes = buildFunnelScene(ctx, layout)
    expect(nodes).toHaveLength(0)
  })

  it("percentage calculation relative to first step", () => {
    const steps = ["S1", "S2", "S3"]
    const scales = makeFunnelScales(steps)
    const band = scales.o.bandwidth()

    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "funnel", projection: "horizontal" }),
      columns: {
        S1: makeColumn("S1", [{ value: 400 }], { x: scales.o("S1")!, width: band }),
        S2: makeColumn("S2", [{ value: 200 }], { x: scales.o("S2")!, width: band }),
        S3: makeColumn("S3", [{ value: 100 }], { x: scales.o("S3")!, width: band }),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildFunnelScene(ctx, layout)
    const rects = nodes.filter(n => n.type === "rect")

    const s1 = rects.find(n => n.datum.__funnelStep === "S1")!
    const s2 = rects.find(n => n.datum.__funnelStep === "S2")!
    const s3 = rects.find(n => n.datum.__funnelStep === "S3")!

    expect(s1.datum.__funnelPercent).toBeCloseTo(100) // 400/400
    expect(s2.datum.__funnelPercent).toBeCloseTo(50)  // 200/400
    expect(s3.datum.__funnelPercent).toBeCloseTo(25)  // 100/400
  })
})

// ── barFunnelScene ─────────────────────────────────────────────────────

describe("buildBarFunnelScene", () => {
  // Bar funnel uses vertical projection: bars on x-axis, values on y-axis

  function makeBarFunnelScales(steps: string[], maxVal: number): OrdinalScales {
    return {
      o: scaleBand<string>().domain(steps).range([0, 400]).padding(0.1),
      r: scaleLinear().domain([0, maxVal]).range([300, 0]),
      projection: "vertical"
    }
  }

  it("produces solid bars for retained values", () => {
    const steps = ["Aware", "Interest", "Decision"]
    const scales = makeBarFunnelScales(steps, 100)
    const band = scales.o.bandwidth()

    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "bar-funnel", projection: "vertical" }),
      columns: {
        Aware: makeColumn("Aware", [{ value: 100 }], { x: scales.o("Aware")!, width: band }),
        Interest: makeColumn("Interest", [{ value: 60 }], { x: scales.o("Interest")!, width: band }),
        Decision: makeColumn("Decision", [{ value: 30 }], { x: scales.o("Decision")!, width: band }),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildBarFunnelScene(ctx, layout)
    const retainedBars = nodes.filter(n => n.type === "rect" && !n.datum.__barFunnelIsDropoff)

    // 3 steps = 3 retained bars
    expect(retainedBars.length).toBe(3)

    // All retained bars should be marked as not dropoff
    for (const bar of retainedBars) {
      expect(bar.datum.__barFunnelIsDropoff).toBe(false)
    }

    // Retained bar heights should be proportional to values (100:60)
    if (retainedBars[0].type === "rect" && retainedBars[1].type === "rect") {
      expect(retainedBars[0].h).toBeGreaterThan(retainedBars[1].h)
      expect(retainedBars[0].h / retainedBars[1].h).toBeCloseTo(100 / 60, 1)
    }
  })

  it("dropoff bars marked with __barFunnelIsDropoff flag", () => {
    const steps = ["Step1", "Step2"]
    const scales = makeBarFunnelScales(steps, 100)
    const band = scales.o.bandwidth()

    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "bar-funnel", projection: "vertical" }),
      columns: {
        Step1: makeColumn("Step1", [{ value: 100 }], { x: scales.o("Step1")!, width: band }),
        Step2: makeColumn("Step2", [{ value: 70 }], { x: scales.o("Step2")!, width: band }),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildBarFunnelScene(ctx, layout)
    const dropoffBars = nodes.filter(n => n.type === "rect" && n.datum.__barFunnelIsDropoff === true)

    // Step2 has dropoff of 100-70=30
    expect(dropoffBars.length).toBe(1)
    expect(dropoffBars[0].datum.__barFunnelValue).toBe(30)
    expect(dropoffBars[0].datum.__barFunnelIsDropoff).toBe(true)

    // Dropoff bar should sit on top of the retained bar for Step2
    const step2Retained = nodes.find(n => n.type === "rect" && n.datum.__barFunnelStep === "Step2" && !n.datum.__barFunnelIsDropoff)!
    if (dropoffBars[0].type === "rect" && step2Retained.type === "rect") {
      // Dropoff top (y) should be above retained top (y), i.e. smaller y value
      expect(dropoffBars[0].y).toBeLessThan(step2Retained.y)
      // Dropoff bottom should meet retained top
      expect(dropoffBars[0].y + dropoffBars[0].h).toBeCloseTo(step2Retained.y)
    }
  })

  it("first step has zero dropoff", () => {
    const steps = ["First", "Second"]
    const scales = makeBarFunnelScales(steps, 100)
    const band = scales.o.bandwidth()

    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "bar-funnel", projection: "vertical" }),
      columns: {
        First: makeColumn("First", [{ value: 100 }], { x: scales.o("First")!, width: band }),
        Second: makeColumn("Second", [{ value: 50 }], { x: scales.o("Second")!, width: band }),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildBarFunnelScene(ctx, layout)

    // First step should have __barFunnelIsFirstStep=true and no dropoff bar
    const firstStepNodes = nodes.filter(n => n.type === "rect" && n.datum.__barFunnelStep === "First")
    expect(firstStepNodes.length).toBe(1) // only retained, no dropoff
    expect(firstStepNodes[0].datum.__barFunnelIsFirstStep).toBe(true)
    expect(firstStepNodes[0].datum.__barFunnelIsDropoff).toBe(false)
    expect(firstStepNodes[0].datum.__barFunnelDropoffValue).toBe(0)
  })

  it("multi-category groups positioned side-by-side", () => {
    const steps = ["S1", "S2"]
    const scales = makeBarFunnelScales(steps, 100)
    const band = scales.o.bandwidth()

    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "bar-funnel", projection: "vertical" }),
      getStack: (d: any) => d.channel,
      columns: {
        S1: makeColumn("S1", [
          { value: 100, channel: "Web" },
          { value: 80, channel: "App" },
        ], { x: scales.o("S1")!, width: band }),
        S2: makeColumn("S2", [
          { value: 60, channel: "Web" },
          { value: 40, channel: "App" },
        ], { x: scales.o("S2")!, width: band }),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildBarFunnelScene(ctx, layout)
    const retainedBars = nodes.filter(n => n.type === "rect" && !n.datum.__barFunnelIsDropoff)

    // 2 steps x 2 categories = 4 retained bars
    expect(retainedBars.length).toBe(4)

    // Within the same step, bars for different categories should have different x positions
    const s1Retained = retainedBars.filter(n => n.datum.__barFunnelStep === "S1")
    expect(s1Retained.length).toBe(2)
    if (s1Retained[0].type === "rect" && s1Retained[1].type === "rect") {
      expect(s1Retained[0].x).not.toBeCloseTo(s1Retained[1].x, 0)
    }
  })

  it("label metadata set on each datum", () => {
    const steps = ["Top", "Bottom"]
    const scales = makeBarFunnelScales(steps, 100)
    const band = scales.o.bandwidth()

    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "bar-funnel", projection: "vertical" }),
      columns: {
        Top: makeColumn("Top", [{ value: 100 }], { x: scales.o("Top")!, width: band }),
        Bottom: makeColumn("Bottom", [{ value: 40 }], { x: scales.o("Bottom")!, width: band }),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildBarFunnelScene(ctx, layout)
    const rects = nodes.filter(n => n.type === "rect")

    for (const r of rects) {
      expect(r.datum.__barFunnelStep).toBeDefined()
      expect(typeof r.datum.__barFunnelValue).toBe("number")
      expect(typeof r.datum.__barFunnelPercent).toBe("number")
    }

    // Check specific percent values
    const topRect = rects.find(n => n.datum.__barFunnelStep === "Top" && !n.datum.__barFunnelIsDropoff)!
    expect(topRect.datum.__barFunnelPercent).toBeCloseTo(100) // 100/100

    const bottomRetained = rects.find(n => n.datum.__barFunnelStep === "Bottom" && !n.datum.__barFunnelIsDropoff)!
    expect(bottomRetained.datum.__barFunnelPercent).toBeCloseTo(40) // 40/100
  })
})

// ── swimlaneScene ──────────────────────────────────────────────────────

describe("buildSwimlaneScene", () => {
  it("each datum gets its own rect node", () => {
    const scales = makeScales({ projection: "horizontal", rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "swimlane", projection: "horizontal" }),
      getStack: (d: any) => d.sub,
      columns: {
        LaneA: makeColumn("LaneA", [
          { value: 20, sub: "task1" },
          { value: 30, sub: "task2" },
          { value: 10, sub: "task3" },
        ]),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildSwimlaneScene(ctx, layout)
    expect(nodes.length).toBe(3)
    expect(nodes.every(n => n.type === "rect")).toBe(true)
  })

  it("rects within a lane stack sequentially (offset accumulates)", () => {
    const scales = makeScales({ projection: "horizontal", rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "swimlane", projection: "horizontal" }),
      getStack: (d: any) => d.sub,
      columns: {
        Lane: makeColumn("Lane", [
          { value: 20, sub: "a" },
          { value: 30, sub: "b" },
          { value: 10, sub: "c" },
        ]),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildSwimlaneScene(ctx, layout)
    expect(nodes.length).toBe(3)

    // Horizontal: offset accumulates along x-axis
    // rScale maps [0,100] → [0,400], so 1 data unit = 4 px
    if (nodes[0].type === "rect" && nodes[1].type === "rect" && nodes[2].type === "rect") {
      // All rects should have positive width
      for (const n of nodes) expect(n.w).toBeGreaterThan(0)
      // Rects should be laid out left-to-right with no overlap
      expect(nodes[0].x).toBeLessThan(nodes[1].x)
      expect(nodes[1].x).toBeLessThan(nodes[2].x)
      // Adjacent rects should abut (second starts where first ends)
      expect(nodes[0].x + nodes[0].w).toBeCloseTo(nodes[1].x, 1)
      expect(nodes[1].x + nodes[1].w).toBeCloseTo(nodes[2].x, 1)
      // Widths should be proportional to values (20:30:10)
      expect(nodes[1].w / nodes[0].w).toBeCloseTo(30 / 20, 1)
      expect(nodes[0].w / nodes[2].w).toBeCloseTo(20 / 10, 1)
    }
  })

  it("duplicate subcategories allowed (same subcategory appears multiple times)", () => {
    const scales = makeScales({ projection: "horizontal", rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "swimlane", projection: "horizontal" }),
      getStack: (d: any) => d.sub,
      columns: {
        Lane: makeColumn("Lane", [
          { value: 15, sub: "task" },
          { value: 25, sub: "task" },
          { value: 10, sub: "task" },
        ]),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildSwimlaneScene(ctx, layout)

    // All three items should produce rects even though they share "task" subcategory
    expect(nodes.length).toBe(3)

    // They should still stack sequentially, not overlap
    if (nodes[0].type === "rect" && nodes[1].type === "rect" && nodes[2].type === "rect") {
      // First ends where second begins
      expect(nodes[0].x + nodes[0].w).toBeCloseTo(nodes[1].x, 1)
      // Second ends where third begins
      expect(nodes[1].x + nodes[1].w).toBeCloseTo(nodes[2].x, 1)
    }
  })

  it("negative values converted to absolute", () => {
    const scales = makeScales({ projection: "horizontal", rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "swimlane", projection: "horizontal" }),
      getStack: (d: any) => d.sub,
      columns: {
        Lane: makeColumn("Lane", [
          { value: -30, sub: "neg" },
          { value: 20, sub: "pos" },
        ]),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildSwimlaneScene(ctx, layout)
    expect(nodes.length).toBe(2)

    // Both rects should have positive width and abut
    if (nodes[0].type === "rect" && nodes[1].type === "rect") {
      expect(nodes[0].w).toBeGreaterThan(0)
      expect(nodes[1].w).toBeGreaterThan(0)
      // Negative value treated as abs(30), so first rect is wider than second (abs(30) > 20)
      expect(nodes[0].w).toBeGreaterThan(nodes[1].w)
      // Second starts where first ends
      expect(nodes[0].x + nodes[0].w).toBeCloseTo(nodes[1].x, 1)
    }
  })

  it("zero values skipped", () => {
    const scales = makeScales({ projection: "horizontal", rDomain: [0, 100], rRange: [0, 400] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "swimlane", projection: "horizontal" }),
      getStack: (d: any) => d.sub,
      columns: {
        Lane: makeColumn("Lane", [
          { value: 20, sub: "a" },
          { value: 0, sub: "b" },
          { value: 10, sub: "c" },
        ]),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildSwimlaneScene(ctx, layout)
    // Zero-value item is skipped
    expect(nodes.length).toBe(2)

    // Second remaining rect should start at offset=20 (zero item didn't advance offset)
    if (nodes[1].type === "rect") {
      expect(nodes[1].x).toBeCloseTo(scales.r(20))
    }
  })

  it("vertical projection affects rect dimensions (stacks bottom-to-top)", () => {
    // Vertical: rScale maps [0,100] → [300,0] (value axis is y)
    const scales = makeScales({ projection: "vertical", rDomain: [0, 100], rRange: [300, 0] })
    const ctx = makeCtx({
      scales,
      config: makeConfig({ chartType: "swimlane", projection: "vertical" }),
      getStack: (d: any) => d.sub,
      columns: {
        Lane: makeColumn("Lane", [
          { value: 40, sub: "x" },
          { value: 30, sub: "y" },
        ]),
      },
      getR: (d: any) => d.value,
    })

    const nodes = buildSwimlaneScene(ctx, layout)
    expect(nodes.length).toBe(2)

    // Vertical swimlane: rects stack bottom-to-top, both have positive dimensions
    if (nodes[0].type === "rect" && nodes[1].type === "rect") {
      expect(nodes[0].x).toBe(10) // col.x (category axis — stable)
      expect(nodes[0].w).toBe(80) // col.width (category axis — stable)
      expect(nodes[0].h).toBeGreaterThan(0)
      expect(nodes[1].h).toBeGreaterThan(0)
      // Second rect sits above first (lower y in SVG coords)
      expect(nodes[1].y).toBeLessThan(nodes[0].y)
      // Heights proportional to values (40:30)
      expect(nodes[0].h / nodes[1].h).toBeCloseTo(40 / 30, 1)
      // First rect's top edge should meet second rect's bottom edge
      expect(nodes[0].y).toBeCloseTo(nodes[1].y + nodes[1].h, 1)
    }
  })
})
