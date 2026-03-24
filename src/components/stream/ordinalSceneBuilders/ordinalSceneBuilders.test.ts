import { scaleLinear, scaleBand } from "d3-scale"
import { buildBarScene, buildClusterBarScene } from "./barScene"
import { buildPieScene } from "./pieScene"
import { buildPointScene, buildSwarmScene } from "./pointScene"
import { buildBoxplotScene, buildViolinScene, buildHistogramScene, buildRidgelineScene } from "./statisticalScene"
import { buildTimelineScene } from "./timelineScene"
import { buildConnectors } from "./connectorScene"
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
      // value=50 on [0,100]->[300,0] => y=150, bar from 300 to 150 => h=150
      expect(bar.y).toBeCloseTo(150)
      expect(bar.h).toBeCloseTo(150)
      expect(bar.x).toBe(10) // col.x
      expect(bar.w).toBe(80) // col.width
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
      // horizontal: x starts at rScale(0)=0, width = rScale(40)-rScale(0) = 160
      expect(bar.x).toBeCloseTo(0)
      expect(bar.w).toBeCloseTo(160)
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
      expect(nodes[0].y).toBeCloseTo(150) // rScale(50) on [0,100]->[300,0]
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
      expect(nodes[0].x).toBeCloseTo(100) // rScale(25) on [0,100]->[0,400]
      expect(nodes[0].y).toBe(75) // col.middle
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
      // rScale(0)=0, rScale(50)=200
      expect(nodes[0].x).toBeCloseTo(0)
      expect(nodes[0].w).toBeCloseTo(200)
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
