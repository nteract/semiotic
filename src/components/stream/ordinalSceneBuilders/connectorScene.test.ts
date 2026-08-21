import { scaleLinear, scaleBand } from "d3-scale"
import { buildConnectors } from "./connectorScene"
import type { OrdinalSceneContext } from "./types"
import type { OrdinalScales, OrdinalLayout, OrdinalPipelineConfig, WedgeSceneNode } from "../ordinalTypes"
import type { Style } from "../types"
import type { Datum } from "../../charts/shared/datumTypes"

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
    getR: overrides.getR || ((d: Datum) => d.value),
    getO: overrides.getO || ((d: Datum) => d.category),
    multiScales: overrides.multiScales || [],
    rAccessors: overrides.rAccessors || [(d: Datum) => d.value],
    resolvePieceStyle: overrides.resolvePieceStyle || (() => ({ ...defaultStyle })),
    resolveSummaryStyle: overrides.resolveSummaryStyle || (() => ({ ...defaultStyle })),
    getRawRange: overrides.getRawRange || (() => null),
    ...overrides
  }
}

const layout: OrdinalLayout = { width: 400, height: 300 }

describe("buildConnectors", () => {
  it("returns connector nodes linking pieces with same connector key", () => {
    const scales = makeScales()
    const pieceNodes = [
      { type: "point" as const, x: 10, y: 20, r: 5, style: defaultStyle, datum: { id: 1, category: "A", group: "g1" } },
      { type: "point" as const, x: 100, y: 80, r: 5, style: defaultStyle, datum: { id: 2, category: "B", group: "g1" } }
    ]
    const ctx = makeCtx({
      scales,
      getConnector: (d: Datum) => d.group,
      getO: (d: Datum) => d.category,
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
      getO: (d: Datum) => d.category
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
      getConnector: (d: Datum) => d.group,
      getO: (d: Datum) => d.category
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
      getConnector: (d: Datum) => d.group,
      getO: (d: Datum) => d.category
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors).toHaveLength(1)
    expect(connectors[0].x1).toBe(10)
  })

  it("uses connectorStyle function when provided", () => {
    const scales = makeScales()
    const pieceNodes = [
      { type: "point" as const, x: 10, y: 20, r: 5, style: defaultStyle, datum: { category: "A", group: "g1", color: "red" } },
      { type: "point" as const, x: 100, y: 80, r: 5, style: defaultStyle, datum: { category: "B", group: "g1", color: "blue" } }
    ]
    const ctx = makeCtx({
      scales,
      getConnector: (d: Datum) => d.group,
      getO: (d: Datum) => d.category,
      config: makeConfig({
        connectorStyle: (d: Datum) => ({ stroke: d.color, strokeWidth: 3 })
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
      getConnector: (d: Datum) => d.group,
      getO: (d: Datum) => d.category,
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
      getConnector: (d: Datum) => d.group,
      getO: (d: Datum) => d.category
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors).toHaveLength(2)
    expect(connectors[0].group).toBe("chain")
    expect(connectors[1].group).toBe("chain")
  })

  it("closes the last-to-first segment for radial series of 3+ points", () => {
    const scales = makeScales({ projection: "radial", oDomain: ["A", "B", "C"] })
    const pieceNodes = [
      { type: "point" as const, x: 10, y: 20, r: 5, style: defaultStyle, datum: { category: "A", group: "radar" } },
      { type: "point" as const, x: 50, y: 50, r: 5, style: defaultStyle, datum: { category: "B", group: "radar" } },
      { type: "point" as const, x: 90, y: 80, r: 5, style: defaultStyle, datum: { category: "C", group: "radar" } }
    ]
    const ctx = makeCtx({
      scales,
      getConnector: (d: Datum) => d.group,
      getO: (d: Datum) => d.category
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors).toHaveLength(3)
    expect(connectors[2].x1).toBe(90)
    expect(connectors[2].y1).toBe(80)
    expect(connectors[2].x2).toBe(10)
    expect(connectors[2].y2).toBe(20)
  })

  it("ignores node types other than point and rect", () => {
    const scales = makeScales()
    const pieceNodes: WedgeSceneNode[] = [
      { type: "wedge" as const, cx: 0, cy: 0, innerRadius: 0, outerRadius: 50, startAngle: 0, endAngle: Math.PI, style: defaultStyle, datum: { category: "A", group: "g1" } },
    ]
    const ctx = makeCtx({
      scales,
      getConnector: (d: Datum) => d.group,
      getO: (d: Datum) => d.category
    })
    const connectors = buildConnectors(ctx, pieceNodes, layout)
    expect(connectors).toHaveLength(0)
  })
})
