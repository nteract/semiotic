import { scaleBand, scaleLinear } from "d3-scale"
import { describe, expect, it } from "vitest"
import type { Datum } from "../../charts/shared/datumTypes"
import type {
  OrdinalColumn,
  OrdinalLayout,
  OrdinalPipelineConfig,
  OrdinalScales
} from "../ordinalTypes"
import { buildFunnelScene } from "./funnelScene"
import { buildBoxplotScene } from "./statisticalScene"
import type { OrdinalSceneContext } from "./types"

const layout: OrdinalLayout = { width: 400, height: 300 }

function column(
  name: string,
  pieceData: Datum[],
  overrides: Partial<OrdinalColumn> = {}
): OrdinalColumn {
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

function context(options: {
  scales: OrdinalScales
  columns: Record<string, OrdinalColumn>
  config: OrdinalPipelineConfig
  cursorChannel: "piece" | "summary"
}): OrdinalSceneContext {
  const cursorStyle = () => ({ fill: "#4682b4", cursor: "pointer" as const })
  return {
    scales: options.scales,
    columns: options.columns,
    config: options.config,
    getR: (datum) => Number(datum.value),
    getO: (datum) => String(datum.category ?? datum.step),
    multiScales: [],
    rAccessors: [(datum) => Number(datum.value)],
    resolvePieceStyle:
      options.cursorChannel === "piece" ? cursorStyle : () => ({}),
    resolveSummaryStyle:
      options.cursorChannel === "summary" ? cursorStyle : () => ({}),
    getRawRange: () => null
  }
}

describe("derived ordinal mark cursors", () => {
  it("preserves the summary cursor on boxplot outliers", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100].map((value) => ({
      category: "A",
      value
    }))
    const scales: OrdinalScales = {
      o: scaleBand<string>().domain(["A"]).range([0, 400]),
      r: scaleLinear().domain([0, 100]).range([300, 0]),
      projection: "vertical"
    }
    const config: OrdinalPipelineConfig = {
      chartType: "boxplot",
      windowSize: 200,
      windowMode: "sliding",
      extentPadding: 0,
      projection: "vertical",
      showOutliers: true
    }

    const outlier = buildBoxplotScene(
      context({
        scales,
        columns: { A: column("A", data) },
        config,
        cursorChannel: "summary"
      }),
      layout
    ).find((node) => node.type === "point")

    expect(outlier?.style.cursor).toBe("pointer")
  })

  it("preserves the piece cursor on funnel connectors", () => {
    const steps = ["A", "B"]
    const o = scaleBand<string>().domain(steps).range([0, 300]).padding(0.1)
    const scales: OrdinalScales = {
      o,
      r: scaleLinear().domain([0, 100]).range([0, 400]),
      projection: "horizontal"
    }
    const config: OrdinalPipelineConfig = {
      chartType: "funnel",
      windowSize: 200,
      windowMode: "sliding",
      extentPadding: 0,
      projection: "horizontal"
    }
    const band = o.bandwidth()

    const connector = buildFunnelScene(
      context({
        scales,
        columns: {
          A: column("A", [{ step: "A", value: 100 }], {
            x: o("A")!,
            width: band
          }),
          B: column("B", [{ step: "B", value: 50 }], {
            x: o("B")!,
            width: band
          })
        },
        config,
        cursorChannel: "piece"
      }),
      layout
    ).find((node) => node.type === "trapezoid")

    expect(connector?.style.cursor).toBe("pointer")
  })
})
