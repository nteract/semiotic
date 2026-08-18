import { scaleBand, scaleLinear } from "d3-scale"
import { buildBarScene, buildClusterBarScene } from "./barScene"
import { buildSwimlaneScene } from "./swimlaneScene"
import type { OrdinalSceneContext } from "./types"
import type { OrdinalColumn, OrdinalLayout, OrdinalPipelineConfig, OrdinalScales } from "../ordinalTypes"
import type { Style } from "../types"
import type { Datum } from "../../charts/shared/datumTypes"

const defaultStyle: Style = { fill: "#4682b4", opacity: 1 }
const layout: OrdinalLayout = { width: 400, height: 300 }

function makeScales(projection: "vertical" | "horizontal" = "vertical"): OrdinalScales {
  return {
    o: scaleBand<string>().domain(["A", "B"]).range([0, 400]).padding(0.1),
    r: scaleLinear().domain([0, 100]).range(projection === "horizontal" ? [0, 400] : [300, 0]),
    projection
  }
}

function makeColumn(name: string, pieceData: Datum[]): OrdinalColumn {
  return { name, x: 10, y: 0, width: 80, middle: 50, padding: 5, pieceData, pct: 0.5, pctStart: 0 }
}

type ContextOverrides = Omit<Partial<OrdinalSceneContext>, "config"> & {
  config?: Partial<OrdinalPipelineConfig>
}

function makeContext(overrides: ContextOverrides): OrdinalSceneContext {
  const scales = overrides.scales ?? makeScales()
  const config = {
    chartType: "bar",
    windowSize: 200,
    windowMode: "sliding",
    extentPadding: 0,
    projection: scales.projection,
    ...overrides.config
  } as OrdinalPipelineConfig
  return {
    ...overrides,
    scales,
    columns: overrides.columns ?? {},
    config,
    getR: overrides.getR ?? ((d) => d.value),
    getO: overrides.getO ?? ((d) => d.category),
    multiScales: overrides.multiScales ?? [],
    rAccessors: overrides.rAccessors ?? [(d) => d.value],
    resolvePieceStyle: overrides.resolvePieceStyle ?? (() => ({ ...defaultStyle })),
    resolveSummaryStyle: overrides.resolveSummaryStyle ?? (() => ({ ...defaultStyle })),
    getRawRange: overrides.getRawRange ?? (() => null)
  }
}

describe("adaptive ordinal bar corner radii", () => {
  it("derives the outer stacked-bar radius from rendered bar width", () => {
    const ctx = makeContext({
      config: { roundedTop: (barWidth) => barWidth < 100 ? 2 : 6 },
      getStack: (d) => d.stack,
      columns: {
        A: makeColumn("A", [
          { category: "A", value: 30, stack: "first" },
          { category: "A", value: 20, stack: "last" }
        ])
      }
    })

    const rounded = buildBarScene(ctx, layout).find(node => node.type === "rect" && node.datum?.stack === "last")
    expect(rounded?.type).toBe("rect")
    if (rounded?.type === "rect") expect(rounded.roundedTop).toBe(2)
  })

  it("derives each grouped-bar radius from its rendered width", () => {
    const ctx = makeContext({
      config: { roundedTop: (barWidth) => barWidth / 10 },
      getGroup: (d) => d.group,
      columns: {
        A: makeColumn("A", [
          { category: "A", value: 30, group: "g1" },
          { category: "A", value: 50, group: "g2" }
        ])
      }
    })

    for (const node of buildClusterBarScene(ctx, layout)) {
      if (node.type === "rect") expect(node.roundedTop).toBeCloseTo(node.w / 10)
    }
  })

  it("derives the lane and its track radius from the rendered width", () => {
    const scales = makeScales("horizontal")
    const requestedWidths: number[] = []
    const ctx = makeContext({
      scales,
      config: {
        chartType: "swimlane",
        projection: "horizontal",
        trackFill: "#d4dce8",
        roundedTop: (barWidth) => {
          requestedWidths.push(barWidth)
          return barWidth / 10
        }
      },
      getStack: (d) => d.sub,
      columns: { Lane: makeColumn("Lane", [{ value: 50, sub: "only" }]) }
    })

    const [track, node] = buildSwimlaneScene(ctx, layout)
    expect(track?.type).toBe("rect")
    if (track?.type === "rect") {
      expect(track.datum).toBeNull()
      expect(track.cornerRadii).toEqual({ tl: 8, tr: 8, br: 8, bl: 8 })
    }
    expect(node?.type).toBe("rect")
    if (node?.type === "rect") expect(node.cornerRadii).toEqual({ tl: 8, tr: 8, br: 8, bl: 8 })
    expect(requestedWidths).toEqual([80])
  })
})
