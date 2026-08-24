import * as React from "react"
import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StreamXYFrameProps } from "../../stream/types"
import { RealtimeHeatmap } from "./RealtimeHeatmap"
import { RealtimeHistogram, TemporalHistogram } from "./RealtimeHistogram"
import { RealtimeLineChart } from "./RealtimeLineChart"
import { RealtimeSwarmChart } from "./RealtimeSwarmChart"
import { RealtimeWaterfallChart } from "./RealtimeWaterfallChart"

const capturedFrames: StreamXYFrameProps[] = []

vi.mock("../../stream/StreamXYFrame", () => ({
  default: React.forwardRef((props: StreamXYFrameProps, _ref) => {
    capturedFrames.push(props)
    return <div data-testid="stream-xy-frame" />
  })
}))

describe("realtime styleRules", () => {
  beforeEach(() => {
    capturedFrames.length = 0
  })

  it("styles every realtime mark shape through its displayed value context", () => {
    const rows = [{ time: 10, value: 12, group: "alert" }]
    const valueRule = [{ when: { gt: 10 }, style: { fill: "#rule", stroke: "#rule" } }]

    render(
      <>
        <RealtimeLineChart data={rows} styleRules={valueRule} />
        <RealtimeHistogram data={rows} binSize={20} styleRules={valueRule} />
        <TemporalHistogram data={rows} binSize={20} styleRules={valueRule} />
        <RealtimeSwarmChart data={rows} styleRules={valueRule} />
        <RealtimeWaterfallChart data={rows} styleRules={valueRule} />
        <RealtimeHeatmap data={rows} aggregation="sum" styleRules={valueRule} />
      </>
    )

    expect(resolveLineStyle(capturedFrames[0], rows[0])).toMatchObject({
      fill: "#rule",
      stroke: "#rule"
    })
    const histogramBin = { binStart: 0, binEnd: 20, total: 12 }
    expect(capturedFrames[1].areaStyle?.(histogramBin)).toMatchObject({
      fill: "#rule",
      stroke: "#rule"
    })
    expect(capturedFrames[2].areaStyle?.(histogramBin)).toMatchObject({
      fill: "#rule",
      stroke: "#rule"
    })
    expect(capturedFrames[3].pointStyle?.(rows[0])).toMatchObject({
      fill: "#rule",
      stroke: "#rule"
    })
    expect(capturedFrames[4].areaStyle?.({
      ...rows[0],
      baseline: 0,
      cumEnd: 12,
      delta: 12
    })).toMatchObject({ fill: "#rule", stroke: "#rule" })
    expect(capturedFrames[5].areaStyle?.({
      xi: 0,
      yi: 0,
      value: 12,
      count: 2,
      sum: 24,
      xCenter: 10,
      yCenter: 12,
      agg: "sum"
    })).toMatchObject({ fill: "#rule", stroke: "#rule" })
  })

  it("exposes aggregate fields and preserves existing authored precedence", () => {
    const rows = [{ time: 10, value: 12, group: "alert" }]
    render(
      <>
        <RealtimeLineChart
          data={rows}
          stroke="#explicit"
          styleRules={[{ style: { stroke: "#rule" } }]}
        />
        <RealtimeSwarmChart
          data={rows}
          pointStyle={() => ({ fill: "#point" })}
          styleRules={[{ style: { fill: "#rule" } }]}
        />
        <RealtimeHistogram
          data={rows}
          binSize={20}
          styleRules={[{
            when: { field: "category", eq: "alert" },
            style: { fill: "#category" }
          }]}
        />
        <RealtimeHeatmap
          data={rows}
          styleRules={[{
            when: { field: "count", gte: 3 },
            style: { fill: "#dense" }
          }]}
        />
      </>
    )

    expect(resolveLineStyle(capturedFrames[0], rows[0])?.stroke).toBe("#explicit")
    expect(capturedFrames[1].pointStyle?.(rows[0]).fill).toBe("#point")
    expect(capturedFrames[2].areaStyle?.({
      binStart: 0,
      binEnd: 20,
      total: 12,
      category: "alert",
      categoryValue: 12
    }).fill).toBe("#category")
    expect(capturedFrames[3].areaStyle?.({
      xi: 0,
      yi: 0,
      value: 9,
      count: 3,
      sum: 27,
      xCenter: 10,
      yCenter: 12,
      agg: "mean"
    }).fill).toBe("#dense")
  })
})

function resolveLineStyle(frame: StreamXYFrameProps, datum: Record<string, unknown>) {
  return typeof frame.lineStyle === "function"
    ? frame.lineStyle(datum)
    : frame.lineStyle
}
